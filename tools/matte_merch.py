#!/usr/bin/env python3
"""ML object-matting for the white-on-white product mockups that the color
flood (cutout_merch.py) had to skip. rembg/u2net segments the *product*, not
the background color, so light/white goods get a clean alpha cut too.

Usage: matte_merch.py img1.webp img2.webp ...   (overwrites in place)
"""
import sys
import numpy as np
from PIL import Image
from rembg import remove, new_session

SESSION = new_session("u2net")


def matte(path):
    im = Image.open(path).convert("RGBA")
    out = remove(im, session=SESSION, post_process_mask=True).convert("RGBA")
    out.save(path, "WEBP", quality=90, method=6)
    a = np.array(out)[..., 3]
    return float((a < 16).mean())


def main():
    files = sys.argv[1:]
    for i, f in enumerate(files, 1):
        frac = matte(f)
        print(f"{f.split('/')[-1]:30s} removed={frac*100:5.1f}%")
    print(f"DONE: {len(files)} matted.")


if __name__ == "__main__":
    main()
