"""
Puts the stock photographs into the house look (scripts/house_look.py).

    python scripts/house-look-stock.py

The untouched stock files are kept in church/stock-original/ the first time
this runs, and every run grades from those — so it can be re-run after the look
is tuned, and the originals can always be put back. Slots built from the
parish's own photographs (scripts/parish-photos.py) are skipped; that script
grades them itself.
"""

import importlib.util
import os
import shutil
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SITE = os.path.join(ROOT, "public", "images", "site")
KEEP = os.path.join(ROOT, "church", "stock-original")
sys.path.insert(0, HERE)
import house_look  # noqa: E402


def parish_slots():
    spec = importlib.util.spec_from_file_location("parish_photos", os.path.join(HERE, "parish-photos.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return set(module.PLAN)


def main():
    own = parish_slots()
    os.makedirs(KEEP, exist_ok=True)
    n = 0
    for name in sorted(os.listdir(SITE)):
        slot, ext = os.path.splitext(name)
        if ext.lower() != ".jpg" or slot in own:
            continue
        keep = os.path.join(KEEP, name)
        if not os.path.exists(keep):
            shutil.copy2(os.path.join(SITE, name), keep)
        im = Image.open(keep).convert("RGB")
        portrait = slot.startswith(("priest", "past-priest", "trustee"))
        house_look.grade(im, portrait=portrait).save(
            os.path.join(SITE, name), quality=86, optimize=True, progressive=True)
        n += 1
    print(f"{n} stock photographs in the house look; originals in church/stock-original/")


if __name__ == "__main__":
    main()
