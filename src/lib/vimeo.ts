import 'server-only';

type VimeoOEmbed = {
  thumbnail_url?: string;
};

/**
 * Vimeo's public oEmbed endpoint - no auth needed for a public video. The
 * Founder page is static, so this runs once at build time: a Vimeo outage
 * only risks the next deploy's build, never a page that's already live.
 */
export async function vimeoThumbnail(id: string): Promise<string | null> {
  try {
    const url = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
      `https://vimeo.com/${id}`
    )}&width=800`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as VimeoOEmbed;
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}
