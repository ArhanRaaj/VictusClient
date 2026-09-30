import fs from 'fs';
import path from 'path';
import { MANIFEST_TTL_MS, writeCache } from './LaunchCache';

export interface MojangVersionManifest {
  latest: { release: string; snapshot: string };
  versions: {
    id: string;
    type: string;
    url: string;
    time: string;
    releaseTime: string;
  }[];
}

export class VersionManager {
  private versionsDir: string;
  private manifestCacheFile: string;
  /** Parsed manifest for this app session; several instances launch from the same process. */
  private manifestMemo: { at: number; data: MojangVersionManifest } | null = null;

  constructor(dataDir: string) {
    this.versionsDir = path.join(dataDir, 'versions');
    this.manifestCacheFile = path.join(dataDir, 'version_manifest_v2.json');
    if (!fs.existsSync(this.versionsDir)) {
      fs.mkdirSync(this.versionsDir, { recursive: true });
    }
  }

  /**
   * Reads the cached manifest. Entries are stored wrapped with a timestamp; installations that
   * predate the cache still hold the raw manifest, so both shapes are accepted.
   */
  private readCachedManifest(maxAgeMs?: number): MojangVersionManifest | null {
    try {
      if (!fs.existsSync(this.manifestCacheFile)) return null;
      const parsed = JSON.parse(fs.readFileSync(this.manifestCacheFile, 'utf-8'));
      if (parsed && Array.isArray(parsed.versions)) {
        // Legacy raw manifest: fall back to the file timestamp to judge its age.
        if (typeof maxAgeMs === 'number') {
          const age = Date.now() - fs.statSync(this.manifestCacheFile).mtimeMs;
          if (age > maxAgeMs) return null;
        }
        return parsed as MojangVersionManifest;
      }
      if (parsed && parsed.data && Array.isArray(parsed.data.versions)) {
        if (typeof maxAgeMs === 'number' && Date.now() - Number(parsed.at) > maxAgeMs) return null;
        return parsed.data as MojangVersionManifest;
      }
    } catch {}
    return null;
  }

  public async getManifest(forceRefresh = false): Promise<MojangVersionManifest> {
    // The manifest only changes when Mojang publishes a version, so a warm cache is served
    // straight from memory (or disk) instead of paying for a network round trip every launch.
    if (!forceRefresh) {
      if (this.manifestMemo && Date.now() - this.manifestMemo.at <= MANIFEST_TTL_MS) {
        return this.manifestMemo.data;
      }
      const fresh = this.readCachedManifest(MANIFEST_TTL_MS);
      if (fresh) {
        this.manifestMemo = { at: Date.now(), data: fresh };
        return fresh;
      }
    }

    try {
      const res = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
      if (res.ok) {
        const manifest: MojangVersionManifest = (await res.json()) as MojangVersionManifest;
        writeCache(this.manifestCacheFile, manifest);
        this.manifestMemo = { at: Date.now(), data: manifest };
        return manifest;
      }
    } catch {}

    const stale = this.readCachedManifest();
    if (stale) return stale;

    // Default static fallback
    return {
      latest: { release: '1.21.4', snapshot: '1.21.4' },
      versions: [
        { id: '1.21.4', type: 'release', url: '', time: '', releaseTime: '' },
        { id: '1.21.1', type: 'release', url: '', time: '', releaseTime: '' },
        { id: '1.20.4', type: 'release', url: '', time: '', releaseTime: '' },
        { id: '1.20.1', type: 'release', url: '', time: '', releaseTime: '' },
        { id: '1.19.4', type: 'release', url: '', time: '', releaseTime: '' },
        { id: '1.18.2', type: 'release', url: '', time: '', releaseTime: '' },
        { id: '1.16.5', type: 'release', url: '', time: '', releaseTime: '' },
        { id: '1.12.2', type: 'release', url: '', time: '', releaseTime: '' },
        { id: '1.8.9', type: 'release', url: '', time: '', releaseTime: '' },
      ],
    };
  }

  public resolveRealGameVersion(versionId: string): string {
    const v = (versionId || '').trim();
    if (
      v === '26.4' ||
      v === '26.4 Snapshot 1' ||
      v === '26.4-snapshot-1' ||
      v.toLowerCase().includes('26.4')
    ) {
      return '26.4-snapshot-1';
    }
    if (v === '26.3' || v.startsWith('26.3')) return '26.3';
    if (v === '26.2' || v.startsWith('26.2')) return '26.2';
    if (v === '26.1' || v.startsWith('26.1')) return '26.1';
    if (v === '1.21.11' || v === '1.21.8' || v === '1.21') return '1.21.4';
    if (v === '1.20.8' || v === '1.20') return '1.20.4';
    if (v === '1.8') return '1.8.9';
    return v || '26.4-snapshot-1';
  }

  public async getVersionJson(versionId: string): Promise<any> {
    const realVer = this.resolveRealGameVersion(versionId);
    const versionFile = path.join(this.versionsDir, realVer, `${realVer}.json`);
    if (fs.existsSync(versionFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
        if (parsed && parsed.id === realVer) {
          return parsed;
        }
      } catch {}
    }

    const findEntry = (manifest: MojangVersionManifest) =>
      manifest.versions.find((v) => v.id === realVer)
      || manifest.versions.find((v) => v.id === versionId)
      || manifest.versions.find((v) => v.id.startsWith(versionId));

    let manifest = await this.getManifest();
    let entry = findEntry(manifest);

    if (!entry || !entry.url) {
      // The cached manifest may predate a freshly released version; refresh once before failing.
      manifest = await this.getManifest(true);
      entry = findEntry(manifest);
    }

    if (!entry || !entry.url) {
      throw new Error(`Minecraft version ${versionId} (${realVer}) not found in official manifest`);
    }

    const res = await fetch(entry.url);
    if (!res.ok) throw new Error(`Failed to download version metadata for ${realVer}`);
    const data = await res.json();

    const dir = path.join(this.versionsDir, realVer);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(versionFile, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  }

  public async getLoaderVersions(loader: string, gameVersion: string): Promise<any[]> {
    const realVer = this.resolveRealGameVersion(gameVersion);
    if (loader === 'fabric') {
      try {
        const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${realVer}`);
        if (res.ok) return (await res.json()) as any[];
      } catch {}
      try {
        const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader`);
        if (res.ok) return (await res.json()) as any[];
      } catch {}
      return [{ loader: { version: '0.19.5', stable: true } }];
    } else if (loader === 'quilt') {
      try {
        const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${realVer}`);
        if (res.ok) return (await res.json()) as any[];
      } catch {}
      return [{ loader: { version: '0.27.1', stable: true } }];
    }
    return [];
  }
}
