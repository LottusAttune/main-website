/**
 * Shared shapes for review mode — the annotation layer the client uses to leave
 * notes directly on the live site instead of sending screenshots.
 */

export type ReviewNote = {
  /** Client-side id, so a note can be de-duplicated when it syncs. */
  localId: string;
  path: string;
  selector: string;
  context: string;
  /** Human name for the section the note sits in, e.g. "Choose your path". */
  section: string;
  xPercent: number;
  yPercent: number;
  viewportW: number;
  note: string;
  createdAt: string;
  /** False until the server has confirmed it stored the note. An edit clears
   *  it again, so the change re-syncs. */
  sent: boolean;
};

export const REVIEW_STORAGE_KEY = 'lotus-review-notes';
export const REVIEW_SESSION_KEY = 'lotus-review-token';

/** Query parameter that turns review mode on: /?review=<token> */
export const REVIEW_PARAM = 'review';

/**
 * A stable-ish CSS path to an element.
 *
 * Prefers an id, then a stable-looking class, and otherwise walks up using
 * :nth-of-type. Hashed CSS-module class names are skipped — they change on
 * every build and would make a note untraceable a week later.
 */
export function cssPathFor(el: Element, maxDepth = 12): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;

  while (node && node.nodeType === 1 && node !== document.body && depth < maxDepth) {
    if (node.id) {
      parts.unshift(`#${node.id}`);
      break;
    }

    const tag = node.tagName.toLowerCase();
    const stable = Array.from(node.classList).find(
      // CSS modules emit `Component_class__hash`; the hash changes every build.
      (c) => !c.includes('__') && c.length < 30
    );

    if (stable) {
      parts.unshift(`${tag}.${stable}`);
    } else {
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === node!.tagName
        );
        const index = siblings.indexOf(node) + 1;
        parts.unshift(
          siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag
        );
      } else {
        parts.unshift(tag);
      }
    }

    node = node.parentElement;
    depth += 1;
  }

  // Root the path at <body> unless it starts from an id. A partial path like
  // "div > p" matches the first such element anywhere on the page, which is how
  // a pin ends up attached to something the client never clicked.
  if (parts.length === 0) return 'body';
  return parts[0].startsWith('#') ? parts.join(' > ') : `body > ${parts.join(' > ')}`;
}

/** A short snippet of what the element says, for human recognition. */
export function contextFor(el: Element): string {
  if (el instanceof HTMLImageElement) {
    // next/image rewrites src to /_next/image?url=…, so read the real file out.
    let file = el.currentSrc;
    try {
      const url = new URL(el.currentSrc, window.location.origin);
      file = url.searchParams.get('url') ?? url.pathname;
    } catch {
      // Keep the raw src.
    }
    const name = decodeURIComponent(file).split('/').pop() ?? file;
    return `[image] ${name}${el.alt ? ` — ${el.alt}` : ''}`;
  }
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.slice(0, 120);
}

/**
 * The nearest named region — the section's aria-label, its labelled heading, or
 * the closest heading above it. This is what turns "div > a.btn" into
 * "the Choose your path section", which is how a person describes a page.
 */
export function sectionFor(el: Element): string {
  const section = el.closest('section, header, footer, aside, main');
  if (!section) return '';

  const label = section.getAttribute('aria-label');
  if (label) return label;

  const labelledBy = section.getAttribute('aria-labelledby');
  if (labelledBy) {
    const heading = document.getElementById(labelledBy);
    if (heading?.textContent) {
      return heading.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
    }
  }

  const heading = section.querySelector('h1, h2, h3');
  if (heading?.textContent) {
    return heading.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  return section.tagName.toLowerCase();
}

/** Markdown export — this is what gets pasted back into the build. */
export function notesToMarkdown(notes: ReviewNote[]): string {
  if (notes.length === 0) return 'No feedback yet.';

  const byPath = new Map<string, ReviewNote[]>();
  for (const note of notes) {
    const list = byPath.get(note.path) ?? [];
    list.push(note);
    byPath.set(note.path, list);
  }

  const lines: string[] = ['# Lotus Attune — client feedback', ''];
  for (const [path, list] of byPath) {
    lines.push(`## ${path}`, '');
    list.forEach((n, i) => {
      lines.push(`${i + 1}. ${n.note}`);
      if (n.section) lines.push(`   - section: ${n.section}`);
      if (n.context) lines.push(`   - on screen: "${n.context}"`);
      lines.push(`   - element: \`${n.selector}\``);
      lines.push('');
    });
  }
  return lines.join('\n');
}
