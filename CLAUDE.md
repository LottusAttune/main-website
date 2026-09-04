# Lotus Attune — working notes for Claude

This is Silvana's live business website. Read this before changing anything.

Next.js 15 (App Router) · TypeScript · Supabase Postgres · deployed on Vercel.

---

## Mobile is paused — don't bring it up

Silvana has said this many times: mobile gets its own dedicated pass, as its
own stacked layout, done separately once the regular (desktop) site is
finished. Until she opens that pass herself:

- Don't make mobile-specific layout/CSS changes on your own initiative, even
  ones that look like an obvious bugfix.
- Don't mention mobile, screenshot mobile, or flag mobile-only issues in
  conversation, QA notes, or commit messages — not even as a courtesy aside.
- Work and review at desktop widths. If a shared style you're touching for a
  desktop change also happens to apply at mobile widths, that's fine — just
  don't go looking for, fixing, or commenting on mobile-only problems.

This has already been said many times. Don't ask about it again and don't
bring mobile up unprompted — hold to it silently until she raises mobile
herself.

---

## Before you start

```bash
npm install
npm run dev
```

Opens at <http://localhost:3080>. It runs with no database and no environment
variables, so you can always work locally.

Always finish a change with:

```bash
npm run build
```

If the build fails, the change is not done. Vercel runs the same build, and a
failing build means the live site keeps serving the previous version.

---

## The rules that matter

### 1. Her copy is verbatim

Every paragraph, benefit line, FAQ answer and review came from Silvana and was
approved in that exact form. **Do not reword, shorten, "improve" or restructure
her sentences.** If a line reads awkwardly, say so and ask — do not fix it
silently.

Spelling and grammar slips have already been corrected once (see the header of
`src/data/silvana.ts`). Anything beyond that is a content decision, not a
writing task.

Interface labels you may adjust freely: button text, section eyebrows, step
headings, form placeholders.

### 2. No AI-generated imagery. Ever.

An earlier design round used AI images. Silvana spotted them and asked for them
to be removed permanently. Every photograph on this site is hers.

If a section needs an image and no suitable photo exists, leave the space empty
and say so. Do not generate one, and do not substitute stock.

The same applies to faces in reviews: reviews show no avatar at all rather
than a stock portrait or a placeholder standing in for a real photo.

### 3. Images go through the pipeline

Never drop a file straight into `public/assets/`.

1. Put the original in `source-assets/`
2. Run `npm run optimize:images`

That writes compressed WebP into `public/assets/` and records the real
dimensions in `src/data/image-manifest.json`, so every image reserves its space
and the page does not jump while loading. Skipping it ships a 6MB photo to a
phone.

### 4. Never crop a face

Photographs of people are shown whole. Portraits fill their column at natural
proportion; card photos use a 4:5 box positioned at 35% because the faces in
these particular photos sit above centre.

If a layout change would crop someone's head, change the layout.

### 5. Design tokens, not hex codes

Colours, type sizes, spacing and easing all live in `src/styles/tokens.css`.
Use `var(--color-ink)`, not `#3b2e24`.

Two golds exist on purpose. `--color-gold` is decorative — rules, borders,
glows. `--color-gold-text` is the only one allowed to carry words, because the
decorative gold measures 3.1:1 on cream and fails accessibility contrast at the
small sizes the labels use.

Every text colour on the site currently passes WCAG AA. Keep it that way.

### 6. Visual QA — check these yourself, before she has to

Recurring issues that took multiple rounds to catch by eye on past changes.
Check them proactively on any layout/colour work, not just when asked, so they
don't ship in the first place:

- **Side margins.** Sections on a page share a `--width-content` +
  `--space-gutter` pattern (see e.g. `.intro`, `.block`, `.galleryBlock` in
  `experience.module.css`). If new markup uses the bare `.shell` class,
  confirm it also gets its own gutter padding like its neighbours — `.shell`
  alone only caps max-width, so without it the block runs wider than the
  rest of the page.
