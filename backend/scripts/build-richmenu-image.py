#!/usr/bin/env python3
"""
Build the AXEL Concierge rich menu image (2500x1686).
Four quadrants, each labeled in Japanese, with a brass accent line — matching
the LP's dark-navy + champagne brass identity.
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 2500, 1686
COL, ROW = W // 2, H // 2

NAVY = (30, 58, 95, 255)        # #1E3A5F
MID  = (45, 90, 142, 255)       # #2D5A8E
LIGHT = (58, 122, 189, 255)     # #3A7ABD
BRASS = (201, 168, 106, 255)    # #C9A86A
WHITE = (255, 255, 255, 255)
WHITE_DIM = (255, 255, 255, 180)

SERIF_BOLD = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
SANS_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

img = Image.new("RGB", (W, H), NAVY)
draw = ImageDraw.Draw(img, "RGBA")

# ── Background quadrants ──
# v11 (2026-07-05) — client's explicit 4-item proposal:
#   相談する / 健康について相談 / 判断について相談 / 今日の状態を確認
quadrants = [
    (0, 0, COL, ROW, NAVY,   '相談する',       'なんでも、話したい',      '①'),
    (COL, 0, W,   ROW, MID,    '健康の相談',     '体調・睡眠・疲労・食事',  '②'),
    (0, ROW, COL, H,   LIGHT,  '判断の相談',     '経営・組織・戦略',        '③'),
    (COL, ROW, W,   H,   NAVY,   '今日の状態',     '一言で、今日を教えて',    '④'),
]

font_title = ImageFont.truetype(SERIF_BOLD, 120)
font_sub   = ImageFont.truetype(SANS_REG, 52)
font_num   = ImageFont.truetype(SERIF_BOLD, 60)
font_logo  = ImageFont.truetype(SERIF_BOLD, 38)

for (x1, y1, x2, y2, color, title, sub, num) in quadrants:
    # Solid background
    draw.rectangle([x1, y1, x2-1, y2-1], fill=color)

    # Subtle 2px inner border in brass
    pad = 18
    draw.rectangle([x1+pad, y1+pad, x2-pad-1, y2-pad-1], outline=(201, 168, 106, 80), width=2)

    # Small number marker top-left
    draw.text((x1 + 48, y1 + 30), num, fill=(201, 168, 106, 200), font=font_num)

    # AXEL marker top-right
    draw.text((x2 - 220, y1 + 38), 'AXEL', fill=(201, 168, 106, 200), font=font_logo)

    # Brass accent line below logo area
    accent_y = y1 + 100
    draw.line([(x1 + 60, accent_y), (x1 + 160, accent_y)], fill=BRASS, width=3)

    # Title (center, 大き目)
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x1 + (x2 - x1 - tw) // 2
    ty = y1 + (y2 - y1) // 2 - th // 2 - 30
    draw.text((tx, ty), title, fill=WHITE, font=font_title)

    # Subtitle (center, under title)
    bbox = draw.textbbox((0, 0), sub, font=font_sub)
    sw = bbox[2] - bbox[0]
    sx = x1 + (x2 - x1 - sw) // 2
    sy = ty + th + 50
    draw.text((sx, sy), sub, fill=WHITE_DIM, font=font_sub)

# ── Quadrant dividers ──
# Vertical center line
draw.line([(COL, 0), (COL, H)], fill=BRASS, width=4)
# Horizontal center line
draw.line([(0, ROW), (W, ROW)], fill=BRASS, width=4)

# ── Save ──
out = "/tmp/axel_richmenu_2500x1686.png"
img.save(out, "PNG", optimize=True)
print(f"✓ Wrote {out}")
import os
print(f"  size: {os.path.getsize(out)} bytes")
