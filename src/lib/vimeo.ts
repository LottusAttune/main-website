import 'server-only';

type VimeoOEmbed = {
  width?: number;
  height?: number;
};

/**
 * Vimeo's public oEmbed endpoint - no auth needed for a public video. The
 * Founder page is static, so this runs once at build time. Falls back to
 * a 16:9 guess if the fetch fails, so a Vimeo outage at build time never
 * breaks the page - it just risks one video's box being the wrong shape
 * until the next successful build.
 */
export async function vimeoAspectRatio(id: string): Promise<string> {
  try {
    const url = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
      `https://vimeo.com/${id}`
    )}`;
    const res = await fetch(url);
    if (!res.ok) return '16 / 9';
    const data = (await res.json()) as VimeoOEmbed;
    if (!data.width || !data.height) return '16 / 9';
    return `${data.width} / ${data.height}`;
  } catch {
    return '16 / 9';
  }
}
