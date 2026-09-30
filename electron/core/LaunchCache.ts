import fs from 'fs';
import path from 'path';

/**
 * Helpers shared by the launch pipeline for reusing work between launches.
 *
 * Everything in here is intentionally dependency-free and side-effect-contained so it can be
 * exercised directly from `scripts/verify-launch-speed.js` without spawning a game.
 */

/** Name of the marker file written into an instance's `natives/` directory. */
export const NATIVES_MANIFEST = '.victus-natives.json';

/** How long a completed asset verification stays trusted before it is redone. */
export const ASSET_STAMP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** How long a cached Mojang version manifest stays fresh. */
export const MANIFEST_TTL_MS = 6 * 60 * 60 * 1000;

/** How long a cached loader (Fabric/Quilt) profile stays fresh. */
export const LOADER_PROFILE_TTL_MS = 24 * 60 * 60 * 1000;

export interface NativeArchiveSpec {
  filePath: string;
  excludes: string[];
}

export function ensureDir(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

export function readJsonFile<T = any>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(file: string, data: unknown): void {
  try {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify(data), 'utf-8');
  } catch {}
}

/** Reads a cached JSON document, returning it only while it is younger than `ttlMs`. */
export function readFreshCache<T = any>(file: string, ttlMs: number): T | null {
  const entry = readJsonFile<{ at: number; data: T }>(file);
  if (!entry || typeof entry.at !== 'number' || !('data' in entry)) return null;
  if (Date.now() - entry.at > ttlMs) return null;
  return entry.data;
}

/** Reads a cached JSON document regardless of age (used as an offline fallback). */
export function readAnyCache<T = any>(file: string): T | null {
  const entry = readJsonFile<{ at: number; data: T }>(file);
  if (!entry || !('data' in entry)) return null;
  return entry.data;
}

export function writeCache(file: string, data: unknown): void {
  writeJsonFile(file, { at: Date.now(), data });
}

// ---------------------------------------------------------------------------
// Natives directory reuse
// ---------------------------------------------------------------------------

/**
 * Identity of the native archives selected for one launch. If this string is unchanged the
 * previous extraction can be reused as-is: the archives, their contents and the target
 * architecture are all identical.
 */
export function nativesSignature(arch: string, archives: NativeArchiveSpec[]): string {
  const parts = (archives || []).map((a) => {
    let size = 0;
    let mtime = 0;
    try {
      const st = fs.statSync(a.filePath);
      size = st.size;
      mtime = Math.round(st.mtimeMs);
    } catch {}
    return [path.basename(a.filePath), size, mtime, (a.excludes || []).join(',')];
  });
  parts.sort((x, y) => String(x[0]).localeCompare(String(y[0])));
  return JSON.stringify({ arch, archives: parts });
}

/** Lists the extracted native libraries, ignoring the manifest marker itself. */
export function listNativeFiles(nativesDir: string): string[] {
  try {
    return fs
      .readdirSync(nativesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name !== NATIVES_MANIFEST)
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export function readNativesManifest(nativesDir: string): { signature: string; files: string[] } | null {
  return readJsonFile<{ signature: string; files: string[] }>(path.join(nativesDir, NATIVES_MANIFEST));
}

/**
 * True only when the directory contains exactly the files recorded for an identical signature.
 * An extra or missing file (for example a native from another Minecraft version) invalidates it.
 */
export function nativesDirIsValid(nativesDir: string, signature: string): boolean {
  const manifest = readNativesManifest(nativesDir);
  if (!manifest || manifest.signature !== signature || !Array.isArray(manifest.files)) return false;
  if (manifest.files.length === 0) return false;

  const actual = listNativeFiles(nativesDir);
  const expected = [...manifest.files].sort();
  if (actual.length !== expected.length) return false;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) return false;
  }
  return true;
}

/**
 * Records the files this launch actually extracted. The list is passed in rather than read back
 * from the directory on purpose: if a stale native cannot be deleted (a running instance holds a
 * lock on it), recording the directory contents would mark that pollution as valid forever.
 */
export function writeNativesManifest(nativesDir: string, signature: string, files: string[]): string[] {
  const recorded = [...new Set(files)].sort();
  writeJsonFile(path.join(nativesDir, NATIVES_MANIFEST), { signature, files: recorded });
  return recorded;
}

export function clearNativesDir(nativesDir: string): void {
  try {
    fs.rmSync(nativesDir, { recursive: true, force: true });
  } catch {}
  ensureDir(nativesDir);
}

// ---------------------------------------------------------------------------
// Asset verification stamps
// ---------------------------------------------------------------------------

export function assetStampFile(assetsDir: string, indexId: string): string {
  return path.join(assetsDir, 'indexes', `${indexId}.victus-verified.json`);
}

/**
 * True when this exact asset index was fully verified recently, so the per-object sweep over
 * several thousand hashes can be skipped.
 */
export function assetsAlreadyVerified(
  assetsDir: string,
  indexId: string,
  objectCount: number,
  ttlMs: number = ASSET_STAMP_TTL_MS
): boolean {
  if (!indexId || objectCount <= 0) return false;
  const stamp = readJsonFile<{ indexId: string; count: number; at: number }>(assetStampFile(assetsDir, indexId));
  if (!stamp) return false;
  if (stamp.indexId !== indexId || stamp.count !== objectCount) return false;
  if (typeof stamp.at !== 'number' || Date.now() - stamp.at > ttlMs) return false;
  return true;
}

export function writeAssetStamp(assetsDir: string, indexId: string, objectCount: number): void {
  if (!indexId) return;
  writeJsonFile(assetStampFile(assetsDir, indexId), { indexId, count: objectCount, at: Date.now() });
}

export function invalidateAssetStamp(assetsDir: string, indexId: string): void {
  try {
    fs.rmSync(assetStampFile(assetsDir, indexId), { force: true });
  } catch {}
}

/** Cheap spot check used before trusting a stamp: catches a deleted or emptied objects folder. */
export function sampleAssetsPresent(assetsDir: string, entries: [string, any][], samples = 48): boolean {
  const list = entries || [];
  if (list.length === 0) return true;
  const step = Math.max(1, Math.floor(list.length / samples));
  for (let i = 0; i < list.length; i += step) {
    const obj = list[i]?.[1];
    const hash = obj?.hash;
    if (!hash) continue;
    const dest = path.join(assetsDir, 'objects', hash.slice(0, 2), hash);
    try {
      if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Where the CDS archive for a given runtime lives. Keeping it in the launcher data dir means it
 * survives instance deletion and is shared by every instance on the same JVM.
 */
export function cdsArchivePath(cacheDir: string, key: string): string {
  return path.join(cacheDir, 'cds', `victus-${key}.jsa`);
}
