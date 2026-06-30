#!/usr/bin/env python3
"""Drop the white studio sweep from product mockups -> transparent webp.

Flood the near-white background inward from the image borders, so only the
connected outer sweep (and its soft contact shadow) is keyed out -- any white
*inside* the product is left alone. Feathered alpha for a clean anti-aliased
edge. Color is untouched; the goods just float on whatever sits behind them.

Usage:
  cutout_merch.py --test out_dir img1.webp img2.webp   # write cutouts to out_dir
  cutout_merch.py --inplace assets/optimized/merch/*.webp
"""
import sys
import os
import numpy as np
from PIL import Image
from scipy import ndimage

# near-white = bright AND low-saturation (catches white + soft gray shadow,
# but not the grey-fabric products, whose channels sit well below 205).
MIN_BRIGHT = 205
MAX_SAT = 22
# A near-white region this big (fraction of the frame) is background even when
# it's sealed off from the border -- e.g. the studio sweep showing through a
# tote's strap loop. Smaller white blobs (specular highlights, a white logo)
# stay opaque so the product doesn't turn to swiss cheese.
MIN_HOLE_FRAC = 0.004


def cutout(arr):
    h, w = arr.shape[:2]
    rgb = arr[..., :3].astype(np.int16)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    near_white = (mn >= MIN_BRIGHT) & ((mx - mn) <= MAX_SAT)

    lbl, n = ndimage.label(near_white)
    if n == 0:
        return arr, 0.0

    sizes = np.bincount(lbl.ravel())
    border = np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])
    border_labels = np.unique(border[border > 0])
    big_labels = np.where(sizes > MIN_HOLE_FRAC * h * w)[0]
    big_labels = big_labels[big_labels > 0]
    remove = np.union1d(border_labels, big_labels)
    bg = np.isin(lbl, remove)

    alpha = np.where(bg, 0.0, 255.0).astype(np.float32)
    alpha = ndimage.gaussian_filter(alpha, sigma=0.8)  # feather the cut edge
    out = arr.copy()
    out[..., 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    return out, float(bg.mean())


# If the flood removes more than this much of the frame, the product itself was
# light and got eaten -- bail and keep the original rather than destroy it.
SKIP_ABOVE = 0.85


def process(path, out_path):
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    out, frac = cutout(arr)
    if frac > SKIP_ABOVE:
        # leave the original untouched (no alpha) so we never destroy a product
        Image.fromarray(arr, "RGBA").save(out_path, "WEBP", quality=90, method=6)
        return frac, True
    Image.fromarray(out, "RGBA").save(out_path, "WEBP", quality=90, method=6)
    return frac, False


def main():
    args = sys.argv[1:]
    mode = args[0]
    if mode == "--test":
        out_dir = args[1]
        files = args[2:]
        os.makedirs(out_dir, exist_ok=True)
        for f in files:
            dst = os.path.join(out_dir, os.path.basename(f))
            frac, skipped = process(f, dst)
            tag = "  SKIP(light)" if skipped else ""
            print(f"{os.path.basename(f):32s} bg={frac*100:5.1f}%{tag}  -> {dst}")
    elif mode == "--inplace":
        files = args[1:]
        skipped = []
        for i, f in enumerate(files, 1):
            frac, skp = process(f, f)
            if skp:
                skipped.append((os.path.basename(f), frac))
            if i % 50 == 0 or i == len(files):
                print(f"  {i}/{len(files)} done")
        print(f"DONE: {len(files)} images, {len(skipped)} kept original (light product).")
        for name, frac in skipped:
            print(f"  SKIPPED {name}  bg={frac*100:.1f}%")
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
