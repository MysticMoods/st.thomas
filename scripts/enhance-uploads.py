#!/usr/bin/env python3
"""
Improve a photograph that is already on the site, in place.

Parish photographs arrive from a telephone, from WhatsApp, or as a screenshot
of something somebody sent. They are rarely bad pictures; they are usually
hazy, or flat, or a little dark, because that is what a phone camera does in
Kerala light at the wrong time of day. All of that can be corrected.

What cannot be corrected is resolution. A photograph 347 pixels across stays
347 pixels across: upscaling invents detail, it does not recover it, and the
invented sort looks worse than the honest blur. This script never resizes.

Nothing is replaced. Every file keeps its name, its format and its dimensions,
so every reference in content/*.json keeps working. The originals are copied to
content/.image-originals/ first, and `--revert` puts them back.

    python3 scripts/enhance-uploads.py --dry-run     # say what it would do
    python3 scripts/enhance-uploads.py               # do it
    python3 scripts/enhance-uploads.py --revert      # put the originals back
"""
import argparse
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageStat

UPLOADS = Path("public/uploads")
ORIGINALS = Path("content/.image-originals")

# How far the darkest and lightest parts may be pulled out. Half a percent at
# each end lifts haze without crushing anything to pure black or pure white.
CLIP = 0.5
TARGET_CONTRAST = 58.0

# The most a single colour channel may be moved relative to the others while
# straightening a cast. A phone that renders a white wall slightly blue is worth
# correcting; a photograph that is genuinely warm — a priest in red vestments, a
# sanctuary under tungsten light — is meant to be warm, and neutralising it
# would be a worse picture, not a better one.
MAX_CAST_SHIFT = 0.14

# Only a genuinely dark picture is lifted, and only a little. An earlier version
# of this script aimed the *average* brightness at a fixed number, which is
# wrong the moment a photograph is mostly bright on purpose: a white church
# against a bright sky reads as over-exposed by that measure, and "correcting"
# it turned a correctly exposed white building grey. The white point is set from
# the highlights instead, where white actually lives.
DARK = 100.0

def measure(im: Image.Image) -> dict:
    grey = im.convert("L")
    stat = ImageStat.Stat(grey)
    edges = grey.filter(ImageFilter.FIND_EDGES)
    return {
        "bright": stat.mean[0],
        "contrast": stat.stddev[0],
        "sharp": ImageStat.Stat(edges).stddev[0],
    }


def _ends(hist: list[int], clip: float) -> tuple[int, int]:
    """The value below which `clip`% of pixels sit, and above which `clip`% sit."""
    total = sum(hist)
    if total == 0:
        return 0, 255
    lo_target, hi_target = total * clip / 100, total * (1 - clip / 100)
    run, lo, hi = 0, 0, 255
    for value, count in enumerate(hist):
        run += count
        if run >= lo_target:
            lo = value
            break
    run = 0
    for value, count in enumerate(hist):
        run += count
        if run >= hi_target:
            hi = value
            break
    return lo, hi


def levels(im: Image.Image, clip: float = CLIP) -> tuple[Image.Image, bool]:
    """
    Put black back at black and white back at white, one channel at a time.

    A hazy photograph uses only the middle of the range: nothing is properly
    dark and nothing properly bright. Finding the true ends and stretching to
    them is what lifts the haze.

    Doing it per channel straightens a colour cast at the same time, because a
    white wall that photographed slightly blue has a blue channel reaching
    further than the red one, and pulling each to the same ends makes the wall
    white again. Left unchecked that would also drain a photograph that is
    meant to be warm, so each channel is allowed to move only so far from what
    the picture as a whole is doing.
    """
    channels = im.split()[:3]
    ends = [_ends(c.histogram(), clip) for c in channels]

    spans = [max(hi - lo, 1) for lo, hi in ends]
    mean_span = sum(spans) / len(spans)
    mean_lo = sum(lo for lo, _ in ends) / len(ends)

    if max(spans) < 16:
        return im, False

    out = []
    for channel, (lo, hi) in zip(channels, ends):
        span = max(hi - lo, 1)
        # Pull each channel only part of the way towards its own ends, so a
        # genuinely coloured scene keeps its colour.
        lo = lo + (mean_lo - lo) * (1 - MAX_CAST_SHIFT)
        span = span + (mean_span - span) * (1 - MAX_CAST_SHIFT)
        scale = 255.0 / span
        out.append(channel.point(lambda v, lo=lo, s=scale: max(0, min(255, int((v - lo) * s)))))

    return Image.merge("RGB", out), True


