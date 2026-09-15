"""
Builds the site's final image set (public/images/site/*.jpg) from StockSnap.io.

Every source photo is CC0 (public domain, free for commercial use, no attribution
required). Missing sources are downloaded automatically, cropped to the geometry
each slot needs, and written out as optimised progressive JPEGs.

    python scripts/curate-images.py

To swap in real parish photography, either drop a file with the same name into
public/images/site/ or edit the `image` field in the relevant content/*.json.
"""

import json
import os
import shutil
import urllib.request

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, "public", "images")
POOL = os.path.join(IMAGES, "_pool")
DST = os.path.join(IMAGES, "site")
CDN = "https://cdn.stocksnap.io/img-thumbs/960w/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

WIDE = (1440, 810)   # 16:9 – heroes, banners
CARD = (1200, 800)   # 3:2  – cards, gallery
TALL = (900, 1125)   # 4:5  – clergy portraits

# slot -> (stocksnap id, geometry, vertical focus 0 = top .. 1 = bottom)
PLAN = {
    # architecture ---------------------------------------------------------
    "hero-nave":          ("architecture-building_57KRVGK2H9", WIDE, 0.50),
    "hero-pews":          ("wood-bench_R44UK4WLHX", WIDE, 0.50),
    "hero-vault":         ("architecture-building_VC3Z71TX2R", WIDE, 0.45),
    "church-exterior":    ("church-building_1BTKPBVREM", WIDE, 0.45),
    "steeple":            ("steeple-sky_208HLOPHHS", CARD, 0.45),
    "old-church":         ("architecture-building_5RQ89XH8Q8", CARD, 0.50),
    "doorway-light":      ("architecture-building_B2IEY5FUIB", CARD, 0.50),
    "glass":              ("architecture-buildings_7M5RIQMQDM", CARD, 0.50),
    "wooden-church":      ("architecture-church_KABEU60DEX", CARD, 0.50),
    "tower":              ("church-tower_DEAEC23ZVO", CARD, 0.40),
    "facade":             ("church-architecture_IEXCLPXH3L", CARD, 0.45),
    "arch-stone":         ("arch-stone_CJ2YHAKHQ9", CARD, 0.50),
    # devotion -------------------------------------------------------------
    "bible":              ("home-things_ULZQIK7MMB", CARD, 0.50),
    "wheat-hands":        ("bible-photographer_DWBMYNEHQY", CARD, 0.50),
    "candles-cross":      ("candles-table_EQNZNTPSFI", CARD, 0.50),
    "votive":             ("church-chapel_5Q0IQEVLFP", CARD, 0.50),
    "interior-feast":     ("church-interior_NLKKBIH0J3", WIDE, 0.50),
    "rosary":             ("wall-rosary_2C4R1N9ZJJ", CARD, 0.50),
    "congregation":       ("people-group_3YIGT9WHKT", WIDE, 0.50),
    "statue":             ("marble-statue_K37LO7EQ3D", CARD, 0.45),
    "lantern":            ("lamp-candle_6ZVUC47BCJ", CARD, 0.50),
    "prayer-child":       ("cross-holy_5XBUUUWBFO", CARD, 0.45),
    "prayer-girl":        ("people-girl_1JTY49M2SI", CARD, 0.40),
    "bible-reading":      ("man-reading_BFZPHPSTAH", CARD, 0.50),
    "rustic-candle":      ("rustic-candle_DO24ELQINR", CARD, 0.50),
    "candle-quiet":       ("candle-room_H9O0VTTYGQ", CARD, 0.50),
    # seasons --------------------------------------------------------------
    "christmas-lights":   ("christmaslights-christmas_AOGJEO6SXB", CARD, 0.50),
    "christmas-tree":     ("christmas-xmas_EI32JIXJ7Q", CARD, 0.50),
    "christmas-garland":  ("christmas-garland_RFRZRPQQAI", CARD, 0.50),
    "christmas-star":     ("christmas-metal_2FT6KCGMKZ", CARD, 0.50),
    "winter-dawn":        ("winter-mountain_ZHUYL3WSZV", CARD, 0.50),
    # parish life ----------------------------------------------------------
    "choir-piano":        ("piano-music_DDLS80OTCE", CARD, 0.50),
    "choir-sheet":        ("sheetmusic-vintage_XCB7KI7WSD", CARD, 0.50),
    "choir-strings":      ("bass-musician_WDDHR0QSSG", CARD, 0.50),
    "youth-group":        ("people-discussion_V7QBUSASPI", CARD, 0.45),
    "youth-outing":       ("friends-hiking_WQE4AZ2BPU", CARD, 0.45),
    "catechism-reading":  ("kids-father_NFZION4R4G", CARD, 0.50),
    "catechism-children": ("sisters-children_C3JWZLBWXS", CARD, 0.45),
    "catechism-notes":    ("notebook-writing_TNXFPX1WIM", CARD, 0.50),
    "bible-study":        ("open-books_HECYA5SP1L", CARD, 0.50),
    "charity-hands":      ("oldman-feeding_QUDBI9AWRN", CARD, 0.50),
    "community-family":   ("happy-family_K2FGYTZWHM", CARD, 0.40),
    "community-women":    ("christmas-gift_OCM8DIWV86", CARD, 0.45),
    "community-group":    ("business-people_JQCQP5J6LP", CARD, 0.45),
    "community-street":   ("people-men_WTHUQQNMFY", CARD, 0.45),
    "seniors":            ("senior-couple_LXAIK7OX05", CARD, 0.40),
    "family-units":       ("family-playful_AI41GIH3LY", CARD, 0.45),
    "wedding":            ("wedding-groomsmen_PCRS8AQQTF", CARD, 0.40),
    "council":            ("business-people_H6PSN9BPGZ", CARD, 0.45),
    "children-joy":       ("face-child_6QHKJLPY8F", CARD, 0.40),
    # clergy ---------------------------------------------------------------
    "priest-parish":      ("oldman-portrait_TTOM5R7SFF", TALL, 0.40),
    "past-priest-1":      ("people-old_W2QMUQHOGE", TALL, 0.35),
    "past-priest-2":      ("man-suit_OIO01RKMXU", TALL, 0.35),
    "past-priest-3":      ("man-work_LR22HMETWM", TALL, 0.35),
    "past-priest-4":      ("people-man_EC2R5XM722", TALL, 0.35),
    "past-priest-5":      ("man-thinking_RI8VPT40DJ", TALL, 0.35),
    "past-priest-6":      ("man-thinking_IA9FDDNLU5", TALL, 0.35),
    "past-priest-7":      ("man-smartphone_QDJDQOP3R0", TALL, 0.35),
    "past-priest-8":      ("suit-vest_RHCVE50EJR", TALL, 0.40),
    "past-priest-9":      ("man-suit_7J8BYE52VO", TALL, 0.40),
    "past-priest-10":     ("man-portrait_B4SX9OQECA", TALL, 0.40),
}


