export const MINECRAFT_VERSIONS = [
  '26.4 Snapshot 1',
  '26.4',
  '26.3',
  '26.2',
  '26.1',
  '1.21.4',
  '1.21.1',
  '1.20.4',
  '1.20.1',
  '1.19.4',
  '1.18.2',
  '1.16.5',
  '1.12.2',
  '1.8.9',
] as const;

export type MinecraftVersion = (typeof MINECRAFT_VERSIONS)[number];

export const POPULAR_VERSIONS = [
  '26.4 Snapshot 1',
  '26.4',
  '26.3',
  '26.2',
  '26.1',
  '1.21.4',
  '1.20.4',
  '1.8.9',
];

export const DEFAULT_VERSION = '26.4 Snapshot 1';
