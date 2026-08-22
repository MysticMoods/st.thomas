#!/bin/sh
# A copy of everything the parish cannot lose, taken off the box.
#
# The dashboard already keeps twenty copies of each content file, which covers a
# bad edit. It does not cover the machine catching fire. This does.
#
# Install it on the server:
#
#   sudo ln -s /srv/parish/site/scripts/backup.sh /etc/cron.daily/parish-backup
#
# and set OFFSITE to somewhere that is not this machine. Without it the copies
# still pile up locally, which is better than nothing and worse than enough.
set -eu

SITE="${SITE:-/srv/parish/site}"
DEST="${DEST:-/var/backups/parish}"
KEEP_DAYS="${KEEP_DAYS:-14}"
# e.g. OFFSITE="parish-backup:parish" for rclone, or a user@host:path for scp
OFFSITE="${OFFSITE:-}"

STAMP=$(date +%F)
ARCHIVE="$DEST/parish-$STAMP.tar.gz"

mkdir -p "$DEST"

# content: everything the dashboard writes. uploads: the photographs and
# bulletins. .env.local: the settings, without which a restored copy will not
# start. Everything else is in git.
tar czf "$ARCHIVE" -C "$SITE" content public/uploads .env.local

find "$DEST" -name 'parish-*.tar.gz' -mtime "+$KEEP_DAYS" -delete

if [ -n "$OFFSITE" ]; then
  if command -v rclone > /dev/null 2>&1 && printf '%s' "$OFFSITE" | grep -q ':'; then
    rclone copy "$ARCHIVE" "$OFFSITE"
  else
    scp "$ARCHIVE" "$OFFSITE"
  fi
else
  echo "backup.sh: OFFSITE is not set — the only copy is on this machine" >&2
fi

echo "backed up to $ARCHIVE"