def fetch(name):
    path = os.path.join(POOL, name + ".jpg")
    if os.path.exists(path):
        return path
    req = urllib.request.Request(
        CDN + name + ".jpg", headers={"User-Agent": UA, "Referer": "https://stocksnap.io/"}
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        blob = resp.read()
    with open(path, "wb") as fh:
        fh.write(blob)
    return path


def main():
    os.makedirs(POOL, exist_ok=True)
    os.makedirs(DST, exist_ok=True)
    credits, missing = [], []

    for slot, (name, geom, focus) in PLAN.items():
        try:
            src = fetch(name)
        except Exception as exc:  # noqa: BLE001
            missing.append(f"{slot} <- {name}: {exc}")
            continue
        im = ImageOps.exif_transpose(Image.open(src).convert("RGB"))
        out = ImageOps.fit(im, geom, method=Image.LANCZOS, centering=(0.5, focus))
        out.save(os.path.join(DST, slot + ".jpg"), quality=84, optimize=True, progressive=True)
        credits.append(
            {
                "file": f"/images/site/{slot}.jpg",
                "source": "StockSnap.io",
                "license": "CC0 1.0 (public domain, no attribution required)",
                "origin": f"https://stocksnap.io/photo/{name.replace('_', '-')}",
            }
        )

    with open(os.path.join(IMAGES, "credits.json"), "w", encoding="utf-8") as fh:
        json.dump(credits, fh, indent=2)
    shutil.rmtree(POOL, ignore_errors=True)

    print(f"{len(credits)} images -> public/images/site")
    if missing:
        print("MISSING:", *missing, sep="\n  ")


if __name__ == "__main__":
    main()
