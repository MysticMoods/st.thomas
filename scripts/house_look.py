"""
The house look: one grade for every photograph on the site.

The site is cream paper, navy ink and gold. Photographs straight from a phone
are cool and bright with loud reds and greens, and stock photographs each bring
a mood of their own; side by side, neither belongs. This puts them all in the
same light:

- white balance taken most of the way to neutral, then warmed to the page's
  cream, so a white wall reads as the same white as the paper around it;
- highlights rolled off just below pure white, so no photograph is brighter
  than the page it sits on;
- the blacks lifted a little and warmed, a soft printed black rather than a
  screen's hard one;
- every photograph brought to the same middle brightness;
- saturation calmed overall, greens moved towards olive and quietened most,
  reds and blues held back, so the gold of the site stays the loudest colour.

Used by scripts/parish-photos.py (the parish's own photographs) and
scripts/house-look-stock.py (the stock set). STRENGTH is the one dial: 0 leaves
a photograph as it was, 1 is the full look.
"""

import numpy as np
from PIL import Image

STRENGTH = 1.0

# ------------------------------------------------------------------ colour maths
_M = np.array([[0.4124564, 0.3575761, 0.1804375],
               [0.2126729, 0.7151522, 0.0721750],
               [0.0193339, 0.1191920, 0.9503041]])
_Mi = np.linalg.inv(_M)
_WHITE = np.array([0.95047, 1.0, 1.08883])


def _to_lab(rgb):
    c = rgb.astype(np.float32) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    xyz = c @ _M.T / _WHITE
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return L, a, b


def _to_rgb(L, a, b):
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f ** 3 > 0.008856, f ** 3, (f - 16 / 116) / 7.787) * _WHITE
    c = xyz @ _Mi.T
    c = np.clip(c, 0, 1)
    c = np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)
    return (np.clip(c, 0, 1) * 255 + 0.5).astype(np.uint8)


# ------------------------------------------------------------------ the look
def grade(im: Image.Image, strength: float = STRENGTH, portrait: bool = False) -> Image.Image:
    """The house look on one photograph. `portrait` keeps skin as it is."""
    rgb = np.asarray(im.convert("RGB"))
    L, a, b = _to_lab(rgb)
    L0, a0, b0 = L.copy(), a.copy(), b.copy()

    # white balance: what is already nearly neutral and well lit sets it
    chroma = np.hypot(a, b)
    neutral = (L > 50) & (L < 97) & (chroma < 14)
    if neutral.mean() > 0.01:
        a -= 0.7 * np.median(a[neutral])
        b -= 0.7 * np.median(b[neutral])

    # brightness: every photograph to the same middle, at most a stop either way
    mid = np.median(L)
    target = 58.0
    gain = np.clip((target / max(mid, 1)) ** 0.55, 0.72, 1.5)
    Ln = np.clip(L / 100 * gain, 0, 1.4)
    # highlights roll off to 0.95 — never as bright as the page
    knee = 0.72
    Ln = np.where(Ln > knee, knee + (0.95 - knee) * np.tanh((Ln - knee) / (0.95 - knee)), Ln)
    # a gentle S, and a soft printed black
    Ln = Ln + 0.05 * np.sin(np.pi * Ln) * (Ln - 0.5) * 2
    Ln = 0.035 + Ln * (1 - 0.035)
    L = Ln * 100

    # warmth: highlights towards the page's cream, shadows towards warm brown
    hi = np.clip((L - 55) / 40, 0, 1)
    lo = np.clip((40 - L) / 40, 0, 1)
    a += 0.8 * hi + 0.8 * lo
    b += 4.0 * hi + 2.5 * lo

    # colour: calmer overall, greens to olive and quieter, reds and blues held
    chroma = np.hypot(a, b) + 1e-6
    hue = np.degrees(np.arctan2(b, a)) % 360
    green = np.exp(-((hue - 140) / 35) ** 2)
    red = np.exp(-((((hue - 30 + 180) % 360) - 180) / 22) ** 2)
    blue = np.exp(-((hue - 265) / 35) ** 2)
    skin = np.exp(-((hue - 60) / 22) ** 2) if portrait else 0
    sat = 0.82 - 0.20 * green - 0.08 * red - 0.08 * blue
    sat = sat + (1 - sat) * skin * 0.8
    # muted colours keep a little more of themselves than loud ones
    sat = sat + (1 - sat) * np.clip(1 - chroma / 25, 0, 1) * 0.4
    a, b = a * sat, b * sat
    # olive: green turned a touch towards yellow
    rot = np.radians(-12) * green
    a, b = a * np.cos(rot) - b * np.sin(rot), a * np.sin(rot) + b * np.cos(rot)

    s = float(strength)
    L = L0 + s * (L - L0)
    a = a0 + s * (a - a0)
    b = b0 + s * (b - b0)
    return Image.fromarray(_to_rgb(L, a, b))
