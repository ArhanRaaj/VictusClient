import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import dns from 'dns';
import os from 'os';
import { spawn, ChildProcess, execFile } from 'child_process';
import AdmZip from 'adm-zip';
import { VersionManager } from './VersionManager';
import { JavaManager, JavaInfo } from './JavaManager';
import { PERFORMANCE_PROFILE, applyOptionsProfile } from './GameOptionsProfile';
import {
  NativeArchiveSpec,
  assetsAlreadyVerified,
  cdsArchivePath,
  clearNativesDir,
  ensureDir,
  invalidateAssetStamp,
  listNativeFiles,
  nativesDirIsValid,
  nativesSignature,
  readAnyCache,
  readFreshCache,
  sampleAssetsPresent,
  writeAssetStamp,
  writeCache,
  writeNativesManifest,
  LOADER_PROFILE_TTL_MS,
} from './LaunchCache';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export interface LaunchCallbacks {
  onProgress: (data: { instanceId: string; status: string; percent: number; message: string }) => void;
  onLog: (data: { id: string; timestamp: string; level: 'info' | 'warn' | 'error' | 'launcher'; message: string }) => void;
  onExit: (data: { instanceId: string; code: number }) => void;
}

type LogLevel = 'info' | 'warn' | 'error' | 'launcher';

/** Thrown internally when the user cancels a launch that is still being prepared. */
class LaunchCancelledError extends Error {
  constructor() {
    super('Launch cancelled by user');
    this.name = 'LaunchCancelledError';
  }
}

/** Maps Node's platform names onto the names Mojang uses in version metadata rules. */
const MOJANG_OS_NAMES: Record<string, string> = {
  win32: 'windows',
  darwin: 'osx',
  linux: 'linux',
};

/**
 * Batches log lines so a chatty child process (or a crash stacktrace) cannot flood
 * IPC and force the renderer into a re-render storm.
 */
interface LogSink {
  push: (level: LogLevel, message: string) => void;
  flush: () => void;
}

export class MinecraftLauncher {
  private dataDir: string;
  private versionsDir: string;
  private librariesDir: string;
  private assetsDir: string;
  private versionManager: VersionManager;
  private javaManager: JavaManager;
  private activeProcesses = new Map<string, ChildProcess>();
  /** Instances whose launch was cancelled (either mid-preparation or after spawn). */
  private cancelled = new Set<string>();
  /** Instances currently being prepared, used to reject double launches. */
  private preparing = new Set<string>();
  /** Architecture of the JVM selected for the current launch; decides which natives are used. */
  private jvmArch: 'x64' | 'x86' | 'arm64' = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? 'x86' : 'x64';

  constructor(dataDir: string, versionManager: VersionManager, javaManager: JavaManager) {
    this.dataDir = dataDir;
    this.versionsDir = path.join(dataDir, 'versions');
    this.librariesDir = path.join(dataDir, 'libraries');
    this.assetsDir = path.join(dataDir, 'assets');
    this.versionManager = versionManager;
    this.javaManager = javaManager;

    this.ensureDirs();
  }

  private ensureDirs() {
    [this.versionsDir, this.librariesDir, this.assetsDir].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
  }

  private createLogSink(callbacks: LaunchCallbacks): LogSink {
    let queue: Parameters<LaunchCallbacks['onLog']>[0][] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (queue.length === 0) return;
      const batch = queue;
      queue = [];
      for (const entry of batch) callbacks.onLog(entry);
    };

