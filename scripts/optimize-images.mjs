/**
 * Compresses the client's original photography into web-sized WebP.
 *
 * The originals live in `source-assets/` (gitignored — they are 89MB and several
 * are 6000px wide). This writes `public/assets/*.webp` at a sane width, which is
 * what the app actually references.
 *
 * Run once after adding or replacing an original:  npm run optimize:images
 */
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = 'source-assets';
const OUT_DIR = path.join('public', 'assets');

/**
 * Widths are set by how large each image actually renders.
 *
 * Full-bleed images cover the whole viewport, so they get 2400px to stay sharp
 * on a wide retina display. Everything else sits inside a card, a gallery stage
 * or a portrait column that never exceeds ~800 CSS px, so 1600px is already 2x.
 * Icons and logos never render above 300px.
 */
const MAX_WIDTH = 1600;
const BLEED_WIDTH = 2400;
const SMALL_WIDTH = 600;

/** Images used as a full-bleed background or a full-width gallery stage. */
const BLEED_ASSETS = new Set([
  'somatic-main',
  'silvana-hero',
  'silvana-handpan',
  'venue-signature',
  'venue-bar',
  'lounge-private',
]);

const SMALL_ASSETS = new Set([
  'icon-neuroscience',
  'icon-practice',
  'icon-reintegration',
  'icon-senses',
  'icon-sound',
  'logo-circle',
  'logo-lockup',
  'logo-wordmark',
]);

/** Icons and logos are line art on white and need alpha preserved losslessly. */
const NEEDS_ALPHA = new Set([
  'icon-neuroscience',
  'icon-practice',
  'icon-reintegration',
  'icon-senses',
  'icon-sound',
  'logo-circle',
  'logo-lockup',
  'logo-wordmark',
]);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await readdir(SOURCE_DIR)).filter((f) =>
    /\.(png|jpe?g)$/i.test(f)
  );

  if (files.length === 0) {
    console.error(`No source images found in ${SOURCE_DIR}/`);
    process.exitCode = 1;
    return;
  }

  const manifest = {};
  let savedBytes = 0;

  for (const file of files) {
    const name = path.parse(file).name;
    const sourcePath = path.join(SOURCE_DIR, file);
    const outPath = path.join(OUT_DIR, `${name}.webp`);

    const image = sharp(sourcePath);
    const meta = await image.metadata();
    const targetWidth = SMALL_ASSETS.has(name)
      ? SMALL_WIDTH
      : BLEED_ASSETS.has(name)
        ? BLEED_WIDTH
        : MAX_WIDTH;
    const width = Math.min(meta.width ?? targetWidth, targetWidth);

    await image
      .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
      .webp({
        // The client identified compression artefacts in an earlier round, so
        // these sit well above the usual web default. effort 6 buys the extra
        // quality back in file size rather than in fidelity.
        quality: NEEDS_ALPHA.has(name) ? 96 : 90,
        effort: 6,
        alphaQuality: 100,
        smartSubsample: true,
      })
      .toFile(outPath);

    const before = (await stat(sourcePath)).size;
    const after = (await stat(outPath)).size;
    savedBytes += before - after;

    const out = await sharp(outPath).metadata();
    manifest[name] = { width: out.width, height: out.height };

    console.log(
      `${name.padEnd(24)} ${fmt(before)} → ${fmt(after)}  ${out.width}×${out.height}`
    );
  }

  // Intrinsic dimensions, so every <Image> can declare width/height and never
  // shift the layout while loading.
  await writeFile(
    path.join('src', 'data', 'image-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  console.log(`\n${files.length} images · saved ${fmt(savedBytes)}`);
}

function fmt(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
