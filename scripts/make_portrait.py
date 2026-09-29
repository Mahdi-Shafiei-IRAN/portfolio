"""Turn static/img/profile.jpg into the pixel-art HUD portrait for Backend City.

    python scripts/make_portrait.py

Crops head and shoulders, swaps the background for flat sky blue, shrinks
to 48x48, reduces to a 24-colour palette and scales back up 2x with
nearest-neighbour so the pixels stay crisp.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PHOTO = ROOT / 'static' / 'img' / 'profile.jpg'
PORTRAIT = ROOT / 'static' / 'game' / 'img' / 'portrait.png'

CROP = (142, 33, 822, 713)  # head and shoulders in the 960x960 photo
# Head ellipse and shoulder outline, as fractions of the crop's size.
HEAD = (0.24, 0.06, 0.76, 0.84)
SHOULDERS = [(0.0, 1.0), (0.25, 0.74), (0.75, 0.74), (1.0, 1.0)]
CHEST = 0.82                # everything below this line is kept
SKY = (124, 190, 240)


def flatten_background(image, colour=SKY):
    """Keep the head and shoulders, paint everything else one flat colour."""
    w, h = image.size
    mask = Image.new('L', image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((HEAD[0] * w, HEAD[1] * h, HEAD[2] * w, HEAD[3] * h), fill=255)
    draw.polygon([(x * w, y * h) for x, y in SHOULDERS], fill=255)
    draw.rectangle((0, CHEST * h, w, h), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(w / 95))
    return Image.composite(image, Image.new('RGB', image.size, colour), mask)


def pixelate(image, size=48, colours=24, scale=2):
    """Square image -> size x size -> `colours`-colour palette -> upscaled by `scale`."""
    image = image.convert('RGB')
    small = image.resize((size, size), Image.LANCZOS)
    small = ImageEnhance.Contrast(small).enhance(1.15)
    small = ImageEnhance.Color(small).enhance(1.1)
    small = small.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return small.resize((size * scale, size * scale), Image.NEAREST)


def main():
    photo = Image.open(PHOTO).convert('RGB')
    portrait = pixelate(flatten_background(photo.crop(CROP)))
    PORTRAIT.parent.mkdir(parents=True, exist_ok=True)
    portrait.save(PORTRAIT, optimize=True)
    print(f'{PORTRAIT.relative_to(ROOT)}  {PORTRAIT.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