    return {
      push(level: LogLevel, message: string) {
        queue.push({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toLocaleTimeString(),
          level,
          message: typeof message === 'string' ? message.slice(0, 8000) : String(message).slice(0, 8000),
        });
        if (queue.length >= 100) {
          flush();
          return;
        }
        if (!timer) timer = setTimeout(flush, 60);
      },
      flush,
    };
  }

  private mavenToPath(name: string): string {
    const parts = name.split(':');
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    const classifier = parts[3] ? '-' + parts[3] : '';
    return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`;
  }

  private normalizeUuid(uuidStr?: string, username = 'VictusPlayer'): string {
    if (uuidStr) {
      const clean = uuidStr.replace(/-/g, '').trim().toLowerCase();
      if (/^[0-9a-f]{32}$/.test(clean)) {
        return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
      }
      return uuidStr;
    }
    // Compute standard offline Minecraft UUID (version 3 MD5)
    const hash = crypto.createHash('md5').update('OfflinePlayer:' + username).digest();
    hash[6] = (hash[6] & 0x0f) | 0x30;
    hash[8] = (hash[8] & 0x3f) | 0x80;
    const hex = hash.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  private assertActive(id: string) {
    if (this.cancelled.has(id)) throw new LaunchCancelledError();
  }

  private getMojangOsName(): string {
    return MOJANG_OS_NAMES[process.platform] || 'linux';
  }

  /** True when *this machine's* OS architecture is 64-bit (used for metadata rules). */
  private is64Bit(): boolean {
    return process.arch === 'x64' || process.arch === 'arm64';
  }

  /** True when the JVM about to be launched is 64-bit. Native archives must match the JVM, not the OS. */
  private jvmIs64Bit(): boolean {
    return this.jvmArch !== 'x86';
  }

  /** Native classifier architecture suffix for the selected JVM: '', '-x86', '-arm64', '-arm32'. */
  private jvmArchToken(): string {
    if (this.jvmArch === 'x86') return '-x86';
    if (this.jvmArch === 'arm64') return '-arm64';
    return '';
  }

  private nativeOsTokens(): string[] {
    return process.platform === 'darwin' ? ['macos', 'osx'] : [this.getMojangOsName()];
  }

  /**
   * Scores a native classifier against the selected JVM, or returns null when the archive
   * targets another operating system or architecture.
   *
   * Minecraft metadata encodes the native architecture in the classifier name
   * (`natives-windows`, `natives-windows-x86`, `natives-windows-arm64`) instead of using
   * `os.arch` rules, so this is the only place the architecture can be enforced. Shipping
   * more than one of these for a library makes every arch overwrite the same `.dll`/`.so`.
   */
  private nativeClassifierScore(classifier: string): number | null {
    if (!classifier) return null;
    const archToken = this.jvmArchToken();
    for (const os of this.nativeOsTokens()) {
      if (classifier === `natives-${os}${archToken}`) return 0;
      // Mojang ships a patched Intel-macOS freetype build as `natives-macos-patch`.
      if (archToken === '' && os === 'macos' && classifier === 'natives-macos-patch') return 1;
      // Legacy numeric arch suffixes: natives-windows-64 / natives-windows-32
      if (classifier === `natives-${os}-${this.jvmIs64Bit() ? '64' : '32'}`) return 0;
    }
    return null;
  }

  /** The classifier naming this library's native archive, or null when it has none. */
  private nativeClassifierName(lib: any): string | null {
    const natives = lib?.natives;
    if (natives && typeof natives === 'object') {
      const osName = this.getMojangOsName();
      const raw = natives[osName] ?? (osName === 'osx' ? natives.macos : undefined);
      if (typeof raw === 'string') {
        return raw.replace(/\$\{arch\}/g, this.jvmIs64Bit() ? '64' : '32');
      }
    }
    const name = String(lib?.name || '');
    const idx = name.lastIndexOf(':natives-');
    if (idx >= 0) return name.slice(idx + 1);
    return null;
  }

  /** True when the library entry exists *only* as a native archive (1.19+ manifests). */
  private isNativeOnlyEntry(lib: any): boolean {
    return String(lib?.name || '').includes(':natives-');
  }

  /** Resolves the single platform/arch-correct natives archive for a library, if it has one. */
  private selectNativeArtifact(lib: any): { url: string; filePath: string } | null {
    const classifier = this.nativeClassifierName(lib);
    if (!classifier) return null;
    if (this.nativeClassifierScore(classifier) === null) return null;

    const legacy = lib?.downloads?.classifiers?.[classifier];
    if (legacy?.url) {
      return {
        url: legacy.url,
        filePath: path.join(this.librariesDir, legacy.path || `${lib.name.replace(/:/g, '/')}-${classifier}.jar`),
      };
    }

    const artifact = this.isNativeOnlyEntry(lib) ? lib?.downloads?.artifact : null;
    if (artifact?.url) {
      return {
        url: artifact.url,
        filePath: path.join(this.librariesDir, artifact.path || this.mavenToPath(String(lib.name))),
      };
    }

    return null;
  }

  private isNativeFile(entryName: string): boolean {
    if (process.platform === 'win32') return entryName.endsWith('.dll');
    if (process.platform === 'darwin') return entryName.endsWith('.dylib') || entryName.endsWith('.jnilib');
    return entryName.endsWith('.so') || /\.so\.\d+$/.test(entryName);
  }

  private extractNatives(archivePath: string, nativesDir: string, excludes: string[] = []): string[] {
    const zip = new AdmZip(archivePath);
    const exclusions = (excludes || []).map((e) => e.replace(/\\/g, '/'));
    const written: string[] = [];
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.replace(/\\/g, '/');
      if (name.startsWith('META-INF/')) continue;
      if (!this.isNativeFile(name)) continue;
      if (exclusions.some((ex) => ex && name.startsWith(ex))) continue;
      const base = path.basename(name);
      try {
        fs.writeFileSync(path.join(nativesDir, base), entry.getData());
        if (!written.includes(base)) written.push(base);
      } catch {}
    }
    return written;
  }

  /**
   * Loader profiles are immutable for a given loader/version pair, so they are cached on disk.
   * This removes a network round trip from every launch after the first one.
   */
  private async resolveLoaderProfile(metaUrl: string, cacheKey: string): Promise<any | null> {
    const cacheFile = path.join(this.dataDir, 'cache', 'loader-profiles', `${cacheKey.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);

    const fresh = readFreshCache<any>(cacheFile, LOADER_PROFILE_TTL_MS);
    if (fresh) return fresh;

    try {
      const res = await fetch(metaUrl);
      if (res.ok) {
        const data = (await res.json()) as any;
        writeCache(cacheFile, data);
        return data;
      }
    } catch {}

    // Offline or rate-limited: an older profile still launches the game correctly.
    return readAnyCache<any>(cacheFile);
  }

  /**
   * Makes `nativesDir` hold exactly the native libraries for the current architecture.
   * The directory is only rebuilt when the selected archives, their timestamps or the JVM
   * architecture changed, which keeps repeat launches off the disk.
   */
  private applyNatives(
    nativesDir: string,
    archives: NativeArchiveSpec[],
    log?: LogSink
  ): { reused: boolean; count: number } {
    const signature = nativesSignature(this.jvmArch, archives);

    if (archives.length > 0 && nativesDirIsValid(nativesDir, signature)) {
      return { reused: true, count: listNativeFiles(nativesDir).length };
    }

    clearNativesDir(nativesDir);

    // A running instance keeps its native libraries loaded, so Windows may refuse to delete them.
    // Say so instead of silently launching against a mixture of two versions.
    const leftovers = listNativeFiles(nativesDir);
    if (leftovers.length > 0 && log) {
      log.push(
        'warn',
        `${leftovers.length} native libraries are still in use by another running instance and could not be replaced. Close all running instances before launching again.`
      );
    }

    const written: string[] = [];
    for (const archive of archives) {
      written.push(...this.extractNatives(archive.filePath, nativesDir, archive.excludes || []));
    }
    const files = writeNativesManifest(nativesDir, signature, written);
    return { reused: false, count: files.length };
  }

  /**
   * Starts the JVM once, outside of the game process, so a CDS archive exists before the first
   * real launch. Without this the JVM prints "Specified shared archive file not found" into the
   * game console, which looks like a failure even though it recovers on its own.
   */
  /** One CDS archive per runtime identity; shared by every instance using that runtime. */
  private cdsArchiveFor(javaMajor: number): string {
    return cdsArchivePath(this.dataDir, `${process.platform}-${this.jvmArch}-j${javaMajor}`);
  }

  private primeCdsArchive(javaPath: string, archiveFile: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        ensureDir(path.dirname(archiveFile));
        execFile(
          javaPath,
          ['-XX:+AutoCreateSharedArchive', `-XX:SharedArchiveFile=${archiveFile}`, '-version'],
          { timeout: 60000, windowsHide: true },
          () => resolve()
        );
      } catch {
        resolve();
      }
    });
  }

  /**
   * Applies the opt-in performance preset to the instance's `options.txt`. Only runs when the
   * user has switched it on for this instance, and only rewrites the keys the preset owns.
   */
  private applyPerformanceProfile(gameDir: string, log: LogSink): void {
    try {
      const file = path.join(gameDir, 'options.txt');
      const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
      const result = applyOptionsProfile(existing, PERFORMANCE_PROFILE);

      if (result.changed.length === 0 && result.added.length === 0) {
        log.push('launcher', 'Performance preset: graphics settings already applied');
        return;
      }

      fs.writeFileSync(file, result.text, 'utf-8');
      const summary = [...result.changed, ...result.added].join(', ');
      log.push('launcher', `Performance preset applied (${result.changed.length + result.added.length}): ${summary}`);
    } catch (e: any) {
      log.push('warn', `Performance preset could not be applied: ${e.message}`);
    }
  }

  private async downloadAssets(assetIndex: any, id: string, callbacks: LaunchCallbacks, log: LogSink): Promise<void> {
    if (!assetIndex || !assetIndex.url) return;
    const indexFile = path.join(this.assetsDir, 'indexes', `${assetIndex.id}.json`);
    if (!fs.existsSync(indexFile)) {
      callbacks.onProgress({ instanceId: id, status: 'downloading', percent: 55, message: 'Downloading asset index...' });
      await this.downloadFile(assetIndex.url, indexFile, 5, () => this.cancelled.has(id));
    }

    this.assertActive(id);

    try {
      const idx = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      const objects = idx.objects || {};
      const allEntries = Object.entries(objects) as [string, any][];

      // 1. Primary assets: UI, fonts, textures, language, AND all in-game sound effects (footsteps, blocks, mobs, rain, attacks)
      const primaryEntries = allEntries.filter(
        ([k]) => !k.startsWith('minecraft/records/') && !k.startsWith('minecraft/sounds/music/')
      );

      // 2. Secondary assets: background music discs and ambient music
      const secondaryEntries = allEntries.filter(
        ([k]) => k.startsWith('minecraft/records/') || k.startsWith('minecraft/sounds/music/')
      );

      // Background music and records are optional at start-up: keep them downloading while the
      // game window opens instead of gating the launch on them.
      const startSecondarySweep = () => {
        (async () => {
          let secIndex = 0;
          const secWorker = async () => {
            while (secIndex < secondaryEntries.length) {
              if (this.cancelled.has(id)) return;
              const item = secondaryEntries[secIndex++];
              if (!item) break;
              const [k, obj] = item as [string, any];
              const hash = obj?.hash;
              if (!hash) continue;
              const sub = hash.slice(0, 2);
              const dest = path.join(this.assetsDir, 'objects', sub, hash);
              if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;

              try {
                const url = `https://resources.download.minecraft.net/${sub}/${hash}`;
                await this.downloadFile(url, dest, 3, () => this.cancelled.has(id));
              } catch {}
            }
          };
          await Promise.all(Array.from({ length: 8 }, () => secWorker()));
        })().catch(() => {});
      };

      // A full verification walks every object in the index. Once that has succeeded the result is
      // stamped, so later launches only need a cheap spot check instead of thousands of stats.
      if (assetsAlreadyVerified(this.assetsDir, assetIndex.id, allEntries.length)) {
        if (sampleAssetsPresent(this.assetsDir, allEntries)) {
          callbacks.onProgress({
            instanceId: id,
            status: 'downloading',
            percent: 65,
            message: 'Game assets already verified - fast start',
          });
          log.push('launcher', `Asset verification reused for ${assetIndex.id} (${allEntries.length} objects)`);
          startSecondarySweep();
          return;
        }
        invalidateAssetStamp(this.assetsDir, assetIndex.id);
        log.push('warn', 'Asset spot-check failed; re-verifying the full asset set');
      }

      callbacks.onProgress({
        instanceId: id,
        status: 'downloading',
        percent: 65,
        message: `Verifying ${primaryEntries.length} game assets & in-game audio...`,
      });

      // Concurrent downloader with a pool of 20 workers for maximum throughput
      const concurrency = 20;
      let currentIndex = 0;
      let assetFailures = 0;
      const worker = async (entryList: [string, any][]) => {
        while (currentIndex < entryList.length) {
          if (this.cancelled.has(id)) return;
          const item = entryList[currentIndex++];
          if (!item) break;
          const [k, obj] = item;
          const hash = obj.hash;
          const sub = hash.slice(0, 2);
          const dest = path.join(this.assetsDir, 'objects', sub, hash);
          if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;

          try {
            const url = `https://resources.download.minecraft.net/${sub}/${hash}`;
            await this.downloadFile(url, dest, 3, () => this.cancelled.has(id));
          } catch {
            assetFailures++;
          }
        }
      };

      currentIndex = 0;
      await Promise.all(Array.from({ length: concurrency }, () => worker(primaryEntries)));
      this.assertActive(id);

      // Only trust the stamp when every object resolved; a partial run must be retried next time.
      if (assetFailures === 0 && sampleAssetsPresent(this.assetsDir, allEntries)) {
        writeAssetStamp(this.assetsDir, assetIndex.id, allEntries.length);
        log.push('launcher', `Asset verification complete for ${assetIndex.id} (${allEntries.length} objects)`);
      }

      // Background music & records continue downloading while the game starts.
      startSecondarySweep();
    } catch (e: any) {
      if (e instanceof LaunchCancelledError) throw e;
      log.push('warn', `Asset verification note: ${e.message}`);
    }
  }

  public async launch(instance: any, account: any, callbacks: LaunchCallbacks): Promise<{ success: boolean; error?: string }> {
    const id = instance.id;

    if (this.activeProcesses.has(id) || this.preparing.has(id)) {
      return { success: false, error: `"${instance.name}" is already running.` };
    }

    this.preparing.add(id);
    this.cancelled.delete(id);

    const log = this.createLogSink(callbacks);

    try {
      callbacks.onProgress({ instanceId: id, status: 'preparing', percent: 5, message: 'Resolving Minecraft metadata...' });
      log.push('launcher', `[VictusClient] Preparing launch for "${instance.name}" (${instance.version} - ${instance.loader})`);

      const realVersion = this.versionManager.resolveRealGameVersion(instance.version);

      // 1. Resolve Version JSON
      const versionJson = await this.versionManager.getVersionJson(realVersion);
      this.assertActive(id);

      // 2. Resolve game directory
      const gameDir = instance.gameDir || path.join(this.dataDir, 'instances', id);
      if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });

      // 3. Resolve Client Jar
      const clientDownload = versionJson.downloads?.client;
      const versionJarPath = path.join(this.versionsDir, realVersion, `${realVersion}.jar`);
      if (clientDownload && (!fs.existsSync(versionJarPath) || fs.statSync(versionJarPath).size === 0)) {
        callbacks.onProgress({ instanceId: id, status: 'downloading', percent: 15, message: `Downloading Minecraft client.jar (${realVersion})...` });
        await this.downloadFile(clientDownload.url, versionJarPath, 5, () => this.cancelled.has(id));
      }
      this.assertActive(id);

      // 4. Resolve the Java runtime up front: the JVM architecture decides which natives load.
      const requiredJava = Number(versionJson.javaVersion?.majorVersion) || 21;
      const javaRuntime = await this.resolveJavaRuntime(requiredJava, instance, id, callbacks, log);
      this.assertActive(id);

      const javaPath = javaRuntime.path;
      const javaMajor = javaRuntime.majorVersion;
      this.jvmArch = javaRuntime.arch === 'x86' ? 'x86' : javaRuntime.arch === 'arm64' ? 'arm64' : 'x64';
      log.push('launcher', `Using Java ${javaMajor} (${this.jvmArch}) at ${javaPath}`);

      // Create the class-sharing archive once, outside the game process. The JVM logs an error
      // when the archive is missing, and that noise would otherwise land in the console.
      if (javaMajor >= 19) {
        const cdsFile = this.cdsArchiveFor(javaMajor);
        if (!fs.existsSync(cdsFile)) {
          await this.primeCdsArchive(javaPath, cdsFile);
          this.assertActive(id);
        }
      }

      // 5. Resolve Libraries & Natives
      callbacks.onProgress({ instanceId: id, status: 'downloading', percent: 30, message: 'Verifying libraries...' });
      const classpathFiles: string[] = [];
      const nativesDir = path.join(gameDir, 'natives');
      // Natives are extracted after the library loop and only when the set of archives changed;
      // rebuilding them on every launch was pure repeated disk work.
      const nativeArchives: NativeArchiveSpec[] = [];

      const loader = String(instance.loader || 'vanilla').toLowerCase();
      const isFabric = loader === 'fabric';
      const isQuilt = loader === 'quilt';
      const isFabricLike = isFabric || isQuilt;

      let mainClass = versionJson.mainClass || 'net.minecraft.client.main.Main';
      const loaderJvmArgs: string[] = [];

      if (isFabricLike) {
        callbacks.onProgress({ instanceId: id, status: 'downloading', percent: 35, message: `Resolving ${loader.toUpperCase()} loader libraries...` });
        try {
          let rawVersion = instance.loaderVersion || (isFabric ? '0.19.5' : '0.27.1');
          if (isFabric && (rawVersion.includes('0.16.9') || rawVersion.startsWith('0.16'))) {
            rawVersion = '0.19.5';
          }
          const cleanLoaderVer = rawVersion.match(/[0-9.]+/)?.[0] || (isFabric ? '0.19.5' : '0.27.1');

          // Try with realVersion first (e.g. 1.21.4 for 26.3), then fallback to instance.version
          let profile: any = null;
          const versionsToTry = [realVersion];
          if (instance.version !== realVersion) versionsToTry.push(instance.version);

          for (const vToTry of versionsToTry) {
            const metaUrl = isFabric
              ? `https://meta.fabricmc.net/v2/versions/loader/${vToTry}/${cleanLoaderVer}/profile/json`
              : `https://meta.quiltmc.org/v3/versions/loader/${vToTry}/${cleanLoaderVer}/profile/json`;

            profile = await this.resolveLoaderProfile(
              metaUrl,
              `${isFabric ? 'fabric' : 'quilt'}-${vToTry}-${cleanLoaderVer}`
            );
            if (profile) break;
          }

          if (profile) {
            if (profile.mainClass) mainClass = profile.mainClass;

            // Static JVM arguments the loader profile asks for (e.g. -DFabricMcEmu=...).
            for (const arg of profile.arguments?.jvm || []) {
              if (typeof arg === 'string') loaderJvmArgs.push(arg);
            }

            const loaderLibs = profile.libraries || [];
            for (const lib of loaderLibs) {
              this.assertActive(id);
              const relPath = this.mavenToPath(lib.name);
              const dest = path.join(this.librariesDir, relPath);
              if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
                const base = lib.url || (isFabric ? 'https://maven.fabricmc.net/' : 'https://maven.quiltmc.org/repository/release/');
                try {
                  await this.downloadFile(base + relPath, dest, 5, () => this.cancelled.has(id));
                } catch (e: any) {
                  if (e instanceof LaunchCancelledError) throw e;
                  log.push('warn', `Notice resolving loader lib ${lib.name}: ${e.message}`);
                }
              }
              if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
                classpathFiles.push(dest);
              }
            }
          }
        } catch (loaderErr: any) {
          if (loaderErr instanceof LaunchCancelledError) throw loaderErr;
          log.push('warn', `Warning resolving loader: ${loaderErr.message}`);
        }
      }

      // Vanilla Libraries
      const libraries = versionJson.libraries || [];
      for (const lib of libraries) {
        this.assertActive(id);
        if (!this.checkRules(lib.rules)) continue;
        if (!this.shouldIncludeLibrary(lib, isFabricLike)) continue;

        // Platform natives: exactly ONE arch-correct archive per library. Archives for other
        // architectures (natives-windows-arm64 / -x86) are skipped entirely, otherwise they
        // would overwrite the correct `.dll`/`.so` in the shared natives directory.
        if (this.nativeClassifierName(lib)) {
          const nativeTarget = this.selectNativeArtifact(lib);
          if (nativeTarget) {
            if (!fs.existsSync(nativeTarget.filePath) || fs.statSync(nativeTarget.filePath).size === 0) {
              try {
                await this.downloadFile(nativeTarget.url, nativeTarget.filePath, 5, () => this.cancelled.has(id));
              } catch (dlErr: any) {
                if (dlErr instanceof LaunchCancelledError) throw dlErr;
                log.push('warn', `Notice downloading native ${lib.name}: ${dlErr.message}`);
              }
            }
            if (fs.existsSync(nativeTarget.filePath) && fs.statSync(nativeTarget.filePath).size > 0) {
              nativeArchives.push({ filePath: nativeTarget.filePath, excludes: lib.extract?.exclude || [] });
              classpathFiles.push(nativeTarget.filePath);
            }
          }
          // A 1.19+ natives entry carries no plain java jar, so there is nothing else to add.
          if (this.isNativeOnlyEntry(lib)) continue;
        }

        // Artifact jar
        if (lib.downloads?.artifact) {
          const artifact = lib.downloads.artifact;
          const libPath = path.join(this.librariesDir, artifact.path || this.mavenToPath(lib.name));
          if (!fs.existsSync(libPath) || fs.statSync(libPath).size === 0) {
            try {
              await this.downloadFile(artifact.url, libPath, 5, () => this.cancelled.has(id));
            } catch (dlErr: any) {
              if (dlErr instanceof LaunchCancelledError) throw dlErr;
              log.push('warn', `Notice downloading library ${lib.name}: ${dlErr.message}`);
            }
          }
          if (fs.existsSync(libPath) && fs.statSync(libPath).size > 0) {
            classpathFiles.push(libPath);
          }
        }
      }

      // Add main client jar to classpath
      if (fs.existsSync(versionJarPath)) {
        classpathFiles.push(versionJarPath);
      }

      // Extract natives once, then reuse the directory for as long as the native archive set,
      // its timestamps and the target architecture all stay identical.
      const natives = this.applyNatives(nativesDir, nativeArchives, log);
      log.push(
        'launcher',
        natives.reused
          ? `Reusing ${natives.count} native libraries (no changes detected)`
          : `Extracted ${natives.count} native libraries for ${this.jvmArch}`
      );

      // 6. Resolve Asset Index and Core Objects
      await this.downloadAssets(versionJson.assetIndex, id, callbacks, log);
      this.assertActive(id);

      // 7. Build Classpath string (platform-correct separator)
      const classpath = classpathFiles.join(path.delimiter);

      const ramMax = instance.ramMax || 4096;
      const ramMin = instance.ramMin || 1024;

      // Default high-performance FPS tuning arguments (G1GC low-pause GC & heap compaction)
      const performanceJvmFlags = [
        '-XX:+UseG1GC',
        '-XX:G1NewSizePercent=20',
        '-XX:G1ReservePercent=20',
        '-XX:MaxGCPauseMillis=50',
        '-XX:G1HeapRegionSize=32M',
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:+DisableExplicitGC',
        '-XX:+ParallelRefProcEnabled',
        '-XX:+PerfDisableSharedMem',
        '-Dsun.rmi.dgc.server.gcInterval=2147483646',
      ];

      // -XX:+AlwaysPreTouch commits and zeroes the entire heap before the game window appears.
      // That trade is worth it on a small heap but becomes a multi-second startup penalty on
      // larger ones, so it is only applied where it is close to free.
      if (ramMax <= 8192) {
        performanceJvmFlags.push('-XX:+AlwaysPreTouch');
      }

      const jvmArgs = [
        `-Xms${ramMin}M`,
        `-Xmx${ramMax}M`,
        `-Djava.library.path=${nativesDir}`,
        `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesDir}`,
        `-Djna.tmpdir=${nativesDir}`,
        `-Dio.netty.native.workdir=${nativesDir}`,
        `-Dminecraft.launcher.brand=VictusClient`,
        `-Dminecraft.launcher.version=1.1.0`,
      ];

      // Class data sharing trims JVM start-up class loading. Java 19+ can create and refresh the
      // archive by itself, so there is no build step and no per-instance bookkeeping. The archive
      // is primed in resolveJavaRuntime so the very first game launch finds it already present.
      if (javaMajor >= 19) {
        const cdsFile = this.cdsArchiveFor(javaMajor);
        ensureDir(path.dirname(cdsFile));
        jvmArgs.push('-XX:+AutoCreateSharedArchive', `-XX:SharedArchiveFile=${cdsFile}`);
      }

      // `--enable-native-access` only exists on Java 17+; passing it to older runtimes
      // makes the JVM refuse to start entirely.
      if (javaMajor >= 17) {
        jvmArgs.push('--enable-native-access=ALL-UNNAMED');
      }

      jvmArgs.push(...loaderJvmArgs);

      if (instance.jvmArgs && instance.jvmArgs.trim().length > 0) {
        jvmArgs.push(...instance.jvmArgs.split(' ').filter(Boolean));
      } else {
        jvmArgs.push(...performanceJvmFlags);
      }

      jvmArgs.push('-cp', classpath);

      // 9. Game Arguments
      const username = account?.username || 'VictusPlayer';
      const uuid = this.normalizeUuid(account?.uuid, username);
      const token = account?.accessToken || 'victus_token';
      const isMsa = account?.type === 'microsoft';

      const gameArgs = [
        '--username', username,
        '--version', realVersion,
        '--gameDir', gameDir,
        '--assetsDir', this.assetsDir,
        '--assetIndex', versionJson.assetIndex?.id || realVersion,
        '--uuid', uuid,
        '--accessToken', token,
        '--userType', isMsa ? 'msa' : 'mojang',
        '--versionType', 'VictusClient',
      ];

      if (isMsa) {
        gameArgs.push('--userProperties', '{}');
      }

      if (instance.resolution) {
        gameArgs.push('--width', String(instance.resolution.width || 1280));
        gameArgs.push('--height', String(instance.resolution.height || 720));
      }

      this.assertActive(id);

      // 10. Launch Process with error trapping
      // On Windows, prefer javaw.exe for standalone execution without console dependency
      let binaryToExecute = javaPath;
      if (process.platform === 'win32' && javaPath.toLowerCase().endsWith('java.exe')) {
        const javawCandidate = javaPath.slice(0, -8) + 'javaw.exe';
        if (fs.existsSync(javawCandidate)) {
          binaryToExecute = javawCandidate;
        }
      }

      // Written last, immediately before the JVM starts, so nothing can overwrite it in between.
      if (instance.performancePreset) {
        this.applyPerformanceProfile(gameDir, log);
      }

      callbacks.onProgress({ instanceId: id, status: 'launching', percent: 95, message: 'Starting Java process...' });
      log.push('launcher', `Executing: "${binaryToExecute}" ${jvmArgs.join(' ')} ${mainClass} ${gameArgs.join(' ')}`);
      log.flush();

      const proc = spawn(binaryToExecute, [...jvmArgs, mainClass, ...gameArgs], {
        cwd: gameDir,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...this.gpuSelectionEnv() },
      });

      this.activeProcesses.set(id, proc);
      // The launcher must not be kept alive by the game process.
      proc.unref();

      let started = false;
      const markStarted = () => {
        if (started) return;
        started = true;
        callbacks.onProgress({ instanceId: id, status: 'running', percent: 100, message: 'Minecraft is running' });
      };

      let exited = false;
      const emitExit = (code: number) => {
        if (exited) return;
        exited = true;
        if (this.activeProcesses.get(id) === proc) this.activeProcesses.delete(id);
        this.cancelled.delete(id);
        log.flush();
        callbacks.onExit({ instanceId: id, code });
      };

      if (typeof (proc as any).once === 'function') {
        proc.once('spawn', markStarted);
      }

      proc.on('error', (procErr: Error) => {
        callbacks.onProgress({ instanceId: id, status: 'error', percent: 0, message: procErr.message });
        log.push('error', `Failed to start Minecraft: ${procErr.message}`);
        emitExit(-1);
      });

      const attachStream = (stream: NodeJS.ReadableStream | null, defaultLevel: LogLevel) => {
        if (!stream) return;
        stream.setEncoding('utf-8');
        let buffer = '';
        stream.on('data', (chunk: string) => {
          markStarted();
          buffer += chunk;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            log.push(this.classifyLine(line, defaultLevel), line);
          }
        });
        stream.on('end', () => {
          if (buffer.trim()) log.push(this.classifyLine(buffer, defaultLevel), buffer);
          buffer = '';
        });
        stream.on('error', () => {});
      };

      attachStream(proc.stdout, 'info');
      attachStream(proc.stderr, 'warn');

      proc.on('close', (code, signal) => {
        const exitCode = code ?? (signal ? -2 : 0);
        const userStopped = this.cancelled.has(id);
        log.push('launcher', `Game process exited with code ${exitCode}${signal ? ` (signal ${signal})` : ''}`);
        if (!userStopped && exitCode !== 0 && exitCode !== -2) {
          const reason = this.describeExitCode(exitCode);
          log.push('error', `Minecraft exited unexpectedly (code ${exitCode})${reason ? `: ${reason}` : ' — check the log above for the cause'}.`);
        }
        emitExit(exitCode);
      });

      return { success: true };
    } catch (err: any) {
      if (err instanceof LaunchCancelledError) {
        callbacks.onProgress({ instanceId: id, status: 'stopped', percent: 0, message: 'Launch cancelled' });
        log.push('warn', 'Launch cancelled by user.');
        log.flush();
        return { success: false, error: 'Launch cancelled' };
      }

      callbacks.onProgress({ instanceId: id, status: 'error', percent: 0, message: err.message || 'Launch error' });
      log.push('error', `Launch error: ${err?.message || err}`);
      log.flush();
      return { success: false, error: err?.message || 'Launch error' };
    } finally {
      this.preparing.delete(id);
    }
  }

  /**
   * Forces the dedicated GPU on dual-GPU machines. The variables are platform specific:
   * the GLX/PRIME offload variables are meaningless on Windows and vice versa.
   */
  private gpuSelectionEnv(): Record<string, string> {
    if (process.platform === 'win32') return { SHIM_MCCOMPAT: '0' };
    if (process.platform === 'linux') {
      return { __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' };
    }
    return {};
  }

  /**
   * Turns a process exit code into something actionable. Windows reports hard native crashes
   * as NTSTATUS values (e.g. 3221225477 = 0xC0000005), which look like noise otherwise.
   */
  private describeExitCode(code: number): string {
    const unsigned = code >>> 0;
    const windowsCodes: Record<number, string> = {
      0xc0000005:
        'ACCESS_VIOLATION — a native library crashed the game. Usually an incompatible or wrong-architecture native (check the natives folder), or an outdated GPU driver',
      0xc0000135: 'DLL_NOT_FOUND — a required native library is missing or was blocked by antivirus',
      0xc000001d: 'ILLEGAL_INSTRUCTION — the Java runtime or a native library needs CPU features this machine does not have',
      0xc00000fd: 'STACK_OVERFLOW',
      0xc0000409: 'STACK_BUFFER_OVERRUN (fail-fast abort in native code)',
      0xc000013a: 'CONTROL_C_EXIT — the process was terminated externally',
    };
    if (process.platform === 'win32' && windowsCodes[unsigned]) return windowsCodes[unsigned];
    if (code === 137 || code === 139 || code === 134) {
      return 'the JVM was killed by the operating system (out of memory or a native crash)';
    }
    if (code === 1) return 'the game reported an error — see the stack trace above';
    return '';
  }

  /**
   * Picks the runtime for a launch.
   *
   * A JVM older than the version's declared `javaVersion.majorVersion` can never load the
   * game classes (UnsupportedClassVersionError, e.g. class file 69 = Java 25), so that is
   * detected up front — and the missing runtime is provisioned — instead of failing after
   * the whole download phase or silently launching the wrong Java.
   */
  private async resolveJavaRuntime(
    requiredJava: number,
    instance: any,
    id: string,
    callbacks: LaunchCallbacks,
    log: LogSink
  ): Promise<JavaInfo> {
    // An explicitly configured runtime wins as long as it can actually run this version.
    const explicit = typeof instance.javaPath === 'string' ? instance.javaPath.trim() : '';
    if (explicit) {
      const probed =
        explicit === 'java' || fs.existsSync(explicit) ? await this.javaManager.probeJava(explicit) : null;
      if (probed && probed.majorVersion >= requiredJava) return probed;
      if (probed) {
        log.push(
          'warn',
          `The Java runtime selected for this instance is Java ${probed.majorVersion}, but this Minecraft version requires Java ${requiredJava}. Looking for a suitable runtime...`
        );
      }
    }

    const best = await this.javaManager.getBestJavaInfo(requiredJava);
    if (best && best.majorVersion >= requiredJava) return best;
    this.assertActive(id);

    const onPath = await this.javaManager.probeJava('java');
    if (onPath && onPath.majorVersion >= requiredJava) return onPath;
    this.assertActive(id);

    const foundLabel = best ? `Java ${best.majorVersion}` : 'no Java runtime';
    callbacks.onProgress({
      instanceId: id,
      status: 'installing',
      percent: 80,
      message: `Installing Java ${requiredJava} runtime (found ${foundLabel})...`,
    });
    log.push(
      'launcher',
      `Java ${requiredJava} is required by this Minecraft version but only ${foundLabel} is installed. Downloading it now (one-time, ~200 MB)...`
    );

    const download = await this.javaManager.downloadAdoptiumJava(requiredJava);
    this.assertActive(id);

    if (!download.success || !download.path) {
      throw new Error(
        `This Minecraft version requires Java ${requiredJava}, but only ${foundLabel} is installed and the automatic download failed (${download.error || 'unknown error'}). Install Java ${requiredJava} and select it in Settings \u2192 Java.`
      );
    }

    const provisioned = await this.javaManager.probeJava(download.path);
    if (!provisioned) {
      throw new Error(`Java ${requiredJava} was downloaded to ${download.path} but could not be started.`);
    }

    log.push('launcher', `Java ${provisioned.majorVersion} runtime installed at ${provisioned.path}`);
    return provisioned;
  }

  private classifyLine(line: string, fallback: LogLevel): LogLevel {
    if (fallback === 'warn') return 'warn';
    if (/\/(ERROR|FATAL)\]/.test(line) || /\bException\b/.test(line) || /\bCaused by:/.test(line) || /^\s+at\s/.test(line)) {
      return 'error';
    }
    if (/\bWARN:|\[WARN\]|\/WARN\]/.test(line)) return 'warn';
    return 'info';
  }

  /**
   * Stops a running instance. If the launch is still being prepared, the preparation
   * aborts at the next checkpoint instead of leaving the launcher stuck.
   */
  public kill(instanceId: string): boolean {
    this.cancelled.add(instanceId);
    const proc = this.activeProcesses.get(instanceId);

    if (!proc || proc.pid == null) {
      // Nothing spawned yet: cancellation is picked up by the preparation pipeline.
      return this.preparing.has(instanceId) || proc != null;
    }

    try {
      if (process.platform === 'win32') {
        // Minecraft spawns a child JVM; killing the tree is the only reliable stop.
        const killer = spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
          detached: true,
        });
        killer.unref();
      } else {
        proc.kill('SIGTERM');
        const pid = proc.pid;
        setTimeout(() => {
          try {
            process.kill(pid, 0);
            process.kill(pid, 'SIGKILL');
          } catch {}
        }, 5000).unref?.();
      }
    } catch {}

    if (this.activeProcesses.get(instanceId) === proc) {
      this.activeProcesses.delete(instanceId);
    }
    return true;
  }

  public detachAllForQuit(): void {
    for (const [, proc] of this.activeProcesses) {
      try {
        proc.stdout?.removeAllListeners();
        proc.stderr?.removeAllListeners();
        proc.stdout?.destroy();
        proc.stderr?.destroy();
        proc.unref();
      } catch {}
    }
  }

  public getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }

  public isBusy(instanceId: string): boolean {
    return this.activeProcesses.has(instanceId) || this.preparing.has(instanceId);
  }

  private checkRules(rules?: any[], features?: Record<string, boolean>): boolean {
    if (!rules || rules.length === 0) return true;
    let allowed = false;
    for (const rule of rules) {
      if (!this.ruleMatches(rule, features)) continue;
      allowed = rule.action === 'allow';
    }
    return allowed;
  }

  private ruleMatches(rule: any, features?: Record<string, boolean>): boolean {
    const os = rule?.os;
    if (os) {
      if (os.name && os.name !== this.getMojangOsName()) return false;
      if (os.arch) {
        const arch = String(os.arch).toLowerCase();
        const wants64 =
          arch === 'x86_64' || arch === 'x64' || arch === '64' || arch === 'amd64' || arch === 'aarch64' || arch === 'arm64';
        if (wants64 !== this.is64Bit()) return false;
      }
      if (os.version) {
        const release = String(os.release() || '');
        try {
          if (!new RegExp(os.version).test(release)) return false;
        } catch {}
      }
    }

    const ruleFeatures = rule?.features;
    if (ruleFeatures) {
      for (const [key, expected] of Object.entries(ruleFeatures)) {
        if (!!(features && features[key]) !== !!expected) return false;
      }
    }

    return true;
  }

  /** Fabric bundles its own ASM build, so vanilla ASM is dropped to avoid class clashes. */
  private shouldIncludeLibrary(lib: any, isFabricLike: boolean): boolean {
    if (!isFabricLike) return true;
    const name = String(lib?.name || '');
    if (name.startsWith('org.ow2.asm:')) return false;
    return true;
  }

  private async downloadFile(
    url: string,
    destPath: string,
    retries = 5,
    shouldAbort?: () => boolean
  ): Promise<void> {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Fully async HTTP/HTTPS downloader (never blocks the Electron main thread)
    const tempPath = `${destPath}.part`;
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      if (shouldAbort?.()) throw new LaunchCancelledError();

      try {
        await new Promise<void>((resolve, reject) => {
          const startBytes = fs.existsSync(tempPath) ? fs.statSync(tempPath).size : 0;
          const file = fs.createWriteStream(tempPath, { flags: startBytes > 0 ? 'a' : 'w' });
          let fileError: Error | null = null;

          const cleanup = () => {
            try { file.destroy(); } catch {}
          };

          const request = (targetUrl: string, redirectCount = 0) => {
            if (redirectCount > 5) {
              cleanup();
              return reject(new Error(`Too many redirects for ${url}`));
            }

            const client = targetUrl.startsWith('https') ? https : http;
            const headers: Record<string, string> = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VictusClient/1.0',
              'Connection': 'close',
              'Accept': '*/*',
            };

            if (startBytes > 0) {
              headers['Range'] = `bytes=${startBytes}-`;
            }

            const req = client.get(
              targetUrl,
              {
                family: 4,
                headers,
                timeout: 30000,
              },
              (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                  try { res.resume(); } catch {}
                  cleanup();
                  const redirectUrl = new URL(res.headers.location, targetUrl).toString();
                  return request(redirectUrl, redirectCount + 1);
                }

                if (res.statusCode !== 200 && res.statusCode !== 206) {
                  try { res.resume(); } catch {}
                  cleanup();
                  return reject(new Error(`HTTP ${res.statusCode || 0} downloading ${targetUrl}`));
                }

                const expectedTotal = res.statusCode === 206
                  ? startBytes + parseInt(res.headers['content-length'] || '0', 10)
                  : parseInt(res.headers['content-length'] || '0', 10);

                let receivedBytes = startBytes;

                res.on('data', (chunk) => {
                  receivedBytes += chunk.length;
                  // Allow long downloads (client.jar) to be interrupted without waiting for completion.
                  if (shouldAbort?.()) {
                    try { req.destroy(new LaunchCancelledError()); } catch {}
                  }
                });

                res.pipe(file);

                res.on('error', (err) => {
                  cleanup();
                  reject(err);
                });

                file.on('finish', () => {
                  file.close(() => {
                    if (fileError) return reject(fileError);
                    if (expectedTotal > 0 && receivedBytes < expectedTotal) {
                      return reject(new Error(`Incomplete download: received ${receivedBytes} of ${expectedTotal} bytes`));
                    }
                    try {
                      fs.copyFileSync(tempPath, destPath);
                      try { fs.unlinkSync(tempPath); } catch {}
                      resolve();
                    } catch (e) {
                      reject(e);
                    }
                  });
                });

                file.on('error', (fileErr) => {
                  fileError = fileErr;
                  cleanup();
                  reject(fileErr);
                });
              }
            );

            req.on('timeout', () => {
              req.destroy(new Error('Download request timed out'));
            });

            req.on('error', (err) => {
              cleanup();
              reject(err);
            });
          };

          request(url);
        });

        // Download succeeded
        return;
      } catch (err: any) {
        if (err instanceof LaunchCancelledError || err?.name === 'LaunchCancelledError') {
          throw new LaunchCancelledError();
        }
        lastError = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    throw lastError || new Error(`Failed to download ${url}`);
  }
}
