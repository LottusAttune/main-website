import manifest from '@/data/image-manifest.json';

export type AssetName = keyof typeof manifest;

/**
 * Resolves a client asset to its path and intrinsic size.
 *
 * Every image ships with real dimensions so `next/image` can reserve the box and
 * the page never shifts while photography loads.
 */
export function asset(name: AssetName) {
  const size = manifest[name];
  if (!size) {
    throw new Error(`Unknown asset "${name}" — run npm run optimize:images`);
  }
  return {
    src: `/assets/${name}.webp`,
    width: size.width,
    height: size.height,
  };
}

/** CSS `url(...)` value, for background-image washes. */
export function assetUrl(name: AssetName): string {
  return `url('/assets/${name}.webp')`;
}