- **Contrast on any new text colour.** Before applying a colour to text on a
  dark or gradient background, compute contrast against *both ends* of the
  gradient (not just eyeballing) and confirm it clears 4.5:1 for body-sized
  text. Never use a semi-transparent colour (`rgba(...)` / `opacity`) for
  body text sitting on a background — use a solid colour or token instead.
  Alpha-blended text renders visibly softer/blurrier than solid text,
  especially obvious side-by-side with a solid counterpart. This check
  applies the moment you touch *any* background or colour in a component —
  grep that whole file for other `rgba(...)`/`opacity` text colours and fix
  them in the same pass, rather than only the one line you were asked to
  change. Don't wait to be told about the second one; the first occurrence
  is the signal to check the rest.
- **Two-sided or mirrored layouts.** When a design has a light/dark (or
  otherwise paired) side, keep font sizes, weights, italics and opacity
  symmetric between them unless there's a clear reason not to — check both
  sides side by side, not just the one you're actively editing. This
  includes internal hierarchy, not just the two sides against each other: if
  one side dims its body text below its headings (e.g. ink for headings,
  softer ink-body for paragraphs), the other side needs the same relative
  step, not just "some cream color" for everything. When in doubt, actually
  compute contrast for each role in the ratio on both sides (headings vs
  headings, body vs body) rather than eyeballing whether two different hex
  values "look similarly muted" — a solid color can pass WCAG AA on its own
  and still read as noticeably bolder/brighter than its counterpart if its
  contrast ratio is meaningfully higher.
- **Row alignment across split layouts.** When two columns need their rows
  to line up despite different copy lengths, use CSS Grid so each row sizes
  to its tallest cell (an explicit `grid-template-rows` if anything spans
  `grid-row: 1 / -1`) rather than fixed heights or eyeballing it.
- **Vertical rhythm.** A section should read in close to one screen without
  forcing a scroll for no reason, but shouldn't feel cramped either — compare
  new padding against neighbouring sections' actual values instead of
  picking numbers in isolation.
