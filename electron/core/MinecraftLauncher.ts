import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import dns from 'dns';
import { spawn, execSync, ChildProcess } from 'child_process';
import AdmZip from 'adm-zip';
import { VersionManager } from './VersionManager';
import { JavaManager } from './JavaManager';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export interface LaunchCallbacks {
  onProgress: (data: { instanceId: string; status: string; percent: number; message: string }) => void;
  onLog: (data: { id: string; timestamp: string; level: 'info' | 'warn' | 'error' | 'launcher'; message: string }) => void;
  onExit: (data: { instanceId: string; code: number }) => void;
}

export class MinecraftLauncher {
  private dataDir: string;
  private versionsDir: string;
  private librariesDir: string;
  private assetsDir: string;
  private versionManager: VersionManager;
  private javaManager: JavaManager;
  private activeProcesses = new Map<string, ChildProcess>();

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

  private async downloadAssets(assetIndex: any, id: string, callbacks: LaunchCallbacks): Promise<void> {
    if (!assetIndex || !assetIndex.url) return;
    const indexFile = path.join(this.assetsDir, 'indexes', `${assetIndex.id}.json`);
    if (!fs.existsSync(indexFile)) {
      callbacks.onProgress({ instanceId: id, status: 'downloading', percent: 55, message: 'Downloading asset index...' });
      await this.downloadFile(assetIndex.url, indexFile);
    }

    try {
      const idx = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      const objects = idx.objects || {};
      
      // Download essential UI/font/text assets first so the window never crashes
      const essentialEntries = Object.entries(objects).filter(
        ([k]) => !k.startsWith('minecraft/sounds/') && !k.startsWith('minecraft/records/')
      );

      callbacks.onProgress({
        instanceId: id,
        status: 'downloading',
        percent: 65,
        message: `Verifying ${essentialEntries.length} core game assets...`,
      });

      // Concurrent downloader with pool of 12 workers
      const concurrency = 12;
      let currentIndex = 0;
      const worker = async () => {
        while (currentIndex < essentialEntries.length) {
          const [k, obj] = essentialEntries[currentIndex++] as [string, any];
          const hash = obj.hash;
          const sub = hash.slice(0, 2);
          const dest = path.join(this.assetsDir, 'objects', sub, hash);
          if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;

          try {
            const url = `https://resources.download.minecraft.net/${sub}/${hash}`;
            await this.downloadFile(url, dest);
          } catch {}
        }
      };

      const workers = Array.from({ length: concurrency }, () => worker());
      await Promise.all(workers);
    } catch (e: any) {
      callbacks.onLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'warn',
        message: `Asset verification note: ${e.message}`,
      });
    }
  }

  public async launch(instance: any, account: any, callbacks: LaunchCallbacks): Promise<{ success: boolean; error?: string }> {
    const id = instance.id;
    try {
      callbacks.onProgress({ instanceId: id, status: 'preparing', percent: 5, message: 'Resolving Minecraft metadata...' });
      callbacks.onLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'launcher',
        message: `[VictusClient] Preparing launch for "${instance.name}" (${instance.version} - ${instance.loader})`,
      });

      const realVersion = this.versionManager.resolveRealGameVersion(instance.version);

      // 1. Resolve Version JSON
      const versionJson = await this.versionManager.getVersionJson(realVersion);

      // 2. Resolve Client Jar
      const clientDownload = versionJson.downloads?.client;
      const versionJarPath = path.join(this.versionsDir, realVersion, `${realVersion}.jar`);
      if (clientDownload && (!fs.existsSync(versionJarPath) || fs.statSync(versionJarPath).size === 0)) {
        callbacks.onProgress({ instanceId: id, status: 'downloading', percent: 15, message: `Downloading Minecraft client.jar (${realVersion})...` });
        await this.downloadFile(clientDownload.url, versionJarPath);
      }

      // 3. Resolve Libraries & Natives
      callbacks.onProgress({ instanceId: id, status: 'downloading', percent: 30, message: 'Verifying libraries...' });
      const classpathFiles: string[] = [];
      const nativesDir = path.join(instance.gameDir, 'natives');
      if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true });

      // Handle Fabric Loader profile libraries
      let mainClass = versionJson.mainClass || 'net.minecraft.client.main.Main';
      const isFabric = instance.loader === 'fabric';
      const isQuilt = instance.loader === 'quilt';

      if (isFabric || isQuilt) {
        callbacks.onProgress({ instanceId: id, status: 'downloading', percent: 35, message: `Resolving ${instance.loader.toUpperCase()} loader libraries...` });
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

            try {
              const res = await fetch(metaUrl);
              if (res.ok) {
                profile = (await res.json()) as any;
                break;
              }
            } catch {}
          }

          if (profile) {
            if (profile.mainClass) mainClass = profile.mainClass;

            const loaderLibs = profile.libraries || [];
            for (const lib of loaderLibs) {
              const relPath = this.mavenToPath(lib.name);
              const dest = path.join(this.librariesDir, relPath);
              if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
                const base = lib.url || (isFabric ? 'https://maven.fabricmc.net/' : 'https://maven.quiltmc.org/repository/release/');
                try {
                  await this.downloadFile(base + relPath, dest);
                } catch (e: any) {
                  callbacks.onLog({
                    id: `log-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString(),
                    level: 'warn',
                    message: `Notice resolving loader lib ${lib.name}: ${e.message}`,
                  });
                }
              }
              if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
                classpathFiles.push(dest);
              }
            }
          }
        } catch (loaderErr: any) {
          callbacks.onLog({
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'warn',
            message: `Warning resolving loader: ${loaderErr.message}`,
          });
        }
      }

      // Vanilla Libraries
      const libraries = versionJson.libraries || [];
      for (const lib of libraries) {
        if (!this.checkRules(lib.rules)) continue;
        // When using Fabric/Quilt, omit older vanilla asm to prevent duplicate ASM clashes
        if ((isFabric || isQuilt) && lib.name && lib.name.startsWith('org.ow2.asm:')) continue;

        // Artifact jar
        if (lib.downloads?.artifact) {
          const artifact = lib.downloads.artifact;
          const libPath = path.join(this.librariesDir, artifact.path || `${lib.name.replace(/:/g, '/')}.jar`);
          if (!fs.existsSync(libPath) || fs.statSync(libPath).size === 0) {
            try {
              await this.downloadFile(artifact.url, libPath);
            } catch (dlErr: any) {
              callbacks.onLog({
                id: `log-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                level: 'warn',
                message: `Notice downloading library ${lib.name}: ${dlErr.message}`,
              });
            }
          }
          if (fs.existsSync(libPath) && fs.statSync(libPath).size > 0) {
            classpathFiles.push(libPath);
          }
        }

        // Natives classifiers (e.g. natives-windows)
        const classifiers = lib.downloads?.classifiers;
        if (classifiers && classifiers['natives-windows']) {
          const nativeArtifact = classifiers['natives-windows'];
          const nativeZip = path.join(this.librariesDir, nativeArtifact.path);
          if (!fs.existsSync(nativeZip) || fs.statSync(nativeZip).size === 0) {
            try {
              await this.downloadFile(nativeArtifact.url, nativeZip);
            } catch (dlErr: any) {
              callbacks.onLog({
                id: `log-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                level: 'warn',
                message: `Notice downloading native ${lib.name}: ${dlErr.message}`,
              });
            }
          }
          // Extract DLLs
          if (fs.existsSync(nativeZip) && fs.statSync(nativeZip).size > 0) {
            try {
              const zip = new AdmZip(nativeZip);
              zip.getEntries().forEach((entry) => {
                if (entry.entryName.endsWith('.dll') && !entry.entryName.startsWith('META-INF')) {
                  fs.writeFileSync(path.join(nativesDir, path.basename(entry.entryName)), entry.getData());
                }
              });
            } catch {}
          }
        }
      }

      // Add main client jar to classpath
      if (fs.existsSync(versionJarPath)) {
        classpathFiles.push(versionJarPath);
      }

      // 4. Resolve Asset Index and Core Objects
      await this.downloadAssets(versionJson.assetIndex, id, callbacks);

      // 5. Build Classpath string (using semicolon on Windows)
      const classpath = classpathFiles.join(';');

      // 6. Java Virtual Machine selection & validation
      let javaPath = instance.javaPath;
      if (!javaPath || !fs.existsSync(javaPath)) {
        javaPath = this.javaManager.getBestJava(21);
      }
      if (!javaPath || (!fs.existsSync(javaPath) && javaPath !== 'java')) {
        throw new Error(`Java runtime not found! Please check Java in Settings or install Java 21.`);
      }

      const ramMax = instance.ramMax || 4096;
      const ramMin = instance.ramMin || 1024;

      const jvmArgs = [
        `-Xms${ramMin}M`,
        `-Xmx${ramMax}M`,
        `-Djava.library.path=${nativesDir}`,
        `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesDir}`,
        `-Djna.tmpdir=${nativesDir}`,
        `-Dio.netty.native.workdir=${nativesDir}`,
        `-Dminecraft.launcher.brand=VictusClient`,
        `-Dminecraft.launcher.version=1.0.0`,
        '--enable-native-access=ALL-UNNAMED',
      ];

      if (instance.jvmArgs) {
        jvmArgs.push(...instance.jvmArgs.split(' ').filter(Boolean));
      }

      jvmArgs.push('-cp', classpath);

      // 8. Game Arguments
      const username = account?.username || 'VictusPlayer';
      const uuid = this.normalizeUuid(account?.uuid, username);
      const token = account?.accessToken || 'victus_token';
      const isMsa = account?.type === 'microsoft';

      const gameArgs = [
        '--username', username,
        '--version', realVersion,
        '--gameDir', instance.gameDir,
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

      // 9. Launch Process with error trapping
      callbacks.onProgress({ instanceId: id, status: 'launching', percent: 95, message: 'Starting Java process...' });
      callbacks.onLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'launcher',
        message: `Executing: "${javaPath}" ${jvmArgs.join(' ')} ${mainClass} ${gameArgs.join(' ')}`,
      });

      const proc = spawn(javaPath, [...jvmArgs, mainClass, ...gameArgs], {
        cwd: instance.gameDir,
      });

      this.activeProcesses.set(id, proc);

      proc.on('error', (procErr: Error) => {
        callbacks.onProgress({ instanceId: id, status: 'error', percent: 0, message: procErr.message });
        callbacks.onLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Process spawn error: ${procErr.message}`,
        });
      });

      callbacks.onProgress({ instanceId: id, status: 'running', percent: 100, message: 'Minecraft is running' });

      // Pipe stdout & stderr
      proc.stdout?.on('data', (data) => {
        const text = data.toString('utf-8');
        text.split(/\r?\n/).forEach((line: string) => {
          if (!line.trim()) return;
          let level: 'info' | 'warn' | 'error' = 'info';
          if (line.includes('/WARN') || line.includes('WARN:')) level = 'warn';
          if (line.includes('/ERROR') || line.includes('Exception') || line.includes('Error')) level = 'error';

          callbacks.onLog({
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            level,
            message: line,
          });
        });
      });

      proc.stderr?.on('data', (data) => {
        const text = data.toString('utf-8');
        text.split(/\r?\n/).forEach((line: string) => {
          if (!line.trim()) return;
          callbacks.onLog({
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'warn',
            message: line,
          });
        });
      });

      proc.on('close', (code) => {
        this.activeProcesses.delete(id);
        callbacks.onExit({ instanceId: id, code: code ?? 0 });
        callbacks.onLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'launcher',
          message: `Game process exited with code ${code ?? 0}`,
        });
      });

      return { success: true };
    } catch (err: any) {
      callbacks.onProgress({ instanceId: id, status: 'error', percent: 0, message: err.message || 'Launch error' });
      callbacks.onLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Launch error: ${err.message}`,
      });
      return { success: false, error: err.message };
    }
  }

  public kill(instanceId: string): boolean {
    const proc = this.activeProcesses.get(instanceId);
    if (proc) {
      proc.kill('SIGTERM');
      this.activeProcesses.delete(instanceId);
      return true;
    }
    return false;
  }

  private checkRules(rules?: any[]): boolean {
    if (!rules || rules.length === 0) return true;
    let allowed = false;
    for (const rule of rules) {
      if (rule.action === 'allow') {
        if (!rule.os || rule.os.name === 'windows') allowed = true;
      } else if (rule.action === 'disallow') {
        if (!rule.os || rule.os.name === 'windows') allowed = false;
      }
    }
    return allowed;
  }

  private async downloadFile(url: string, destPath: string, retries = 5): Promise<void> {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 1. Native Windows curl optimization (avoids BoringSSL socket drop & BAD_DECRYPT issues on IPv6)
    if (process.platform === 'win32' && fs.existsSync('C:\\Windows\\System32\\curl.exe')) {
      try {
        const tempPath = `${destPath}.part`;
        execSync(
          `"C:\\Windows\\System32\\curl.exe" -4 -s -L -C - --retry 3 --connect-timeout 15 -o "${tempPath}" "${url}"`,
          { stdio: 'ignore', timeout: 120000 }
        );
        if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
          fs.copyFileSync(tempPath, destPath);
          try { fs.unlinkSync(tempPath); } catch {}
          return;
        }
      } catch {}
    }

    // 2. Resumable HTTP/HTTPS downloader with Range support and strict byte-verification
    const tempPath = `${destPath}.part`;
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const startBytes = fs.existsSync(tempPath) ? fs.statSync(tempPath).size : 0;
          const file = fs.createWriteStream(tempPath, { flags: startBytes > 0 ? 'a' : 'w' });

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
                  cleanup();
                  const redirectUrl = new URL(res.headers.location, targetUrl).toString();
                  return request(redirectUrl, redirectCount + 1);
                }

                if (res.statusCode !== 200 && res.statusCode !== 206) {
                  cleanup();
                  return reject(new Error(`HTTP ${res.statusCode || 0} downloading ${targetUrl}`));
                }

                const expectedTotal = res.statusCode === 206
                  ? startBytes + parseInt(res.headers['content-length'] || '0', 10)
                  : parseInt(res.headers['content-length'] || '0', 10);

                let receivedBytes = startBytes;

                res.on('data', (chunk) => {
                  receivedBytes += chunk.length;
                });

                res.pipe(file);

                res.on('error', (err) => {
                  cleanup();
                  reject(err);
                });

                file.on('finish', () => {
                  file.close(() => {
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
        lastError = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    throw lastError || new Error(`Failed to download ${url}`);
  }
}
