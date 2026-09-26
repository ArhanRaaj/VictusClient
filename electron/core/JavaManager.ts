import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface JavaInfo {
  path: string;
  version: string;
  majorVersion: number;
  arch: string;
  isDefault?: boolean;
}

export class JavaManager {
  private runtimesDir: string;

  constructor(dataDir: string) {
    this.runtimesDir = path.join(dataDir, 'runtimes');
    if (!fs.existsSync(this.runtimesDir)) {
      fs.mkdirSync(this.runtimesDir, { recursive: true });
    }
  }

  public detectInstallations(): JavaInfo[] {
    const list: JavaInfo[] = [];
    const scannedPaths = new Set<string>();

    const checkCandidate = (javaBin: string) => {
      if (!fs.existsSync(javaBin) || scannedPaths.has(javaBin.toLowerCase())) return;
      scannedPaths.add(javaBin.toLowerCase());

      try {
        const out = execSync(`"${javaBin}" -version 2>&1`, { encoding: 'utf-8', timeout: 3000 });
        const versionMatch = out.match(/(?:java|openjdk) version "([^"]+)"/i) || out.match(/build ([0-9.+-_]+)/i);
        const versionStr = versionMatch ? versionMatch[1] : 'Unknown';

        let major = 8;
        if (versionStr.startsWith('1.8')) major = 8;
        else {
          const m = versionStr.match(/^([0-9]+)/);
          if (m) major = parseInt(m[1], 10);
        }

        const is64 = out.includes('64-Bit') || out.includes('x86_64') || out.includes('amd64');

        list.push({
          path: javaBin,
          version: versionStr,
          majorVersion: major,
          arch: is64 ? 'x64' : 'x86',
        });
      } catch {}
    };

    // Check PATH
    try {
      const whereOut = execSync('where.exe java 2>nul', { encoding: 'utf-8' });
      for (const line of whereOut.split(/\r?\n/)) {
        if (line.trim()) checkCandidate(line.trim());
      }
    } catch {}

    // Check JAVA_HOME
    if (process.env.JAVA_HOME) {
      checkCandidate(path.join(process.env.JAVA_HOME, 'bin', 'java.exe'));
    }

    // Common Windows directories & AppData runtimes
    const searchDirs = [
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\Zulu',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files (x86)\\Minecraft Launcher\\runtime',
      this.runtimesDir,
    ];

    if (process.env.APPDATA) {
      searchDirs.push(
        path.join(process.env.APPDATA, 'FastClient', 'runtimes'),
        path.join(process.env.APPDATA, '.minecraft', 'runtime'),
        path.join(process.env.APPDATA, 'PrismLauncher', 'java'),
        path.join(process.env.APPDATA, 'VictusClient', 'runtimes')
      );
    }
    if (process.env.LOCALAPPDATA) {
      searchDirs.push(
        path.join(process.env.LOCALAPPDATA, 'Programs', 'Eclipse Adoptium'),
        path.join(process.env.LOCALAPPDATA, 'Programs', 'Java')
      );
    }
    if (process.env.USERPROFILE) {
      searchDirs.push(path.join(process.env.USERPROFILE, '.jdks'));
    }

    const scanDirectoryDeep = (dir: string, depth = 0) => {
      if (depth > 4 || !fs.existsSync(dir)) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const javaCandidate = path.join(full, 'bin', 'java.exe');
            if (fs.existsSync(javaCandidate)) {
              checkCandidate(javaCandidate);
            }
            scanDirectoryDeep(full, depth + 1);
          }
        }
      } catch {}
    };

    for (const dir of searchDirs) {
      scanDirectoryDeep(dir);
    }

    if (list.length > 0) {
      list[0].isDefault = true;
    }

    return list;
  }

  public getBestJava(requiredMajor = 21): string {
    const installed = this.detectInstallations();
    if (installed.length === 0) return 'java';

    // 1. Exact match
    const exact = installed.find((j) => j.majorVersion === requiredMajor);
    if (exact) return exact.path;

    // 2. Compatible modern Java (e.g. 21, 22, 25 for Minecraft 1.20.5+)
    const compatible = installed
      .filter((j) => j.majorVersion >= requiredMajor)
      .sort((a, b) => b.majorVersion - a.majorVersion);
    if (compatible.length > 0) return compatible[0].path;

    // 3. Fallback to highest available installed Java
    const sorted = [...installed].sort((a, b) => b.majorVersion - a.majorVersion);
    return sorted[0].path;
  }

  public async downloadAdoptiumJava(majorVersion = 21): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const targetDir = path.join(this.runtimesDir, `java-${majorVersion}`);
      if (fs.existsSync(targetDir)) {
        const candidate = path.join(targetDir, 'bin', 'java.exe');
        if (fs.existsSync(candidate)) return { success: true, path: candidate };
      }

      const apiUrl = `https://api.adoptium.net/v3/binary/latest/${majorVersion}/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk`;
      const res = await fetch(apiUrl, { redirect: 'follow' });
      if (!res.ok) throw new Error(`Failed to download OpenJDK ${majorVersion} (HTTP ${res.status})`);

      const zipPath = path.join(this.runtimesDir, `temp-jdk-${majorVersion}.zip`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(zipPath, buffer);

      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(targetDir, true);
      try { fs.unlinkSync(zipPath); } catch {}

      const scanForJava = (d: string): string | null => {
        const files = fs.readdirSync(d, { withFileTypes: true });
        for (const f of files) {
          const full = path.join(d, f.name);
          if (f.isDirectory()) {
            const check = path.join(full, 'bin', 'java.exe');
            if (fs.existsSync(check)) return check;
            const nested = scanForJava(full);
            if (nested) return nested;
          }
        }
        return null;
      };

      const found = scanForJava(targetDir);
      if (found) {
        return { success: true, path: found };
      }
      return { success: false, error: 'java.exe not found after extraction' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