- **Equal CSS margins ≠ equal visual gaps.** Different font sizes/families
  carry very different amounts of built-in empty space above/below their
  visible glyphs (a big serif display font's line-box can hold 15-20px of
  invisible space a small sans-serif paragraph's doesn't) — matching two
  gaps' CSS margin values does not make them look equal if the elements on
  either side are different font sizes or families. When two gaps need to
  read as the same, measure the actual glyph-to-glyph (ink-to-ink) distance
  — e.g. via canvas `measureText` (`actualBoundingBoxAscent/Descent` for the
  specific text, `fontBoundingBoxAscent` for the line's baseline position)
  — not just the CSS box edges, and adjust the smaller-font side's margin
  down (or the larger side's up) until the measured ink gaps match. Measure
  the specific glyphs actually being compared, not a proxy for the whole
  string: `actualBoundingBoxAscent` on a multi-word line is set by its
  tallest character anywhere in that line (a capital elsewhere in the
  string), which overstates the ascent of a specific lowercase word the eye
  is actually keying off — measure that substring alone (or a plain
  x-height letter like "n") instead. Same for a wrapped multi-line
  paragraph: measuring the full un-wrapped string as one line does not
  represent the true last visual line - get the actual rendered line box
  first (e.g. `Range.getClientRects()`), then measure only that line's text.
- **Corners and one-off colours.** Match the page's already-established
  system (this site currently defaults to a 6px soft-square radius, with 0
  reserved for a couple of deliberately flat elements) rather than
  introducing a new radius or a new hex value without first checking whether
  an existing token already fits.
- **Verify visually, not just by reading the CSS.** Screenshot the actual
  rendered result — ideally at more than one breakpoint — before calling a
  layout change done. CSS that looks correct on paper (e.g. `grid-row: 1 /
  -1` without a `grid-template-rows` to anchor it) can silently fail.

---

## Where things are

```
src/app/                  pages (App Router)
  page.tsx                Home
  benefits/               Benefits
  experience/             The Experience
  included/               What is Included
  founder/                Founder
  offerings/              Offerings
  book/  gift/            booking and gift request forms
  lp/                     ad landing page (noindex)
  v1/                     earlier design, kept as a reference (noindex)
  studio/                 owner dashboard (password-gated)
  api/                    route handlers

src/components/silvana/   the chrome and sections for the main six pages
src/data/silvana.ts       all copy for those six pages
src/data/content.ts       reviews, FAQs, founder bio, shared strings
src/lib/                  pricing, settings, database, auth
src/styles/tokens.css     design tokens
db/schema.sql             database schema
source-assets/            original photography (not served)
public/assets/            optimised WebP (generated — do not hand-edit)
```

**Copy changes almost always mean editing `src/data/silvana.ts`,** not the page
files. The pages read from it.

`/v1` is a frozen copy of an earlier design, kept only so the two can be
compared. Do not spend effort on it, and do not let changes to the live pages
drag it along — if it ever gets in the way, delete it.

---

## Do not change without asking

- `src/lib/quote.ts` — pricing maths. The browser and the server both use it, so
  the price shown and the price stored cannot drift. Changing it changes what
  clients are charged.
- `src/lib/auth.ts` and `src/app/api/studio/route.ts` — the studio login and the
  single place every dashboard write is authorised. It fails closed by design.
- `db/schema.sql` — a change here needs a matching migration run in Supabase, or
  the live site breaks.
- Anything under `/studio` while Silvana has real bookings in it.

---

## How this reaches the live site

Work on `main`. This is the owner's own site and she works on it directly —
every push deploys straight to the live website.

That makes two habits non-negotiable:

**Build before you push.** `npm run build` must pass. A failing build means the
live site keeps serving the previous version, which is a silent failure from
her point of view.

**Commit in small, described steps.** One change per commit, with a message
that says what changed. That is what makes a mistake a thirty-second revert
instead of an afternoon.

If a change is large or risky, say so and offer to put it on a branch first
rather than assuming.

### Undoing something

```bash
git log --oneline -10        # find the change
git revert <commit>          # undo it, keeping the history
git push
```

`git revert` is the right tool here, not `reset` — it undoes the change without
rewriting history someone else may already have.

## Environment

The site works without any of these; they turn on the parts that need a server.

| Variable | What it does |
|---|---|
| `POSTGRES_URL` | Supabase connection. Without it, bookings are refused with a clear message rather than silently lost. |
| `STUDIO_PASSWORD` | Password for `/studio`. |
| `SESSION_SECRET` | Signs the studio session cookie. |
| `NEXT_PUBLIC_SITE_URL` | Production origin, for Open Graph images and the sitemap. |

Never commit real values. `.env.local` is gitignored; `.env.example` shows the
shape.

---

## Still open

Ask Silvana about these rather than guessing:

1. **Social handles** — footer links are placeholders (`/lotusattune`).
2. **Gift certificate maximum** — her notes said "up to 21", the rest of her
   material says 2–24. The site uses 24.
3. **Venue street address** — deliberately left out of the structured data until
   she confirms it should be public.
4. **Founder page portrait** (`/v1/founder`) — Silvana wants her name added
   somewhere on this section, but it's getting resized/reworked separately.
   Revisit name placement when that redesign happens, not before.

The landscape film (`src/data/content.ts`, `FILM.landscape`) was replaced with
her final cut. One standing caution stays relevant regardless of which video
ID is live: the frame shows a still until Vimeo confirms the player is
running, because Vimeo's Singapore edge was seen returning 400 for every
request — its own homepage included — so a whole region can be unable to
reach Vimeo while the video itself is perfectly healthy. Don't "fix" a video
that looks broken without checking from another network first.
