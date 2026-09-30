import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile, spawn } from 'child_process';

export interface JavaInfo {
  path: string;
  version: string;
  majorVersion: number;
  arch: string;
  isDefault?: boolean;
}

const JAVA_BIN = process.platform === 'win32' ? 'java.exe' : 'java';

function runCommand(bin: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = `${stdout || ''}\n${stderr || ''}`;
      if (out.trim()) return resolve(out);
      reject(err || new Error('no output'));
    });
  });
}

function parseJavaVersion(output: string): { version: string; major: number; arch: string } | null {
  const versionMatch = output.match(/(?:java|openjdk) version "([^"]+)"/i) || output.match(/build ([0-9.+-_]+)/i);
  if (!versionMatch) return null;

  const versionStr = versionMatch[1];
  let major = 8;
  if (versionStr.startsWith('1.8')) major = 8;
  else if (versionStr.startsWith('1.')) major = parseInt(versionStr.split('.')[1], 10) || 8;
  else {
    const m = versionStr.match(/^([0-9]+)/);
    if (m) major = parseInt(m[1], 10);
  }

  let arch = 'x86';
  if (/aarch64|arm64/i.test(output)) arch = 'arm64';
  else if (/64-Bit|x86_64|amd64/i.test(output)) arch = 'x64';

  return { version: versionStr, major, arch };
}

export class JavaManager {
  private runtimesDir: string;
  private cache: { at: number; list: JavaInfo[] } | null = null;
  private static CACHE_TTL_MS = 60_000;

  constructor(dataDir: string) {
    this.runtimesDir = path.join(dataDir, 'runtimes');
    if (!fs.existsSync(this.runtimesDir)) {
      fs.mkdirSync(this.runtimesDir, { recursive: true });
    }
  }

  public getRuntimesDir(): string {
    return this.runtimesDir;
  }

  /**
   * Inspects a single Java binary. Runs the probe in a child process so the Electron
   * main thread is never blocked, and returns null when the binary is unusable.
   */
  public async probeJava(javaBin: string): Promise<JavaInfo | null> {
    if (!javaBin) return null;
    if (javaBin !== 'java' && !fs.existsSync(javaBin)) return null;

    try {
      const out = await runCommand(javaBin, ['-version'], 5000);
      const parsed = parseJavaVersion(out);
      if (!parsed) return null;
      return {
        path: javaBin,
        version: parsed.version,
        majorVersion: parsed.major,
        arch: parsed.arch,
      };
    } catch {
      return null;
    }
  }

  public async detectInstallations(): Promise<JavaInfo[]> {
    if (this.cache && Date.now() - this.cache.at < JavaManager.CACHE_TTL_MS) {
      return this.cache.list.map((j) => ({ ...j }));
    }

    const candidates: string[] = [];
    const seen = new Set<string>();

    const addCandidate = (javaBin: string) => {
      if (!javaBin) return;
      const key = javaBin.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push(javaBin);
    };

    // 1. Everything on PATH
    try {
      const locator = process.platform === 'win32' ? 'where' : 'which';
      const out = await runCommand(locator, process.platform === 'win32' ? ['java'] : ['-a', 'java'], 5000);
      for (const line of out.split(/\r?\n/)) {
        const value = line.trim();
        if (value && !value.startsWith('INFO:') && fs.existsSync(value)) addCandidate(value);
      }
    } catch {}

    // 2. JAVA_HOME
    if (process.env.JAVA_HOME) {
      addCandidate(path.join(process.env.JAVA_HOME, 'bin', JAVA_BIN));
    }

    // 3. Well-known install locations per platform
    const searchDirs: string[] = [];
    if (process.platform === 'win32') {
      searchDirs.push(
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Microsoft',
        'C:\\Program Files\\Zulu',
        'C:\\Program Files\\BellSoft',
        'C:\\Program Files (x86)\\Minecraft Launcher\\runtime',
      );
      if (process.env.APPDATA) {
        searchDirs.push(
          path.join(process.env.APPDATA, '.minecraft', 'runtime'),
          path.join(process.env.APPDATA, 'PrismLauncher', 'java')
        );
      }
      if (process.env.LOCALAPPDATA) {
        searchDirs.push(
          path.join(process.env.LOCALAPPDATA, 'Programs', 'Eclipse Adoptium'),
          path.join(process.env.LOCALAPPDATA, 'Programs', 'Java')
        );
      }
    } else if (process.platform === 'darwin') {
      searchDirs.push(
        '/Library/Java/JavaVirtualMachines',
        '/System/Library/Java/JavaVirtualMachines',
        '/opt/homebrew/opt',
        '/usr/local/opt'
      );
      const home = os.homedir();
      if (home) {
        searchDirs.push(path.join(home, 'Library', 'Java', 'JavaVirtualMachines'));
        searchDirs.push(path.join(home, '.sdkman', 'candidates', 'java'));
      }
    } else {
      searchDirs.push('/usr/lib/jvm', '/usr/java', '/opt/java', '/opt/jdk', '/usr/local/lib/jvm');
      const home = os.homedir();
      if (home) searchDirs.push(path.join(home, '.sdkman', 'candidates', 'java'));
    }

    if (process.env.USERPROFILE) {
      searchDirs.push(path.join(process.env.USERPROFILE, '.jdks'));
    }
    searchDirs.push(this.runtimesDir);

    const scanDirectory = (dir: string, depth: number) => {
      if (depth > 5) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (fs.existsSync(path.join(full, 'bin', JAVA_BIN))) addCandidate(path.join(full, 'bin', JAVA_BIN));
        scanDirectory(full, depth + 1);
      }
    };

