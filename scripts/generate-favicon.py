#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw

# Simple, dependency-light favicon generator using Pillow.
# Produces a white background, dark gray "C", and darker sky-blue center dot.

DARK_GRAY = "#1b1b1b"
DARK_SKY_BLUE = "#1f80cf"
WHITE = "#ffffff"

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")


def draw_icon(size: int) -> Image.Image:
    # Start transparent, then paint a white circle so the favicon is circular.
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    circle_bbox = (0, 0, size - 1, size - 1)
    draw.ellipse(circle_bbox, fill=WHITE)

    margin = max(1, int(size * 0.16))
    stroke = max(1, int(size * 0.12))
    bbox = (margin, margin, size - margin, size - margin)

    # Draw a bold "C" using an arc so we avoid font dependencies.
    draw.arc(bbox, start=40, end=320, fill=DARK_GRAY, width=stroke)

    # Center dot
    radius = max(1, int(size * 0.1))
    cx = cy = size // 2
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=DARK_SKY_BLUE)

    return img


def save_png(size: int, filename: str) -> None:
    img = draw_icon(size)
    path = os.path.join(PUBLIC_DIR, filename)
    img.save(path, format="PNG")


def main() -> None:
    os.makedirs(PUBLIC_DIR, exist_ok=True)

    # Standard favicon sizes
    save_png(16, "favicon-16x16.png")
    save_png(32, "favicon-32x32.png")

    # App icons
    save_png(180, "apple-touch-icon.png")
    save_png(192, "android-chrome-192x192.png")
    save_png(512, "android-chrome-512x512.png")

    # Multi-size ICO
    base = draw_icon(512)
    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    base.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)],
    )


if __name__ == "__main__":
    main()
