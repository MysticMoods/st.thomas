# Putting the site online

This is the operations manual for St. Thomas Church, Mangalassery. It is written
for whoever has to keep the site running, not for whoever wrote it.

---

## 1. The one constraint that decides everything

**The dashboard writes to disk.** Every edit saves a file under `content/`,
every upload lands in `public/uploads/`, and a copy of each section is kept in
`content/.backups/`.

That rules out the hosts most people reach for first:

| Host | Verdict |
| --- | --- |
| **Vercel** | ✗ Filesystem is read-only. Every save fails. |
| **Netlify** | ✗ Same. |
| **Cloudflare Pages** | ✗ Same, and no Node server. |
| **A small VPS** (Hetzner, DigitalOcean, Contabo, Linode) | ✓ **Recommended.** |
| **Railway / Render / Fly.io** with a persistent volume attached | ✓ Works, costs more, less control. |
| **Shared cPanel hosting with Node** | ~ Possible, usually painful. Node versions lag. |

### The recommendation

**A €4–6 / month VPS, 2 GB RAM, Ubuntu LTS.** The whole site — Node, content,
uploads, backups — fits inside a few hundred megabytes. Hetzner CX22 or a
DigitalOcean basic droplet are both more than enough, and either can be moved to
a bigger machine later without changing anything below.

If nobody in the parish is willing to look after a Linux box, take **Render with
a persistent disk** instead. It costs several times as much and gives you less,
but it patches itself.

---

## 2. Before the first deploy

```bash
cp .env.example .env.local
```

Then set, at minimum:

```bash
ADMIN_USERNAME=vicar
ADMIN_PASSWORD=<something long>
ADMIN_SESSION_SECRET=<32+ random characters>
```

Generate the secret properly — do not invent one by hand:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`.env.local` is git-ignored. **Never commit it.** If it ever reaches a
repository, change every value in it.

Neither of the first two has a usable default in production, on purpose. A
default password shipped in the repository is one the whole world knows, so a
live site with no `ADMIN_PASSWORD` set has no bootstrap login at all, and one
with no `ADMIN_SESSION_SECRET` signs its cookies with a random secret made at
boot — nobody can forge a session, and sign-ins last only until the next
restart. The dashboard's **System health** panel says so in both cases. In
development both still fall back to the demo values, so a fresh clone runs.

The dashboard's **System health** panel checks all of this and says so plainly
when something is still on its demo value.

### The first thing to do after signing in

Open **People & access** and make a real account. The first one becomes the
owner, and the shared `.env.local` login stops working the moment it exists.
Until then every change in the activity log is attributed to one shared name,
which defeats the point of having a log.

---

## 3. Ubuntu, start to finish

```bash
# 1 — Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git

# 2 — a user that is not root
sudo adduser --system --group --home /srv/parish parish
sudo -u parish git clone <your repo> /srv/parish/site
cd /srv/parish/site

# 3 — settings and build
sudo -u parish cp .env.example .env.local
sudo -u parish nano .env.local          # fill in the three values above
sudo -u parish npm ci
sudo -u parish npm run build
```

### Run it as a service

`/etc/systemd/system/parish.service`:

```ini
[Unit]
Description=St. Thomas Church, Mangalassery
After=network.target

[Service]
Type=simple
User=parish
Group=parish
WorkingDirectory=/srv/parish/site
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

# The site only ever needs to write to these two places.
ProtectSystem=strict
ReadWritePaths=/srv/parish/site/content /srv/parish/site/public/uploads /srv/parish/site/.next
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now parish
sudo systemctl status parish
```

### Put nginx in front

`/etc/nginx/sites-available/parish`:

```nginx
server {
    server_name your-domain.in www.your-domain.in;

    # Uploads can be large; the app caps them at 8 MB.
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;

        # Without these the rate limits and the activity log see every
        # visitor as the same address, which makes both useless.
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/parish /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.in -d www.your-domain.in
```

Certbot installs its own renewal timer. Nothing further to do.

### Letters out

Without a mail server the site still takes every message, request and gift — but
nobody hears back. No acknowledgement to the family, no notice to the office, no
donation receipt, no newsletter. Every unsent letter is kept and shown in the
dashboard under **Letters sent**, so nothing is lost, but nothing is delivered
either.

```bash
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USER=parish@your-domain.in
MAIL_PASS=<the mailbox password, or an app password>
MAIL_FROM=St. Thomas Church <parish@your-domain.in>
MAIL_OFFICE=office@your-domain.in
SITE_URL=https://your-domain.in
```

