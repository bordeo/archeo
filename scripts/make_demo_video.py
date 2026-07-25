#!/usr/bin/env python3
"""Render a short Archeo feature showcase from the real extension screenshots."""

from __future__ import annotations

import argparse
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--copy-screenshot", type=Path, required=True)
parser.add_argument("--mru-screenshot", type=Path, required=True)
parser.add_argument("--output", type=Path, default=ROOT / "archeo-demo.mp4")
args = parser.parse_args()

OUT = args.output
COPY_SCREEN = args.copy_screenshot
MRU_SCREEN = args.mru_screenshot

W, H, FPS, DURATION = 1280, 720, 30, 18
FONT = "/System/Library/Fonts/SFNS.ttf"
FONT_ROUNDED = "/System/Library/Fonts/SFNSRounded.ttf"


def font(size: int, rounded: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_ROUNDED if rounded else FONT, size)


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def cover(img: Image.Image, width: int, height: int, zoom: float = 1.0) -> Image.Image:
    scale = max(width / img.width, height / img.height) * zoom
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def rounded_panel(base: Image.Image, box: tuple[int, int, int, int], radius: int, fill, shadow=24):
    x1, y1, x2, y2 = box
    layer = Image.new("RGBA", base.size)
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((x1, y1 + 10, x2, y2 + 10), radius, fill=(0, 0, 0, 110))
    layer = layer.filter(ImageFilter.GaussianBlur(shadow))
    base.alpha_composite(layer)
    ImageDraw.Draw(base).rounded_rectangle(box, radius, fill=fill)


def centered(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt, fill):
    draw.text(xy, text, font=fnt, fill=fill, anchor="mm")