    for (const dir of searchDirs) {
      if (fs.existsSync(path.join(dir, 'bin', JAVA_BIN))) addCandidate(path.join(dir, 'bin', JAVA_BIN));
      scanDirectory(dir, 0);
    }

    const list: JavaInfo[] = [];
    for (const candidate of candidates.slice(0, 40)) {
      const info = await this.probeJava(candidate);
      if (info && !list.some((j) => j.path.toLowerCase() === info.path.toLowerCase())) {
        list.push(info);
      }
    }

    if (list.length > 0) {
      list.sort((a, b) => b.majorVersion - a.majorVersion);
      list[0].isDefault = true;
    }

    this.cache = { at: Date.now(), list };
    return list.map((j) => ({ ...j }));
  }

  /** Picks the runtime closest to (but at least) the requested major version. */
  public async getBestJavaInfo(requiredMajor = 21): Promise<JavaInfo | undefined> {
    const installed = await this.detectInstallations();
    if (installed.length === 0) return undefined;

    const exact = installed.find((j) => j.majorVersion === requiredMajor);
    if (exact) return exact;

    const compatible = installed
      .filter((j) => j.majorVersion >= requiredMajor)
      .sort((a, b) => a.majorVersion - b.majorVersion);
    if (compatible.length > 0) return compatible[0];

    // Nothing new enough: fall back to the newest runtime that is installed.
    const fallback = [...installed].sort((a, b) => b.majorVersion - a.majorVersion);
    return fallback[0];
  }

  public async getBestJava(requiredMajor = 21): Promise<string> {
    const best = await this.getBestJavaInfo(requiredMajor);
    return best ? best.path : 'java';
  }

  public async downloadAdoptiumJava(majorVersion = 21): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const targetDir = path.join(this.runtimesDir, `java-${majorVersion}`);
      if (fs.existsSync(targetDir)) {
        const candidate = path.join(targetDir, 'bin', JAVA_BIN);
        if (fs.existsSync(candidate)) return { success: true, path: candidate };
      }

      const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
      const archName = process.arch === 'arm64' ? 'aarch64' : process.arch === 'ia32' ? 'x86' : 'x64';

      const apiUrl = `https://api.adoptium.net/v3/binary/latest/${majorVersion}/ga/${osName}/${archName}/jdk/hotspot/normal/eclipse?project=jdk`;
      const res = await fetch(apiUrl, { redirect: 'follow' });
      if (!res.ok) throw new Error(`Failed to download OpenJDK ${majorVersion} (HTTP ${res.status})`);

      const isZip = osName === 'windows';
      const archivePath = path.join(this.runtimesDir, `temp-jdk-${majorVersion}${isZip ? '.zip' : '.tar.gz'}`);
      fs.writeFileSync(archivePath, Buffer.from(await res.arrayBuffer()));

      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      if (isZip) {
        const AdmZip = require('adm-zip');
        new AdmZip(archivePath).extractAllTo(targetDir, true);
      } else {
        await this.extractTarGz(archivePath, targetDir);
      }
      try { fs.unlinkSync(archivePath); } catch {}

      const scanForJava = (d: string, depth = 0): string | null => {
        if (depth > 5) return null;
        let entries: fs.Dirent[];
        try {
          entries = fs.readdirSync(d, { withFileTypes: true });
        } catch {
          return null;
        }
        for (const f of entries) {
          const full = path.join(d, f.name);
          if (f.isDirectory()) {
            const check = path.join(full, 'bin', JAVA_BIN);
            if (fs.existsSync(check)) return check;
            const nested = scanForJava(full, depth + 1);
            if (nested) return nested;
          }
        }
        return null;
      };

      const found = scanForJava(targetDir);
      if (found) {
        this.cache = null;
        return { success: true, path: found };
      }
      return { success: false, error: `${JAVA_BIN} not found after extraction` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private extractTarGz(archivePath: string, targetDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xzf', archivePath, '-C', targetDir], { stdio: 'ignore' });
      tar.on('error', reject);
      tar.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`tar exited with code ${code}`));
      });
    });
  }
}
