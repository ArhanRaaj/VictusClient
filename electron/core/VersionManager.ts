import fs from 'fs';
import path from 'path';

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

  constructor(dataDir: string) {
    this.versionsDir = path.join(dataDir, 'versions');
    this.manifestCacheFile = path.join(dataDir, 'version_manifest_v2.json');
    if (!fs.existsSync(this.versionsDir)) {
      fs.mkdirSync(this.versionsDir, { recursive: true });
    }
  }

  public async getManifest(): Promise<MojangVersionManifest> {
    try {
      const res = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
      if (res.ok) {
        const manifest: MojangVersionManifest = (await res.json()) as MojangVersionManifest;
        fs.writeFileSync(this.manifestCacheFile, JSON.stringify(manifest), 'utf-8');
        return manifest;
      }
    } catch {}

    if (fs.existsSync(this.manifestCacheFile)) {
      return JSON.parse(fs.readFileSync(this.manifestCacheFile, 'utf-8'));
    }

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

  public async getVersionJson(versionId: string): Promise<any> {
    const versionFile = path.join(this.versionsDir, versionId, `${versionId}.json`);
    if (fs.existsSync(versionFile)) {
      return JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
    }

    const manifest = await this.getManifest();
    const entry = manifest.versions.find((v) => v.id === versionId);
    if (!entry || !entry.url) {
      throw new Error(`Minecraft version ${versionId} not found in official manifest`);
    }

    const res = await fetch(entry.url);
    if (!res.ok) throw new Error(`Failed to download version metadata for ${versionId}`);
    const data = await res.json();

    const dir = path.join(this.versionsDir, versionId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(versionFile, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  }

  public async getLoaderVersions(loader: string, gameVersion: string): Promise<any[]> {
    if (loader === 'fabric') {
      try {
        const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${gameVersion}`);
        if (res.ok) return (await res.json()) as any[];
      } catch {}
      return [{ loader: { version: '0.16.9', stable: true } }];
    } else if (loader === 'quilt') {
      try {
        const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${gameVersion}`);
        if (res.ok) return (await res.json()) as any[];
      } catch {}
      return [{ loader: { version: '0.27.1', stable: true } }];
    }
    return [];
  }
}
