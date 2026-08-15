# Lotus Attune

Marketing site, ad landing page and studio dashboard for Lotus Attune — a
two-hour guided sound-and-somatic experience in downtown Toronto.

Next.js 15 (App Router) · TypeScript · Vercel Postgres · deployed on Vercel.

---

## Running it

```bash
npm install
npm run dev
```

The site runs at <http://localhost:3080>.

It works with no database and no environment variables — pricing falls back to
the approved defaults and booking requests are refused with a clear message
rather than silently dropped. Everything below is what turns it live.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3080 |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run optimize:images` | Rebuild `public/assets` from `source-assets` |
| `npm run db:migrate` | Apply `db/schema.sql` to the linked Postgres store |

---

## Going live

### 1. Add a Postgres store

In the Vercel dashboard: **Storage → Create Database → Postgres**, and connect
it to this project. That sets `POSTGRES_URL` automatically.

Then apply the schema. Either paste `db/schema.sql` into the store's Query tab,
or run it locally:

```bash
vercel env pull .env.local
npm run db:migrate
```

The schema is idempotent — re-running it is safe.

### 2. Set the remaining environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production origin. Open Graph images and the sitemap need an absolute URL. |
| `STUDIO_PASSWORD` | Gates `/studio`. |
| `SESSION_SECRET` | Signs the studio session cookie. `openssl rand -base64 32` |
| `REVIEW_TOKEN` | Enables client review mode. Any hard-to-guess string. |
| `POSTGRES_URL` | Set for you when the store is linked. |

See `.env.example`. Without `STUDIO_PASSWORD` and `SESSION_SECRET` the studio
refuses all access rather than opening it — it fails closed.

### 3. Deploy

Push to `main`. Vercel builds and deploys.

---

## Routes

| Route | Notes |
|---|---|
| `/` | Home — hero parallax, film, reviews carousel, FAQ |
| `/experience` | The five components, benefits, gallery with lightbox |
| `/founder` | Bio, credential and training accordions |
| `/offerings` | Two offer blocks plus the session configurator |
| `/book` | Calendar, two-session logic, discount codes |
| `/gift` | Gift certificate calculator |
| `/lp` | Ad landing page. `noindex`, not in the nav. |
| `/studio` | Owner dashboard. Password-gated, `noindex`. |
| `/?review=<token>` | Client review mode — see below. Any page accepts it. |

`/lp` takes an `aud` query parameter — `?aud=individuals`, `?aud=corporate` —
which swaps the hero copy and reorders the offer cards, so separate ad sets can
point at the same page.

---

## How it fits together

### Pricing has one source of truth

`src/lib/quote.ts` is pure and shared. The configurator, the booking summary and
the server-side validation of a submitted request all call the same function, so
the number the client sees and the number the server stores cannot drift. The
server never trusts a total posted from the browser — it recomputes it, and only
honours a discount code that is currently active and group-eligible.

### Published settings flow one way

Silvana edits pricing, time slots, blocked dates, discount codes and the minimum
lead time in **Studio → Pricing & availability**, then presses *Publish to
website*. That writes to Postgres and revalidates `/offerings`, `/gift` and
`/book`. Those pages read through `getSettings()`, which falls back to the
approved defaults if no store is linked — the marketing site is never blocked on
infrastructure.

### The studio fails closed

Every mutation goes through a single route, `POST /api/studio`, so
authentication is enforced in exactly one place. Unauthenticated requests get
401 regardless of payload. The session cookie is HMAC-signed, `httpOnly` and
`SameSite=Lax`.

### Client review mode

Open any page as `/?review=<REVIEW_TOKEN>` and the site turns into something the
client can annotate directly: press **Add a note**, click anything on the page,
type what should change. A numbered pin stays where she put it.

Each note records the page, a CSS path to the element she clicked and the text
that was on screen there — so a note is traceable to a component rather than to
a coordinate on a screenshot. Pins are re-anchored to their element on every
load, so they stay correct at any window width.

Notes are written to `localStorage` the instant they are typed and only then
sent to the server. If the database is not connected, the network drops, or she
closes the tab, nothing is lost: **Copy** always produces the full markdown
brief. That brief is the artefact — paste it straight into Claude to make the
changes.

They arrive in **Studio → Client feedback**, grouped by page, with a *Copy as
brief* button that does the same thing.

The token is checked server-side and the endpoint fails closed: no
`REVIEW_TOKEN` set means no writes are accepted at all.

### Images

The client's original photography lives in `source-assets/` (89MB, several are
6000px wide). It is committed deliberately, so the repo is the single source of
truth and the masters cannot be lost — nothing in it is served to the browser.
`npm run optimize:images` writes `public/assets/*.webp` at quality 90 with
lanczos3 resampling: 2400px for full-bleed images, 1600px for everything inside
a card or gallery, 600px for icons and logos. Total shipped weight is 3.8MB.

It also writes `src/data/image-manifest.json` with intrinsic dimensions, so
every `<Image>` reserves its box and the page never shifts while photography
loads.

**No AI-generated imagery.** An earlier design round used generated images; the
client identified them and asked for them to be removed permanently. Every image
in `source-assets/` is hers.

### Copy is verbatim

`src/data/content.ts` holds every string the client wrote, approved in that exact
form — including her own spellings and punctuation ("cleared-minded" in the FAQ,
the curly quotes around her pull quote). **Do not reword any of it.** Interface
labels (button text, eyebrows, step headings) can be adjusted.

### Motion degrades safely

Scroll reveal is progressive enhancement: content is visible in CSS by default,
and `useScrollReveal` hides only the elements it is about to observe. If
JavaScript fails, motion is reduced, or the page loads in a background tab
(where `IntersectionObserver` is suspended), the page still reads — it just does
not animate.

---

## Still open

1. **Social handles** — the footer and landing links are placeholders
   (`/lotusattune`). Get the real ones from the client.
2. **Final horizontal film** — the client labelled the current landscape Vimeo
   ID "change for final". Both IDs are in `src/data/content.ts` under `FILM`.
3. **Reviews in the database** — the six approved reviews currently ship in
   `content.ts`. The `reviews` table and the studio panel are ready; seed them
   there to let Silvana publish and hide reviews herself.
4. **Payments** — Book and Gift both end at "Request", which the client
   confirmed is intended for now. Stripe Payment Links are the lightest route if
   that changes.
5. **Gift certificate maximum** — her notes said "more than 12 up to 21" while
   the rest of her material says 2–24. The site uses **24** throughout; confirm.
6. **Venue street address** — omitted from the LocalBusiness structured data
   until the client confirms it should be public.
