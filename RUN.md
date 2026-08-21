# How to run

Both sites are one Next.js app on one server. Start it once — the public site and
the dashboard are two routes on the same port.

| Site | URL |
| --- | --- |
| Public parish site | http://localhost:3000 |
| Parish dashboard | http://localhost:3000/admin |

Dashboard sign-in — the user ID and password in `.env.local`.

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

## The pages

| Page | What it is |
| --- | --- |
| `/` | The parish: notices, mass timings, the week, ministries, gallery, giving |
| `/hall` | The three parish halls — tariff, gallery, availability, booking, reviews |
| `/office` | Ask for a Mass, a certificate, or a prayer |
| `/obituary` | The obituary column, and a page for each person |
| `/calendar.ics` | The mass timetable and parish week, for a phone to subscribe to |
| `/admin` | The dashboard |

## Answering somebody

Every message in **Inbox**, every request in **Hall Bookings** and everything in
**Office Requests** has a **Reply** button under it.

- **Send email** posts it through the site. It needs the mail settings in
  `.env.local`; without them the words are kept and the panel says plainly that
  nothing was delivered.
- **WhatsApp** opens WhatsApp on your own phone or desktop with the answer
  already typed. You press send there, so it comes from the parish's number and
  the family can reply to it.

Either way the answer stays under the message, with your name against it.

## Running the site day to day

Signed in, the dashboard has a second group in the sidebar called **Running the
site**:

| Panel | What it answers |
| --- | --- |
| People & access | Who may sign in, and what each of them may do |
| Activity log | Who changed what, and when — refused sign-ins included |
| Backups & restore | Read or put back any of the twenty saved copies per section |
| Visits | How much the site is being read, counted by the site itself |
| Problems | Faults hit on the server and in visitors' browsers |
| System health | Disk, settings still on demo values, what is stored |
| Newsletter | Write to everybody who asked for parish news |
| Letters sent | Every letter posted, and whether it arrived |

**Make a real account the first time you sign in.** Until one exists everybody
shares the `.env.local` login, and the activity log cannot say who did what. The
first account made becomes the owner, and the shared login stops working the
moment it exists.

**Set up mail early.** Without `MAIL_HOST` and `MAIL_FROM` in `.env.local` the
site still takes every message, hall request and gift, but nobody hears back —
no acknowledgement, no notice to the office, no receipt, no newsletter. Nothing
is lost: every unsent letter is kept under *Letters sent*, and they go out once
the settings work.

For hosting, TLS, mail, the systemd unit, nightly backups and the launch
checklist, see [DEPLOY.md](DEPLOY.md).

## Is it alive?

```bash
curl -s localhost:3000/api/health
```

```json
{ "ok": true, "checks": { "content": true, "writable": true }, "uptimeSeconds": 84213 }
```

`200` while the site can read its content and write to disk, `503` the moment it
cannot. Point an uptime monitor at it — the `writable` check is the one that
earns its keep, because a full or read-only disk leaves every page serving
perfectly while every edit silently fails to save.

## Notes

- Uploaded photos and PDFs land in `public/uploads/`.
- `npm run build` is only needed after changing code, never after changing content.
