#!/usr/bin/env python3
"""
Rich-menu image generator — AXEL 6-item navigation (2026-08-11 client design).
2500x1686, 3 rows x 2 cols. Outputs to backend/assets/ (committed, stable) and
/tmp (legacy candidate path). Run:  python3 scripts/build-richmenu-image.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 2500, 1686
COL, ROW = W // 2, H // 3

NAVY = (30, 58, 95)
NAVY2 = (39, 74, 120)
BRASS = (201, 168, 106)
WHITE = (255, 255, 255)
LINE = (255, 255, 255, 40)

# 6 cells: (row, col) -> (label, sub, emoji)
CELLS = [
    ("AXELレポート", "あなたの理解をまとめて確認", "📋"),
    ("パーソナルプラン", "管理栄養士の個別プラン", "🍽"),
    ("性格診断", "性格タイプを診断・確認", "🧠"),
    ("検査結果", "遺伝子検査の結果を見る", "🧬"),
    ("面談予約", "カウンセリングを予約", "📅"),
    ("マイページ", "契約・登録・各種設定", "⚙"),
]

FONT_DIR = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
EMOJI_NATIVE = 109  # NotoColorEmoji only rasterizes at this size


def font(sz):
    try:
        return ImageFont.truetype(FONT_DIR, sz)
    except Exception:
        return ImageFont.load_default()


def paste_emoji(base, ch, center, target=120):
    """Render a color emoji at its native size and paste it centered."""
    try:
        ef = ImageFont.truetype(EMOJI_FONT, EMOJI_NATIVE)
        tile = Image.new("RGBA", (EMOJI_NATIVE * 2, EMOJI_NATIVE * 2), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text(
            (EMOJI_NATIVE, EMOJI_NATIVE), ch, font=ef, anchor="mm", embedded_color=True
        )
        tile = tile.crop(tile.getbbox())
        w, h = tile.size
        scale = target / max(w, h)
        tile = tile.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        base.paste(tile, (center[0] - tile.width // 2, center[1] - tile.height // 2), tile)
    except Exception as e:
        print("emoji paste failed:", ch, repr(e))


def main():
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    # subtle vertical gradient
    for y in range(H):
        t = y / H
        r = int(NAVY[0] + (NAVY2[0] - NAVY[0]) * t)
        g = int(NAVY[1] + (NAVY2[1] - NAVY[1]) * t)
        b = int(NAVY[2] + (NAVY2[2] - NAVY[2]) * t)
        d.line([(0, y), (W, y)], fill=(r, g, b))

    f_label = font(64)
    f_sub = font(34)

    for i, (label, sub, emoji) in enumerate(CELLS):
        r, c = divmod(i, 2)
        x0, y0 = c * COL, r * ROW
        cx = x0 + COL // 2
        # cell separators
        if c == 0:
            d.line([(COL, y0 + 30), (COL, y0 + ROW - 30)], fill=BRASS, width=3)
        if r > 0:
            d.line([(x0 + 40, y0), (x0 + COL - 40, y0)], fill=BRASS, width=2)
        # color emoji icon
        paste_emoji(img, emoji, (cx, y0 + 140), target=120)
        # label
        d.text((cx, y0 + 300), label, font=f_label, fill=WHITE, anchor="mm")
        # sub
        d.text((cx, y0 + 400), sub, font=f_sub, fill=BRASS, anchor="mm")

    here = os.path.dirname(os.path.abspath(__file__))
    out_asset = os.path.join(here, "..", "assets", "axel_richmenu_2500x1686.png")
    os.makedirs(os.path.dirname(out_asset), exist_ok=True)
    img.save(out_asset, "PNG")
    img.save("/tmp/axel_richmenu_2500x1686.png", "PNG")
    print("wrote", os.path.normpath(out_asset), "and /tmp copy")


if __name__ == "__main__":
    main()
