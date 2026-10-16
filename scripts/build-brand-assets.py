#!/usr/bin/env python3
"""
Build the served brand assets in `public/brand/` from the masters in `assets/`.

`assets/` is the archive: every weight, every logo variant, the original brand
tokens. `public/brand/` is the subset the browser actually downloads, plus the
product marks recoloured to the brand navy — which are *generated*, so nothing
here has to be redone by hand if the source lockup changes.

    python3 scripts/build-brand-assets.py        # or: npm run brand:build

Requires Pillow (`pip install Pillow`) only for the logo recolouring step.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets'
OUT = ROOT / 'public' / 'brand'

# Brand values. Must match `src/styles/isi-brand.css`.
IRONCLAD = '#011E41'
SLATE = '#7D8BA0'
FOUNDATIONAL = '#DCE3EB'
# The bright blue and near-black of the original, pre-rebrand lockup.
LEGACY_BLUE = '#2563EB'
LEGACY_INK = '#0F172A'
LEGACY_GREY = '#64748B'

# Only the weights the stylesheet actually declares get shipped. The rest stay
# in `assets/` — available, but not in anyone's download.
LATIN_WEIGHTS = ['Regular', 'Medium', 'Bold']
KHMER_WEIGHTS = ['Regular', 'Medium', 'Semibold', 'Bold']


def hx(s: str) -> tuple[int, int, int]:
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def copy_fonts() -> int:
    n = 0
    for w in LATIN_WEIGHTS:
        for ext in ('woff2', 'woff'):
            f = SRC / 'fonts' / 'latin' / f'ABCGinto-{w}.{ext}'
            copy(f, OUT / 'fonts' / f.name)
            n += 1
    for w in KHMER_WEIGHTS:
        f = SRC / 'fonts' / 'khmer' / f'MiSansKhmer-{w}.otf'
        copy(f, OUT / 'fonts' / 'khmer' / f.name)
        n += 1
    return n


def copy_logos() -> int:
    n = 0
    for group in ('group', 'divisions'):
        for f in sorted((SRC / 'logos' / group).glob('*.svg')):
            copy(f, OUT / 'logos' / group / f.name)
            n += 1
    return n


def build_marks() -> int:
    """Recolour the product lockup from the legacy bright blue to brand navy."""
    try:
        from PIL import Image
    except ImportError:
        print('  ! Pillow not installed — skipping logo recolouring.', file=sys.stderr)
        print('    Existing files in public/brand/logos/ are left as they are.', file=sys.stderr)
        return 0

    def remap(src: Path, dst: Path, pairs, power: int = 6) -> None:
        """Smooth inverse-distance interpolation between anchor colours, so the
        artwork's anti-aliased edges survive the swap."""
        im = Image.open(src).convert('RGBA')
        anchors = [(hx(a), hx(b)) for a, b in pairs]
        cache: dict = {}

        def conv(px):
            key = px[:3]
            if key not in cache:
                ws, acc = 0.0, [0.0, 0.0, 0.0]
                hit = None
                for s, d in anchors:
                    dist = sum((key[i] - s[i]) ** 2 for i in range(3)) ** 0.5
                    if dist < 0.5:
                        hit = d
                        break
                    w = 1.0 / dist ** power
                    ws += w
                    for i in range(3):
                        acc[i] += w * d[i]
                cache[key] = hit or tuple(
                    min(255, max(0, int(round(v / ws)))) for v in acc
                )
            return cache[key] + (px[3],)

        im.putdata([conv(p) for p in im.getdata()])
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst)

    def knockout(src: Path, dst: Path, fg: str) -> None:
        """Drop the coloured disc and keep only the ISI glyph, flat on a
        transparent ground — so the mark can sit on any brand surface."""
        im = Image.open(src).convert('RGBA')
        disc, white, tgt = hx(LEGACY_BLUE), (255, 255, 255), hx(fg)
        axis = [white[i] - disc[i] for i in range(3)]
        den = sum(v * v for v in axis)
        cache: dict = {}

        def conv(px):
            key = px[:3]
            if key not in cache:
                t = sum((key[i] - disc[i]) * axis[i] for i in range(3)) / den
                cache[key] = max(0.0, min(1.0, t))
            return tgt + (int(round(px[3] * cache[key])),)

        im.putdata([conv(p) for p in im.getdata()])
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst)

    # On light grounds: navy mark, navy wordmark, slate values line.
    light = [(LEGACY_BLUE, IRONCLAD), (LEGACY_INK, IRONCLAD), (LEGACY_GREY, SLATE),
             ('#FFFFFF', '#FFFFFF'), ('#000000', IRONCLAD)]
    # On dark grounds the mark inverts: light disc, navy glyph.
    dark = [(LEGACY_BLUE, FOUNDATIONAL), (LEGACY_INK, FOUNDATIONAL), (LEGACY_GREY, SLATE),
            ('#FFFFFF', IRONCLAD), ('#000000', FOUNDATIONAL)]

    primary = SRC / 'logos' / 'product' / 'Primary.png'
    square = SRC / 'logos' / 'product' / 'Square.png'
    logos = OUT / 'logos'

    remap(primary, logos / 'isi-primary.png', light)
    remap(primary, logos / 'isi-primary-inverse.png', dark)
    remap(square, logos / 'isi-square.png', light)
    remap(square, logos / 'isi-square-inverse.png', dark)
    knockout(square, logos / 'isi-mark-white.png', '#FFFFFF')
    knockout(square, logos / 'isi-mark-navy.png', IRONCLAD)
    return 6


def main() -> int:
    if not SRC.exists():
        print(f'error: no masters at {SRC}', file=sys.stderr)
        return 1
    print(f'fonts  {copy_fonts()} files')
    print(f'logos  {copy_logos()} SVGs')
    print(f'marks  {build_marks()} generated PNGs')
    print(f'→ {OUT.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
