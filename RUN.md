# How to run

Both sites are one Next.js app on one server. Start it once — the public site and
the dashboard are two routes on the same port.

| Site | URL |
| --- | --- |
| Public parish site | http://localhost:3000 |
| Parish dashboard | http://localhost:3000/admin |

Dashboard sign-in — user ID `vicar`, password `mangalassery1893`.

---

## First time only

```bash
npm install
copy .env.example .env.local
```

(`cp .env.example .env.local` on macOS/Linux. Edit it and change all three values
before this site goes public.)

---

## Every day — development

Live reload, edits show instantly.

```bash
npm run dev
```

Then open http://localhost:3000 and http://localhost:3000/admin

---

## Production — what the parish actually runs

```bash
npm run build
npm start
```

Same two URLs. Faster, images optimised, service worker active.

### Changing code while the site is running

Use one command:

```bash
npm run restart
```

It stops the server, clears `.next`, rebuilds and starts again.

Running `npm run build` **while `npm start` is still running** is the one way to
break the site without touching the code: the fresh HTML asks for a stylesheet
the running process no longer has, the browser gets a 400, and the page paints
with no styles at all — dark blocks, oversized images, the light/dark theme
apparently stuck. If you ever see that, `npm run restart` puts it right.

---

## Other commands

```bash
npm run typecheck    # TypeScript check, no build
npm run test:e2e     # 22 browser checks — server must already be running
npm run images       # re-download and re-crop the CC0 photographs (needs Python)
```

---

## Port 3000 already in use

```bash
npm run dev -- -p 3001      # development on another port
npm start -- -p 3001        # production on another port
```

To free port 3000 instead, on Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## Do dashboard edits survive a restart?

Yes. Saves are written straight to disk, not held in memory:

| What you change | Where it is written | Survives reload | Survives server restart | Survives rebuild |
| --- | --- | --- | --- | --- |
| Any text, timing, notice, phone number | `content/*.json` | yes | yes | yes |
| Uploaded photo or PDF | `public/uploads/` | yes | yes | yes |
| Contact messages, newsletter sign-ups | `content/messages.json`, `content/subscribers.json` | yes | yes | yes |

The homepage re-reads `content/` on every request, so a save shows on the public
site the moment you press **Save changes** — no rebuild, no waiting.

The previous version of every file is copied to `content/.backups/` before it is
overwritten, twenty versions per section. To undo a bad edit, copy the file you
want back over the one in `content/`.

**Two ways to lose changes — avoid both:**

1. Deleting or overwriting the `content/` and `public/uploads/` folders. A deploy
   that wipes the working tree will take the edits with it. Keep both on a
   persistent disk, or commit `content/` to git after big edits.
2. Hosting on Vercel or Netlify. Their runtime filesystem is read-only, so saves
   fail there. Use a Node host with a real disk (a VPS, Render, Railway, Fly.io,
   or the parish's own server).

---

## Writing in one language only

Type the English, press Tab, and the Malayalam box fills itself in — and the same
in reverse. The **Translate** button above either box re-runs it and replaces what
is already there. It is machine translation, so read it before saving; both boxes
stay fully editable.

If the translation service is unreachable the field says so and you can type the
other language by hand. Nothing blocks the save.

---

## Notes

- Uploaded photos and PDFs land in `public/uploads/`.
- `npm run build` is only needed after changing code, never after changing content.
