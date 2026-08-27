# Lotus Attune — working notes for Claude

This is Silvana's live business website. Read this before changing anything.

Next.js 15 (App Router) · TypeScript · Supabase Postgres · deployed on Vercel.

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
