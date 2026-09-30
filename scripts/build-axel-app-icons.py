"""AXEL home-screen icons (client 2026-09-30 item 6, 案A launcher).
Gold flame (from public/img/logo-white.png) + serif 「AXEL」 on navy.
Output: public/axel-app/icon-{180,192,512}.png (+ maskable 512)."""
from PIL import Image, ImageDraw, ImageFont
logo = Image.open('public/img/logo-white.png').convert('RGBA')
# flame = gold, non-white pixels at the left of the wordmark
w, h = logo.size
flame = logo.crop((0, 0, 110, h))
# keep gold pixels only (drop any white wordmark stroke inside the crop)
px = flame.load()
for y in range(flame.height):
    for x in range(flame.width):
        r, g, b, a = px[x, y]
        if not (a > 0 and r - b > 40):
            px[x, y] = (0, 0, 0, 0)
bbox = flame.getbbox()
flame = flame.crop(bbox)
serif = '/usr/share/fonts/opentype/noto/NotoSerifCJK-SemiBold.ttc'
def build(size, safe=0.0):
    S = 1024
    im = Image.new('RGBA', (S, S), (15, 35, 66, 255))
    # subtle radial lift (composited so it blends instead of overwriting)
    from PIL import ImageFilter
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([S*0.15, S*0.1, S*0.85, S*0.8], fill=(46, 82, 138, 110))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(150)))
    d = ImageDraw.Draw(im)
    inner = 1 - 2 * safe
    fh = int(S * 0.44 * inner)
    fw = int(flame.width * fh / flame.height)
    f = flame.resize((fw, fh), Image.LANCZOS)
    im.alpha_composite(f, ((S - fw) // 2, int(S * (0.14 + safe * 0.9))))
    font = ImageFont.truetype(serif, int(200 * inner), index=0)
    txt = 'AXEL'
    tw = d.textlength(txt, font=font)
    d = ImageDraw.Draw(im)
    d.text(((S - tw) / 2, S * (0.62 - safe * 0.25)), txt, font=font, fill=(236, 214, 164, 255))
    return im.convert('RGB').resize((size, size), Image.LANCZOS)
for s in (180, 192, 512):
    build(s).save(f'public/axel-app/icon-{s}.png', optimize=True)
build(512, safe=0.1).save('public/axel-app/icon-maskable-512.png', optimize=True)
print('ok')
