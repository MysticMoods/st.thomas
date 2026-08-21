# St. Thomas Church, Mangalassery

A bilingual (English / Malayalam) parish website — Next.js 15, React 19, TypeScript, Tailwind CSS
and Framer Motion, with a JSON content layer and a password-protected dashboard for parish staff.

The design is original. It takes its *atmosphere* from the great church websites — deep blue, gold
leaf, travertine, wide margins, serif display type, unhurried motion — but no layout, graphic,
logo, photograph or piece of copy is copied from any of them. The parish emblem is drawn in code
(`src/components/ui/ParishEmblem.tsx`).

---

## Running it

```bash
npm install
cp .env.example .env.local     # then edit all three values
npm run dev                    # http://localhost:3000
```

```bash
npm run build && npm start     # production
npm run typecheck              # tsc --noEmit
```

The dashboard lives at **`/admin`**. One host account signs in with a user ID and a password:

| Field | Demo value | Environment variable |
| --- | --- | --- |
| User ID | `vicar` | `ADMIN_USERNAME` |
| Password | set in `.env.local` | `ADMIN_PASSWORD` |

Both are read from `.env.local` at runtime; there is no user database and no sign-up route, so
those credentials are the only ones that work. The user ID is matched case-insensitively, the
password exactly. Change both — and `ADMIN_SESSION_SECRET` — before this goes anywhere public.

Once signed in, that account can edit everything on the site: phone numbers, email addresses,
hero banners, Mass timings, weekly and dated events, notices, the obituary column, priests, the
parish committee, ministries, donation funds and bank details, statistics, gallery photographs,
YouTube videos and PDF bulletins. It also shows every donation Razorpay has confirmed, with a
CSV export for the account book.

---

## How content works

Everything the parish publishes lives in `content/*.json`. Each piece of prose is a
`{ "en": "…", "ml": "…" }` pair, so the language switch in the header never needs a page reload
and never falls back to an untranslated string.