def keycap(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, width: int):
    draw.rounded_rectangle((x, y, x + width, y + 66), 17, fill=(26, 25, 25, 238), outline=(255, 255, 255, 55), width=2)
    centered(draw, (x + width // 2, y + 32), text, font(30, True), "white")


copy_img = Image.open(COPY_SCREEN).convert("RGB")
mru_img = Image.open(MRU_SCREEN).convert("RGB").crop((0, 0, 1670, 880))


def intro_frame(t: float) -> Image.Image:
    frame = Image.new("RGBA", (W, H), (15, 20, 17, 255))
    draw = ImageDraw.Draw(frame)
    glow = Image.new("RGBA", frame.size)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((370, 80, 910, 620), fill=(66, 164, 88, 72))
    frame.alpha_composite(glow.filter(ImageFilter.GaussianBlur(100)))
    a = int(255 * ease(t / 0.75) * ease((2.1 - t) / 0.45))
    centered(draw, (W // 2, 283), "ARCHEO", font(78, True), (237, 255, 239, a))
    centered(draw, (W // 2, 362), "Two Arc-like superpowers for Chrome", font(30), (196, 213, 200, a))
    draw.rounded_rectangle((544, 418, 736, 424), 3, fill=(78, 210, 106, a))
    return frame


def copy_frame(t: float) -> Image.Image:
    local = t - 2.0
    bg = cover(copy_img, W, H, 1.0 + 0.018 * ease(local / 5))
    bg = ImageEnhance.Brightness(bg).enhance(0.76)
    frame = bg.convert("RGBA")
    shade = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    sd.rectangle((0, 0, W, 125), fill=(7, 11, 9, 175))
    frame.alpha_composite(shade)
    draw = ImageDraw.Draw(frame)
    draw.text((54, 35), "1  ·  COPY LINK", font=font(22), fill=(141, 239, 158), anchor="la")
    draw.text((54, 73), "Copy the current page URL instantly", font=font(34), fill="white", anchor="la")
    keycap(draw, 54, 595, "⇧⌘C", 166)
    draw.text((242, 627), "No menus. No DevTools.", font=font(27), fill=(244, 247, 244), anchor="lm")

    pill_progress = ease((local - 0.85) / 0.28) * ease((4.65 - local) / 0.35)
    if pill_progress > 0:
        pw, ph = int(254 * pill_progress), int(78 * pill_progress)
        cx, cy = W // 2, 171
        if pw > 10 and ph > 10:
            draw.rounded_rectangle((cx - pw // 2, cy - ph // 2, cx + pw // 2, cy + ph // 2), ph // 2, fill=(8, 74, 20, 255))
            if pill_progress > 0.72:
                draw.text((cx - 46, cy), "↗", font=font(30, True), fill=(224, 255, 228), anchor="mm")
                draw.text((cx + 34, cy), "Link copied", font=font(27), fill=(238, 255, 240), anchor="mm")
    return frame


def mru_frame(t: float) -> Image.Image:
    local = t - 7.0
    bg = cover(mru_img, W, H, 1.015)
    bg = bg.filter(ImageFilter.GaussianBlur(1.3))
    bg = ImageEnhance.Brightness(bg).enhance(0.68)
    frame = bg.convert("RGBA")
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((0, 0, W, 125), 0, fill=(7, 8, 8, 185))
    draw.text((54, 35), "2  ·  RECENT TABS", font=font(22), fill=(141, 239, 158), anchor="la")
    draw.text((54, 73), "Preview first. Switch when Control is released.", font=font(34), fill="white", anchor="la")

    x1, y1, x2, y2 = 150, 250, 1130, 478
    rounded_panel(frame, (x1, y1, x2, y2), 34, (39, 38, 38, 252), 20)
    draw = ImageDraw.Draw(frame)
    labels = [("G", "jharrel jerome"), ("G", "tommi"), ("G", "6 7 significato")]
    cards = []
    for i, (icon, label) in enumerate(labels):
        left = 178 + i * 316
        box = (left, 278, left + 286, 449)
        cards.append(box)
        draw.rounded_rectangle(box, 23, fill=(62, 61, 61, 255))
        draw.ellipse((left + 24, 318, left + 82, 376), fill=(250, 250, 250), outline=(190, 190, 190), width=3)
        centered(draw, (left + 53, 347), icon, font(36, True), (61, 122, 232))
        draw.text((left + 101, 347), label, font=font(23), fill="white", anchor="lm")

    if local < 1.8:
        selected = 0
    elif local < 3.25:
        selected = 1
    else:
        selected = 2
    if local < 6.45:
        box = cards[selected]
        draw.rounded_rectangle(box, 23, outline=(255, 255, 255, 255), width=5)

    keycap(draw, 294, 545, "⌃", 78)
    draw.text((389, 578), "+", font=font(30), fill="white", anchor="mm")
    keycap(draw, 413, 545, "Tab", 118)
    instruction = "Keep holding Control · tap Tab again"
    if local >= 4.5:
        instruction = "Release Control to switch"
    draw.text((558, 578), instruction, font=font(25), fill=(245, 247, 245), anchor="lm")

    if local >= 6.45:
        fade = ease((local - 6.45) / 0.35)
        veil = Image.new("RGBA", frame.size, (13, 18, 15, int(225 * fade)))
        frame.alpha_composite(veil)
        draw = ImageDraw.Draw(frame)
        centered(draw, (W // 2, 325), "Switched on release", font(44, True), (238, 255, 240, int(255 * fade)))
        centered(draw, (W // 2, 385), "The current tab stays visible while you choose", font(26), (194, 215, 199, int(255 * fade)))
    return frame


def outro_frame(t: float) -> Image.Image:
    local = t - 15.0
    frame = Image.new("RGBA", (W, H), (14, 19, 16, 255))
    draw = ImageDraw.Draw(frame)
    a = int(255 * ease(local / 0.45) * ease((3.0 - local) / 0.45))
    centered(draw, (W // 2, 180), "ARCHEO", font(66, True), (237, 255, 239, a))
    centered(draw, (W // 2, 264), "Chrome, with a little Arc energy.", font(32), (194, 215, 199, a))
    keycap(draw, 362, 355, "⇧⌘C", 166)
    draw.text((545, 388), "Copy Link", font=font(28), fill=(245, 248, 245, a), anchor="lm")
    keycap(draw, 362, 448, "⌃ Tab", 166)
    draw.text((545, 481), "Recent Tabs", font=font(28), fill=(245, 248, 245, a), anchor="lm")
    return frame


ffmpeg = shutil.which("ffmpeg")
if not ffmpeg:
    raise SystemExit("ffmpeg is required to render the demo")

cmd = [
    ffmpeg, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
    "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT),
]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
assert proc.stdin is not None
for n in range(FPS * DURATION):
    t = n / FPS
    if t < 2.0:
        frame = intro_frame(t)
    elif t < 7.0:
        frame = copy_frame(t)
    elif t < 15.0:
        frame = mru_frame(t)
    else:
        frame = outro_frame(t)
    proc.stdin.write(frame.convert("RGB").tobytes())
proc.stdin.close()
if proc.wait() != 0:
    raise SystemExit("ffmpeg failed")
print(OUT)
