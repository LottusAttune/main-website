# Making changes to your website

Your site is live and you can change it yourself. This explains how.

**Your website:** https://main-website-x1jn.vercel.app

---

## Two ways to change things

### 1. The things you'll change often — no help needed

Go to **https://main-website-x1jn.vercel.app/studio** and sign in.

From there you can change, and it appears on the website straight away:

- **Prices** — private session, package of four, per-participant rate,
  team-building add-on, refreshments, deposit
- **Time slots** — turn the 7am, midday or evening session on or off
- **Blocked dates** — click any date to close it; the booking calendar greys
  it out immediately
- **Discount codes** — pause or activate them
- **How far ahead people can book** — currently five days

You'll also see every booking request, gift request and client here.

Change what you need, press **Publish to website**. That's it — no waiting on
anyone.

### 2. Everything else — ask Claude

Words on a page, photographs, adding a section, moving things around, colours.
For that you talk to Claude, and it makes the change for you.

---

## Setting up Claude (once, about ten minutes)

1. Go to **claude.ai** and sign in
2. Open **Claude Code** (in the sidebar, or go to **claude.ai/code**)
3. Choose **Connect GitHub**, and give it access to your repository:
   **LottusAttune/main-website**

That's the whole setup. No software to install.

Claude can now read your website's code, make changes, and show you the result
before anything goes live.

---

## How to ask for a change

Talk to it like you'd talk to a designer. You don't need technical words.

Good examples:

> On the Benefits page, change "Rest & Restore" to "Rest & Recover".

> The photo on the Founder page — use a different one of mine, the one with the
> crystal bowls.

> The Offerings page feels cramped. Give the two boxes more room to breathe.

> Add a fourth point under For Individuals, about sleep quality.

> The heading on What is Included is too big on my phone.

Two things worth saying at the start of any session, because they save time:

> Read CLAUDE.md first.

That file holds the rules for your site — it tells Claude not to reword your
copy, never to use AI-generated images, and how to handle photographs properly.

> Work on the silvana branch.

This is important. See below.

---

## Seeing a change before it goes live

Your site has two versions:

- **`main`** — the live website that everyone sees
- **`silvana`** — your working copy

When Claude works on the **silvana** branch, it produces a **preview link**: a
complete, working copy of the site with your change in it, that only you can
see. The live site is untouched.

Look at the preview. If it's right, tell Claude:

> This looks good, publish it.

If it isn't:

> Not quite — make the heading smaller and try again.

You can go back and forth as many times as you like. Nothing reaches the live
site until you say so.

**If you ever aren't sure whether something is live, ask:** "Is this on the live
site or just the preview?"

---

## A few things to leave alone

Claude knows these already, but so you know why if it pushes back:

- **Prices in the code** — change prices in the studio dashboard instead. The
  code works out totals in one place so the price someone sees and the price
  you're paid can never disagree.
- **The booking form's inner workings** — the studio is where you control it.
- **Anything asking for a password or a key** — if a change seems to need one,
  ask Nevin.

And one rule that's yours, written into the project so it can't be forgotten:
**no AI-generated images, ever.** If a spot needs a photo and none of yours
fits, Claude will tell you rather than invent one.

---

## New photographs

Send them to Claude and say where they go. It handles the rest — every image on
the site is compressed properly so your pages stay fast on a phone.

Originals are kept in the project, so nothing is lost.

---

## Four things to decide when you have a moment

These are waiting on you rather than on anyone else:

1. **Your social media links** — the footer icons currently point nowhere real.
   Send the actual Instagram, Facebook, LinkedIn and WhatsApp links.
2. **The main video** — you marked the current one "change for final". Send the
   replacement when it's ready.
3. **Gift certificates** — your notes said up to 21 people, the rest of your
   material says 2–24. The site uses 24.
4. **The venue address** — currently left off the site deliberately. Say if
   you'd like it shown.

---

## An earlier design

There's a second version of the site at
**https://main-website-x1jn.vercel.app/v1** — the first design, kept so you can
compare. It isn't part of your live site and search engines ignore it. It's
there purely if you ever want to look back.

---

## If something looks broken

1. Refresh the page properly first — **Cmd + Shift + R** on a Mac. Browsers
   hold on to old copies, and this is the cause more often than not.
2. If it's still wrong, tell Claude what you see: which page, what looks wrong,
   and what you expected.
3. If a change made it worse, you can always say: **"Undo that."**

Nothing you do here can permanently break the site. Every version is saved, and
anything can be put back.