| File | What it drives |
| --- | --- |
| `site.json` | Hero images and text, contact details, office hours, social links, newsletter, SEO |
| `about.json` | History, mission, vision, patron saint, architecture, diocese, parish register, emblem |
| `mass.json` | Sunday, weekday, holy day, confession, adoration and special service timings |
| `events.json` | The seven-day parish calendar (today's column highlights itself) |
| `upcoming.json` | Dated events, and the welcome popup that announces the next three |
| `clergy.json` | Parish priest — photo, message, quote and contact details |
| `past-priests.json` | The animated timeline of former vicars |
| `stats.json` | The eight animated counters |
| `committee.json` | The parish committee — office bearers, ward members and their term |
| `ministries.json` | The ten parish ministries, each with its leader, team, events and history |
| `donation.json` | Giving: funds, suggested amounts, limits, bank and UPI details |
| `gallery.json` | Masonry gallery items and their categories |
| `notices.json` | Notice board: news, feasts, prayer requests, funerals, banns, catechism, youth |
| `obituaries.json` | The obituary column — deaths, funeral details and each memorial |
| `media.json` | YouTube videos and downloadable PDF bulletins |

`content/messages.json`, `content/subscribers.json` and `content/donations.json` are created at
runtime by the contact form, the newsletter and the donation flow. All three are git-ignored —
they hold people's addresses and their giving.

### Editing without touching JSON

`/admin` renders a form for every file above. It understands the shape of the data:

- bilingual fields appear as a side-by-side **English / മലയാളം** pair, and translate
  themselves — type an English notice, move to the next field, and the Malayalam box
  fills in automatically (and the other way round). A **Translate** button above each
  box re-runs it and overwrites what is there. Machine output is a draft: it stays
  editable and should be read before publishing;
- arrays become reorderable cards with add and remove;
- any field holding an image or PDF path gets a preview and an **Upload** button
  (files land in `public/uploads/`);
- a **JSON view** toggle is there for anyone who would rather edit the file directly.

Saving writes the file back to `content/` pretty-printed, so every edit stays reviewable in git.
The dashboard also has an inbox for contact-form messages and newsletter subscribers.

> On a serverless host (Vercel, Netlify) the filesystem is read-only at runtime, so dashboard saves
> will not persist. For that deployment model, run the site on a Node host with a persistent disk,
> or point `src/lib/content.ts` at a database or a headless CMS — it is the only module that
> touches the filesystem.

---

## Security

- The session cookie is an HMAC-SHA256 signed token: `httpOnly`, `sameSite=lax`, `secure` in
  production, expiring after eight hours.
- User ID and password are both compared with `crypto.timingSafeEqual`, and both are always
  checked even when the first is already wrong, so response time reveals nothing. A failure
  returns one message — never which half was incorrect.
- Sign-in is rate limited to five attempts per IP per fifteen minutes.
- `/admin` verifies the signature **server-side before rendering**, and every write endpoint
  re-checks it — there is no client-only guard.
- Uploads are limited to 8 MB and to JPG, PNG, WebP, AVIF and PDF.
- Saves carry the file fingerprint they were loaded from. If someone else saved that
  section first, the stale save is refused with a 409 instead of quietly overwriting
  their work.
- The previous version of every content file is copied to `content/.backups/`
  (twenty per section) before it is overwritten, and the new file is written to a
  temporary path and renamed into place, so a crash cannot leave broken JSON.
- Translation runs server-side behind the same session check.
- Content writes are restricted to the known content keys, so no path traversal is possible.
- Card and UPI details are typed into Razorpay's own hosted checkout; this server never sees
  them and stores only Razorpay's payment id. A donation is written to
  `content/donations.json` only after its signature is verified **and** the amount has been
  read back from Razorpay — the amount the browser claims is never trusted.
- Order creation is rate limited to ten attempts per IP per ten minutes, and the amount is
  checked against the limits in `content/donation.json`.
- The webhook rejects anything whose `x-razorpay-signature` does not match
  `RAZORPAY_WEBHOOK_SECRET`, and will not record a payment the browser has already recorded.
- `robots.txt` and the page metadata keep `/admin` and `/api` out of search engines.

---

## What is in the build

**Sections** — hero (parallax, cross-fading images), about, Mass timings, upcoming events,
weekly calendar, parish priest, parish committee, animated statistics, ministries (each opening
a detail panel), past-priests timeline, masonry gallery with a full-screen lightbox, latest video
and bulletins, giving, notice board, obituary column, members, newsletter, contact with map and
form, footer. A second route, `/obituary`, carries the full memorial archive.

**The welcome popup** — the next three dated events from `upcoming.json`, shown a moment after
the homepage settles. Dismissing it is remembered for the number of hours set in that file, so
nobody is shown it twice in a visit. Past events drop out of both the popup and the section on
their own; when nothing is upcoming, neither appears.

**Giving** — Razorpay checkout for card, UPI, net banking and wallets, over the funds listed in
`content/donation.json`. With `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` unset the checkout
button is switched off and the bank and UPI panel carries the section on its own, so the page is
never a dead end.

**Motion** — scroll reveals, hero parallax and slow zoom, four full-width parallax bands set
between sections (the photograph drifts against the page while the verse over it moves the other
way), animated counters, a timeline whose gold spine fills as you scroll, card hover lifts, image
zooms, glass surfaces, skeleton loading. Every one of them is disabled when the visitor has
`prefers-reduced-motion` set.

**Responsiveness** — one column on phones through to a seven-column parish calendar and a
1440 px container on large displays; the layout keeps working on a TV.

**Accessibility** — a skip link, landmark elements, labels on every control, `aria-pressed` and
`aria-expanded` on toggles, visible gold focus rings, `aria-live` form feedback, keyboard control
of the lightbox (`←` `→` `Esc`), and text held above WCAG AA contrast in both themes.

**SEO and PWA** — per-page metadata, Open Graph and Twitter cards, `PlaceOfWorship` JSON-LD,
`sitemap.xml`, `robots.txt`, a web manifest with shortcuts and maskable icons, and a service worker
that serves photographs cache-first and pages network-first (never `/api` or `/admin`).

**Performance** — AVIF/WebP through `next/image` with per-breakpoint sizes, lazy loading with
skeletons, a facade for the YouTube embed so no third-party script loads until you press play,
fonts with `display=swap`, immutable cache headers on `/images`.

---

## Photographs

Every photograph is CC0 public domain from [StockSnap.io](https://stocksnap.io) — free for
commercial use, no attribution required — and is listed on the `/credits` page. No Vatican
photography, logo or artwork is used anywhere.

```bash
python scripts/curate-images.py    # re-downloads and re-crops the whole set
```

The script holds the full slot → source mapping. To use real parish photography instead, drop a
file with the same name into `public/images/site/`, or upload it from the dashboard and point the
relevant `image` field at the new path. Aim for 2400 px on the long edge for hero images.

**The demo content is fictional.** The parish name, its history, the priests, the diocese of
Aloor, the statistics, notices and Malayalam translations were written for this demonstration.
Replace them before the site goes live.

---

## Layout

```
content/            bilingual JSON — the whole editable site
public/images/site/ 61 curated CC0 photographs
scripts/            image sourcing and curation
src/app/            routes: /, /admin, /privacy, /credits, /api/*
src/components/     one file per section, primitives under ui/
src/lib/            content loader, i18n, theme, auth, helpers
```