Any ordinary SMTP account works — the parish's own mail host, Zoho Mail, Google
Workspace, Brevo, Postmark. Two things decide whether the letters actually
arrive rather than landing in a junk folder:

1. **`MAIL_FROM` must be an address on your own domain.** Sending as
   `something@gmail.com` from your server is forgery as far as the receiving
   mail host is concerned, and it will be treated that way.
2. **Publish SPF and DKIM for that domain.** Your mail provider gives you the
   two DNS records; add them where the domain is managed. Without them a parish
   newsletter to four hundred people is a spam report waiting to happen.

`SITE_URL` is what the unsubscribe link in every newsletter points at. Get it
wrong and people cannot leave the list, which is both rude and, in most places,
against the law.

Press **Test the connection** in *Letters sent* after any change. It talks to
the mail server without sending anything to anybody.

---

## 4. Backups

The site keeps twenty copies of each content file in `content/.backups/`, and an
owner can restore any of them from **Backups & restore** in the dashboard. That
covers a bad edit. It does **not** cover the machine catching fire.

Take a copy off the box every night. `/etc/cron.daily/parish-backup`:

```bash
#!/bin/sh
set -e
STAMP=$(date +%F)
DEST=/var/backups/parish
mkdir -p "$DEST"
tar czf "$DEST/parish-$STAMP.tar.gz" \
    -C /srv/parish/site content public/uploads .env.local
# keep a fortnight locally
find "$DEST" -name 'parish-*.tar.gz' -mtime +14 -delete
# and send it somewhere else — this is the half that actually saves you
rsync -a "$DEST/parish-$STAMP.tar.gz" backup@elsewhere:/backups/parish/
```

```bash
sudo chmod +x /etc/cron.daily/parish-backup
```

**Test the restore once.** A backup nobody has ever restored is a rumour.

---

## 5. Watching it

### `/api/health`

Answers `200` while the site can read its content **and** write to disk, and
`503` the moment it cannot. Point a free monitor at it — UptimeRobot,
BetterStack, Healthchecks.io — checking every five minutes with alerts to a
phone that someone actually reads.

```json
{ "ok": true, "checks": { "content": true, "writable": true }, "uptimeSeconds": 84213 }
```

The `writable` check is the one that earns its keep. A full or read-only disk
leaves every page serving perfectly while every edit silently fails to save,
which is exactly the failure nobody notices for a fortnight.

Nothing in the response identifies the parish, so it is safe to leave open.

### In the dashboard

| Panel | What it is for |
| --- | --- |
| **System health** | Disk, settings still on demo values, what is stored, record counts |
| **Letters sent** | Every letter posted, whether it arrived, and a connection test |
| **Newsletter** | Write to the list; every letter carries an unsubscribe link |
| **Office Requests** | Mass intentions, certificates and prayer requests |
| **Replying** | Answer any of them by email or WhatsApp, from where you read it |
| **Problems** | Faults hit on the server and in visitors' browsers, newest first |
| **Activity log** | Who changed what, and when — including refused sign-ins |
| **Visits** | Page views and visits, counted by this site alone |
| **Backups & restore** | Read or put back any of the saved copies |
| **People & access** | Accounts and what each may do |

### On the machine

```bash
sudo journalctl -u parish -f          # live log
sudo journalctl -u parish --since today | grep -i error
df -h /srv                            # the disk that matters
```

---

## 6. Deploying a change

```bash
cd /srv/parish/site
sudo -u parish git pull
sudo -u parish npm ci
sudo -u parish npm run build
sudo systemctl restart parish
```

**Build before restarting, and restart after building.** Building while the old
process is still serving leaves it asking for stylesheet and chunk files the new
build no longer has: the browser gets a 400 and the page paints with no styles
at all. `npm run restart` does the whole dance in the right order in development.

Content edits made in the dashboard need none of this — they are live as soon as
they save.

---

## 7. Before announcing the site

- [ ] `.env.local` has a real password and a 32-character random session secret
- [ ] A real staff account exists; the shared `.env.local` login no longer works
- [ ] HTTPS is on and http redirects to it
- [ ] `/api/health` is being watched by something that can wake a person
- [ ] The nightly backup has run, and one has been restored as a test
- [ ] **System health** shows no warnings
- [ ] Mail is configured, SPF and DKIM are published, and a test letter arrived
- [ ] `SITE_URL` is right, so the unsubscribe link in newsletters works
- [ ] Razorpay keys are live keys, and the webhook points at `/api/donate/webhook`
- [ ] Dummy telephone numbers are gone from the content files
- [ ] The demo photographs have been replaced with real parish ones
- [ ] Someone other than the developer has signed in and made an edit