def enhance(path: Path) -> tuple[dict, dict, list[str]]:
    im = Image.open(path)
    fmt = im.format
    has_alpha = im.mode in ("RGBA", "LA", "P") and "transparency" in im.info
    im = im.convert("RGBA" if has_alpha else "RGB")

    before = measure(im)
    done: list[str] = []

    if has_alpha:
        alpha = im.getchannel("A")
        work = im.convert("RGB")
    else:
        alpha, work = None, im

    work, stretched = levels(work)
    if stretched:
        done.append("levels")

    # Only a genuinely dark photograph is lifted, and gently. Brightness is not
    # aimed at a number: the white point above has already put white where it
    # belongs, and a picture that is mostly bright on purpose must stay that way.
    now = measure(work)
    if now["bright"] < DARK:
        factor = min(1.22, DARK / max(now["bright"], 1))
        work = ImageEnhance.Brightness(work).enhance(factor)
        done.append(f"lifted x{factor:.2f}")

    now = measure(work)
    if now["contrast"] < TARGET_CONTRAST:
        factor = max(1.0, min(1.18, TARGET_CONTRAST / max(now["contrast"], 1)))
        if factor > 1.02:
            work = ImageEnhance.Contrast(work).enhance(factor)
            done.append(f"contrast x{factor:.2f}")

    # A hazy picture is a desaturated one. A small lift, only where it is flat.
    if before["contrast"] < 58:
        work = ImageEnhance.Color(work).enhance(1.08)
        done.append("colour x1.08")

    # Sharpening is the easiest thing to overdo, so it is scaled to how soft the
    # picture actually is and capped well short of crunchy.
    if before["sharp"] < 55:
        amount = int(max(40, min(95, (55 - before["sharp"]) * 2.6)))
        work = work.filter(ImageFilter.UnsharpMask(radius=1.1, percent=amount, threshold=3))
        done.append(f"sharpen {amount}%")

    if alpha is not None:
        work = work.convert("RGBA")
        work.putalpha(alpha)

    after = measure(work)
    if done:
        if fmt == "PNG":
            work.save(path, "PNG", optimize=True)
        else:
            work.save(path, "JPEG", quality=92, subsampling=0, optimize=True)
    return before, after, done


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="say what it would do")
    ap.add_argument("--revert", action="store_true", help="put the originals back")
    ap.add_argument("--only", nargs="*", help="file names to work on; default is all")
    args = ap.parse_args()

    if args.revert:
        for original in sorted(ORIGINALS.glob("*")):
            shutil.copy2(original, UPLOADS / original.name)
            print(f"  restored {original.name}")
        return 0

    files = sorted(p for p in UPLOADS.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    if args.only:
        wanted = set(args.only)
        files = [p for p in files if p.name in wanted]
    if not files:
        print("Nothing to do.")
        return 0

    ORIGINALS.mkdir(parents=True, exist_ok=True)
    print(f"{'file':<44}{'bright':>16}{'contrast':>16}{'sharp':>16}   what was done")
    for path in files:
        keep = ORIGINALS / path.name
        if not keep.exists():
            shutil.copy2(path, keep)

        if args.dry_run:
            im = Image.open(path).convert("RGB")
            b = measure(im)
            print(f"{path.name[:42]:<44}{b['bright']:>16.0f}{b['contrast']:>16.0f}{b['sharp']:>16.1f}   (dry run)")
            continue

        before, after, done = enhance(path)
        if not done:
            print(f"{path.name[:42]:<44}{'—':>16}{'—':>16}{'—':>16}   already good, left alone")
            continue
        moved = lambda key, fmt: f"{before[key]:{fmt}}\u2192{after[key]:{fmt}}"
        print(
            f"{path.name[:42]:<44}"
            f"{moved('bright', '.0f'):>16}"
            f"{moved('contrast', '.0f'):>16}"
            f"{moved('sharp', '.1f'):>16}   {', '.join(done)}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
