import fs from 'fs';
import path from 'path';

export class ModrinthManager {
  public async search(options: {
    query?: string;
    category?: string;
    loader?: string;
    gameVersion?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ hits: any[]; total_hits: number }> {
    const buildFacets = (includeLoader: boolean, includeVersion: boolean): string[][] => {
      const facets: string[][] = [];

      if (options.category) {
        let pType = options.category;
        if (pType === 'shaders') pType = 'shader';
        else if (pType === 'resourcepacks') pType = 'resourcepack';
        else if (pType === 'modpacks') pType = 'modpack';
        else if (pType === 'mods') pType = 'mod';
        else if (pType === 'datapacks') pType = 'datapack';
        facets.push([`project_type:${pType}`]);
      }

      // ONLY apply loader facet for mods or modpacks. Shaders, resourcepacks, and datapacks are loader-independent!
      if (
        includeLoader &&
        options.loader &&
        options.loader !== 'vanilla' &&
        (options.category === 'mods' || options.category === 'modpacks')
      ) {
        facets.push([`categories:${options.loader}`]);
      }

      // Version filter (resolve custom versions like 26.4/26.3 -> 1.21.4 for Modrinth)
      if (includeVersion && options.gameVersion) {
        const realVer = this.resolveRealVersion(options.gameVersion);
        if (realVer) {
          facets.push([`versions:${realVer}`]);
        }
      }

      return facets;
    };

    const doQuery = async (facets: string[][]) => {
      const params = new URLSearchParams({
        query: options.query || '',
        limit: String(options.limit || 24),
        offset: String(options.offset || 0),
        index: 'relevance',
      });

      if (facets.length > 0) {
        params.append('facets', JSON.stringify(facets));
      }

      try {
        const res = await fetch(`https://api.modrinth.com/v2/search?${params.toString()}`, {
          headers: { 'User-Agent': 'VictusClient/1.0.0 (contact@victusclient.net)' }
        });
        if (res.ok) return (await res.json()) as any;
      } catch (e) {
        console.error('Modrinth query error:', e);
      }
      return null;
    };

    try {
      // 1. Primary search with requested filters
      const primaryRes = await doQuery(buildFacets(true, true));
      if (primaryRes && primaryRes.hits && primaryRes.hits.length > 0) {
        return primaryRes;
      }

      // 2. Fallback: Relax game version filter if zero results (e.g. for custom/new versions)
      const relaxedVersionRes = await doQuery(buildFacets(true, false));
      if (relaxedVersionRes && relaxedVersionRes.hits && relaxedVersionRes.hits.length > 0) {
        return relaxedVersionRes;
      }

      // 3. Fallback: Relax loader filter as well if still empty
      const relaxedAllRes = await doQuery(buildFacets(false, false));
      if (relaxedAllRes && relaxedAllRes.hits && relaxedAllRes.hits.length > 0) {
        return relaxedAllRes;
      }
    } catch (e) {
      console.error('Modrinth search error:', e);
    }

    return { hits: [], total_hits: 0 };
  }

  public resolveRealVersion(version?: string): string | undefined {
    if (!version) return undefined;
    const v = version.trim();
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
    return v;
  }

  public async getVersions(idOrSlug: string, loaders?: string[], gameVersions?: string[]): Promise<any[]> {
    const params = new URLSearchParams();
    if (loaders && loaders.length > 0) {
      params.append('loaders', JSON.stringify(loaders.map((l) => l.toLowerCase())));
    }
    if (gameVersions && gameVersions.length > 0) {
      const mapped = Array.from(new Set(gameVersions.map((v) => this.resolveRealVersion(v) || v).filter(Boolean)));
      if (mapped.length > 0) {
        params.append('game_versions', JSON.stringify(mapped));
      }
    }

    try {
      const res = await fetch(`https://api.modrinth.com/v2/project/${idOrSlug}/version?${params.toString()}`, {
        headers: { 'User-Agent': 'VictusClient/1.0.0 (contact@victusclient.net)' },
      });
      if (res.ok) {
        const list = (await res.json()) as any[];
        if (list && list.length > 0) return list;
      }
    } catch (e) {
      console.error('Error fetching filtered Modrinth versions:', e);
    }
    return [];
  }

  public async installFile(options: {
    instanceDir: string;
    category: string;
    fileUrl: string;
    fileName: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      let subDir = 'mods';
      if (options.category === 'shaders') subDir = 'shaderpacks';
      else if (options.category === 'resourcepacks') subDir = 'resourcepacks';
      else if (options.category === 'datapacks') subDir = 'datapacks';

      const targetFolder = path.join(options.instanceDir, subDir);
      if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });

      const dest = path.join(targetFolder, options.fileName);
      const res = await fetch(options.fileUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} downloading content`);

      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public getInstalledFiles(instanceDir: string, category: string): any[] {
    let subDir = 'mods';
    if (category === 'shaders') subDir = 'shaderpacks';
    else if (category === 'resourcepacks') subDir = 'resourcepacks';
    else if (category === 'datapacks') subDir = 'datapacks';

    const targetFolder = path.join(instanceDir, subDir);
    if (!fs.existsSync(targetFolder)) return [];

    try {
      const files = fs.readdirSync(targetFolder);
      return files.map((fileName) => {
        const fullPath = path.join(targetFolder, fileName);
        const stat = fs.statSync(fullPath);
        const isEnabled = !fileName.endsWith('.disabled');
        const cleanName = fileName.replace(/\.disabled$/, '').replace(/\.jar$/, '').replace(/\.zip$/, '');

        return {
          fileName,
          name: cleanName,
          enabled: isEnabled,
          size: stat.size,
        };
      });
    } catch {
      return [];
    }
  }

  public toggleMod(instanceDir: string, fileName: string, enable: boolean): boolean {
    const targetFolder = path.join(instanceDir, 'mods');
    const oldPath = path.join(targetFolder, fileName);
    if (!fs.existsSync(oldPath)) return false;

    let newName = fileName;
    if (enable && fileName.endsWith('.disabled')) {
      newName = fileName.replace(/\.disabled$/, '');
    } else if (!enable && !fileName.endsWith('.disabled')) {
      newName = `${fileName}.disabled`;
    }

    fs.renameSync(oldPath, path.join(targetFolder, newName));
    return true;
  }

  public deleteFile(instanceDir: string, category: string, fileName: string): boolean {
    let subDir = 'mods';
    if (category === 'shaders') subDir = 'shaderpacks';
    else if (category === 'resourcepacks') subDir = 'resourcepacks';
    else if (category === 'datapacks') subDir = 'datapacks';

    const target = path.join(instanceDir, subDir, fileName);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
      return true;
    }
    return false;
  }
}
