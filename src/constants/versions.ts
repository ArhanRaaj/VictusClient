export const MINECRAFT_VERSIONS = [
  '26.4',
  '26.3',
  '26.2',
  '26.1',
  '1.21.11',
  '1.21.8',
  '1.21.4',
  '1.21',
  '1.20.8',
  '1.20.4',
  '1.20',
  '1.8',
] as const;

export type MinecraftVersion = (typeof MINECRAFT_VERSIONS)[number];

export const POPULAR_VERSIONS = [
  '26.4',
  '26.3',
  '26.2',
  '26.1',
  '1.21.4',
  '1.20.4',
  '1.8',
];

export const DEFAULT_VERSION = '26.4';
