/**
 * Editing of Minecraft's `options.txt` for the opt-in performance preset.
 *
 * The preset is deliberately narrow: it only rewrites keys it knows about, keeps every other
 * line (including all key bindings) byte for byte, and preserves the file's line endings. A
 * partial or missing options.txt is handled by appending the keys, which Minecraft accepts.
 */

/** Keys lowered for framerate, with the exact literal Minecraft expects in options.txt. */
export const PERFORMANCE_PROFILE: Record<string, string> = {
  // Record the values as explicit rather than as one of the built-in presets.
  graphicsPreset: '"custom"',
  renderDistance: '6',
  simulationDistance: '6',
  entityDistanceScaling: '0.5',
  mipmapLevels: '0',
  biomeBlendRadius: '0',
  renderClouds: '"false"',
  cloudRange: '32',
  particles: '0',
  entityShadows: 'false',
  enableVsync: 'false',
  maxFps: '260',
};

export interface OptionsProfileResult {
  text: string;
  /** Keys that existed with a different value and were rewritten. */
  changed: string[];
  /** Keys that did not exist and were appended. */
  added: string[];
  /** Keys that already held the target value. */
  unchanged: string[];
}

const OPTION_LINE = /^([A-Za-z0-9_.-]+):(.*)$/;

/**
 * Returns a copy of `text` with the keys in `overrides` forced to their target values.
 * Never touches unlisted keys, comments or blank lines.
 */
export function applyOptionsProfile(
  text: string,
  overrides: Record<string, string> = PERFORMANCE_PROFILE
): OptionsProfileResult {
  const source = typeof text === 'string' ? text : '';
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const hadTrailingNewline = source.length === 0 || /\r?\n$/.test(source);

  const lines = source.length > 0 ? source.split(/\r?\n/) : [];
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const changed: string[] = [];
  const unchanged: string[] = [];
  const seen = new Set<string>();

  const rewritten = lines.map((line) => {
    const match = OPTION_LINE.exec(line);
    if (!match) return line;
    const key = match[1];
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) return line;

    seen.add(key);
    const target = overrides[key];
    if (match[2] === target) {
      unchanged.push(key);
      return line;
    }
    changed.push(key);
    return `${key}:${target}`;
  });

  const added = Object.keys(overrides).filter((key) => !seen.has(key));
  for (const key of added) {
    rewritten.push(`${key}:${overrides[key]}`);
  }

  const body = rewritten.join(eol);
  const out = hadTrailingNewline && body.length > 0 ? body + eol : body;

  return { text: out, changed, added, unchanged };
}
