"""
Builds the site's slots from the parish's own photographs.

    python scripts/parish-photos.py

The sources are the edited masters in church/edited/ — the parish's photographs
with the overhead wires taken out and the colour finished. This only cuts them
to the size each slot needs, so a slot can be re-framed without touching the
photograph again.

A slot listed here belongs to the parish: scripts/curate-images.py leaves it
alone, so refreshing the stock photographs never puts a stock church back over
the real one.
"""

import json
import os

import sys

from PIL import Image, ImageFilter, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import house_look  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "church", "edited")
DST = os.path.join(ROOT, "public", "images", "site")
CREDITS = os.path.join(ROOT, "public", "images", "credits.json")

HERO = (2400, 1350)  # 16:9 – the homepage banner, full screen
WIDE = (1440, 810)   # 16:9 – section banners
CARD = (1200, 800)   # 3:2  – cards, gallery
GWIDE = (1600, 1000)  # 16:10 – gallery, wide
GTALL = (900, 1200)   # 3:4   – gallery, tall
GNORM = (1200, 900)   # 4:3   – gallery, normal
HERO43 = (2400, 1800)  # 4:3 – a banner photograph with height to spare; the page covers it to the screen
CHAPEL = (1040, 1300)  # 4:5 – a chapel card
BAND = (2400, 960)    # 5:2   – the parallax bands: the image box is 140% of the band and zoomed, so only its middle ~60% shows; keep the subject there

# The masters are straightened and cleaned of wires, but not colour-graded;
# their tone is the camera's own. 1.0 leaves them as they are.
EXPOSURE = 1.0  # gamma; below 1 brightens

# The straightened front: the church's axis (the cross) at the middle.
FRONT = (0.035, 0.0, 1.0, 1.0)   # cross at 51.75% of the width -> centred

# slot -> (master, size, framing)
#   framing is either a vertical focus (0 top .. 1 bottom) for a centred crop,
#   or a box (left, top, right, bottom) as fractions of the master, optionally
#   with a vertical focus as a fifth value for what is cut from within it.
PLAN = {
    # the homepage banner
    "church-front":    ("asis:user-church.jpg", HERO, 0.5),
    "nave":            ("asis:user-int.jpg", HERO, 0.55),
    "altar":           ("asis:user-int2.jpg", HERO, 0.5),
    # the slots every page already points at
    "church-exterior": ("asis:user-church.jpg", CARD, 0.5),
    "hero-nave":       ("asis:user-int.jpg", WIDE, 0.55),
    "hero-pews":       ("interior-0401.jpg", WIDE, 0.50),
    "hero-vault":      ("interior-0411.jpg", WIDE, 0.50),
    "interior-feast":  ("interior-0405.jpg", WIDE, 0.55),
    "facade":          ("exterior-walkway.jpg", CARD, 0.20),
    "steeple":         ("exterior-front.jpg", CARD, (0.155, 0.0, 0.880, 0.62)),
    "doorway-light":   ("exterior-front.jpg", CARD, (0.30, 0.60, 0.735, 0.97)),
    # the gallery — two of them are stills from the drone's flight up the aisle
    "gallery-aisle":     ("drone-aisle.jpg", GWIDE, (0.146, 0.0, 1.0, 1.0, 0.5)),
    "gallery-sanctuary": ("interior-0414.jpg", GTALL, 0.5),
    "gallery-altar":     ("interior-0404.jpg", GNORM, 0.5),
    "gallery-walkway":   ("exterior-walkway.jpg", GTALL, 0.5),
    "gallery-pews":      ("interior-0402.jpg", GTALL, 0.55),
    # the five chapels of the parish, one upright card each (4:5)
    # As photographed: "raw:" reads the original file and only crops and sizes it —
    # no retouching, no grade, no sharpening. The edited masters are still in
    # church/edited/chapel-*.jpg; point these back at them to use them.
    "chapel-velankanni": ("asis:user-chapel-c1.jpg", GNORM, 0.5),
    "chapel-grotto":     ("asis:user-chapel-c2.jpg", GNORM, 0.5),
    "chapel-gethsemane": ("asis:user-chapel-c3.jpg", GNORM, 0.5),
    "chapel-our-lady":   ("asis:user-chapel-c4.jpg", GNORM, 0.5),
    "chapel-jai-jesus":  ("asis:user-chapel-c5.jpg", GNORM, 0.5),
    # the bands between homepage sections — each a photograph used nowhere
    # else on that page, so the church is never shown twice in one scroll
    "band-cross":        ("exterior-c9.jpg", BAND, (0.0, 0.065, 1.0, 0.365)),
    "band-aisle":        ("drone-nave.jpg", BAND, 0.45),
}

CREDIT = {
    "source": "St. Thomas Church, Mangalassery",
    "license": "The parish's own photograph",
    "origin": "",
}


def build(master, size, framing):
    # "asis:" — a master the parish graded itself: crop and size only, no house look
    asis = master.startswith("asis:")
    if asis:
        master = master[5:]
    raw = master.startswith("raw:")
    if raw:
        import pillow_heif  # only needed for the phone's HEIC originals
        pillow_heif.register_heif_opener()
        im = ImageOps.exif_transpose(Image.open(os.path.join(ROOT, master[4:]))).convert("RGB")
    else:
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, master))).convert("RGB")
    if isinstance(framing, tuple):
        l, t, r, b, *focus = framing
        im = im.crop((int(l * im.width), int(t * im.height), int(r * im.width), int(b * im.height)))
        out = ImageOps.fit(im, size, method=Image.LANCZOS, centering=(0.5, focus[0] if focus else 0.5))
    else:
        out = ImageOps.fit(im, size, method=Image.LANCZOS, centering=(0.5, framing))
    # One look for every photograph on the site — see scripts/house_look.py.
    return out if asis else house_look.grade(out)
    out = out.point([round(255 * (i / 255) ** EXPOSURE) for i in range(256)] * 3)
    # Downsizing softens; give back a little crispness, gently.
    return out.filter(ImageFilter.UnsharpMask(radius=1.1, percent=55, threshold=2))


def main():
    os.makedirs(DST, exist_ok=True)
    for slot, (master, size, framing) in PLAN.items():
        out = build(master, size, framing)
        out.save(os.path.join(DST, slot + ".jpg"), quality=84, optimize=True, progressive=True)
        print(f"{slot:16} <- {master}  {size[0]}x{size[1]}")

    # Credit them as the parish's, in place of whatever stock entry was there.
    try:
        with open(CREDITS, encoding="utf-8") as fh:
            credits = json.load(fh)
    except FileNotFoundError:
        credits = []
    files = {f"/images/site/{slot}.jpg" for slot in PLAN}
    credits = [c for c in credits if c.get("file") not in files]
    credits += [{"file": f"/images/site/{slot}.jpg", **CREDIT} for slot in PLAN]
    with open(CREDITS, "w", encoding="utf-8") as fh:
        json.dump(credits, fh, indent=2)


if __name__ == "__main__":
    main()
