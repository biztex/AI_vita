"""
Rich menu v4 (2026-09-30): adds the full-width 「健康・栄養・美容を相談」 button
on top of the client's 6-card design (v3 image). The six cards are cropped
from the v3 asset and scaled uniformly (no distortion); the new banner is
drawn in the same visual language (navy glass, gold hairline, serif title).

Usage: python3 scripts/build-richmenu-v4.py [src.jpg] [out.jpg]
Layout must match lineRichMenu.ts (BANNER_H / ROW_H).
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = sys.argv[1] if len(sys.argv) > 1 else 'assets/axel_richmenu_v3_2500x1686.jpg'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/axel_richmenu_2500x1686.jpg'
W, H = 2500, 1686
BANNER_H = 396           # top row (tap area) — keep in sync with lineRichMenu.ts
ROW_H = (H - BANNER_H) // 3  # 430
GOLD = (201, 168, 106)
GOLD_SOFT = (222, 196, 140)

src = Image.open(SRC).convert('RGB').resize((W, H), Image.LANCZOS)

# Ambient background: heavily blurred + darkened original (keeps marble/navy tone)
bg = src.filter(ImageFilter.GaussianBlur(60))
bg = Image.blend(bg, Image.new('RGB', (W, H), (8, 18, 38)), 0.45)

# Card crop boxes in the v3 image (card + small glow margin)
M = 10
COLS = [(31 - M, 1238 + M), (1265 - M, 2471 + M)]
ROWS = [(62 - M, 556 + M), (585 - M, 1072 + M), (1100 - M, 1600 + M)]

card_h = ROW_H - 14
scale = card_h / (ROWS[0][1] - ROWS[0][0])
card_w = int((COLS[0][1] - COLS[0][0]) * scale)
gap = 34
grid_w = card_w * 2 + gap
x0 = (W - grid_w) // 2

canvas = bg.copy()
for r, (y1, y2) in enumerate(ROWS):
    for c, (xa, xb) in enumerate(COLS):
        card = src.crop((xa, y1, xb, y2)).resize((card_w, card_h), Image.LANCZOS)
        px = x0 + c * (card_w + gap)
        py = BANNER_H + r * ROW_H + (ROW_H - card_h) // 2
        # Rounded, feathered mask so the crop's rectangular corners never show
        cm = Image.new('L', card.size, 0)
        ImageDraw.Draw(cm).rounded_rectangle([4, 4, card.size[0] - 5, card.size[1] - 5], radius=30, fill=255)
        cm = cm.filter(ImageFilter.GaussianBlur(2.5))
        canvas.paste(card, (px, py), cm)

# ── Banner card ──
bx1, by1, bx2, by2 = x0 + 6, 34, x0 + grid_w - 6, BANNER_H - 14
banner = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(banner)
# glass body: vertical gradient navy
body = Image.new('RGBA', (bx2 - bx1, by2 - by1))
bd = ImageDraw.Draw(body)
for y in range(by2 - by1):
    t = y / (by2 - by1)
    col = (int(22 + 10 * (1 - t)), int(40 + 14 * (1 - t)), int(78 + 22 * (1 - t)), 245)
    bd.line([(0, y), (bx2 - bx1, y)], fill=col)
mask = Image.new('L', body.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, body.size[0] - 1, body.size[1] - 1], radius=34, fill=255)
banner.paste(body, (bx1, by1), mask)
# glow + gold border
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).rounded_rectangle([bx1, by1, bx2, by2], radius=34, outline=GOLD + (170,), width=10)
glow = glow.filter(ImageFilter.GaussianBlur(10))
canvas = Image.alpha_composite(canvas.convert('RGBA'), glow)
canvas = Image.alpha_composite(canvas, banner)
d = ImageDraw.Draw(canvas)
d.rounded_rectangle([bx1, by1, bx2, by2], radius=34, outline=GOLD_SOFT + (255,), width=3)

# Icon: gold ring with a leaf + heart
cx, cy, R = bx1 + 190, (by1 + by2) // 2, 118
ring = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(ring).ellipse([cx - R, cy - R, cx + R, cy + R], outline=GOLD + (200,), width=8)
ring = ring.filter(ImageFilter.GaussianBlur(6))
canvas = Image.alpha_composite(canvas, ring)
d = ImageDraw.Draw(canvas)
d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=GOLD_SOFT, width=4)
# speech bubble
sb = [cx - 70, cy - 58, cx + 70, cy + 40]
d.rounded_rectangle(sb, radius=30, outline=GOLD_SOFT, width=7)
d.polygon([(cx - 38, cy + 36), (cx - 58, cy + 72), (cx - 8, cy + 38)], fill=GOLD_SOFT)
d.polygon([(cx - 32, cy + 33), (cx - 46, cy + 56), (cx - 14, cy + 33)], fill=(26, 46, 88))
# heart inside bubble
hx, hy = cx, cy - 10
d.ellipse([hx - 34, hy - 26, hx - 2, hy + 6], fill=GOLD_SOFT)
d.ellipse([hx + 2, hy - 26, hx + 34, hy + 6], fill=GOLD_SOFT)
d.polygon([(hx - 33, hy - 2), (hx + 33, hy - 2), (hx, hy + 32)], fill=GOLD_SOFT)

serif = '/usr/share/fonts/opentype/noto/NotoSerifCJK-SemiBold.ttc'
sans = '/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc'
title_f = ImageFont.truetype(serif, 94, index=0)
sub_f = ImageFont.truetype(sans, 46, index=0)
tag_f = ImageFont.truetype(serif, 36, index=0)
tx = cx + R + 70
d.text((tx, cy - 118), '健康・栄養・美容を相談', font=title_f, fill=(250, 248, 242))
d.line([(tx, cy + 18), (bx2 - 300, cy + 18)], fill=GOLD + (255,), width=3)
d.text((tx, cy + 48), 'AXELに話しかけるだけ。ご相談内容は面談にも活かされます', font=sub_f, fill=GOLD_SOFT)
# CTA chevron
ax = bx2 - 150
d.line([(ax - 22, cy - 44), (ax + 22, cy), (ax - 22, cy + 44)], fill=GOLD_SOFT, width=9, joint='curve')
d.text((bx2 - 232, by1 + 26), 'CONSULT', font=tag_f, fill=(120, 140, 180))

canvas.convert('RGB').save(OUT, 'JPEG', quality=90, optimize=True)
print('wrote', OUT, 'card', card_w, card_h, 'row', ROW_H)
