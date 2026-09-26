"""Build the Backend City sprite sheets.

    python scripts/build_city_art.py

Reads the Kenney Tiny Town / Tiny Dungeon packs (CC0, in assets-src/kenney/)
and writes:

    static/game/img/tiles.png   Tiny Town, as-is (terrain, houses, trees, fences)
    static/game/img/chars.png   one row of 16x16 people (the player first)
    static/game/img/props.png   props the packs don't have, drawn here
    static/game/js/atlas.js     where each prop sits in props.png

The drawn props (water, docks, containers, the ship, cranes, antennas, the
fountain, ...) use the packs' own palette and dark outline so they match.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'kenney'
IMG = ROOT / 'static' / 'game' / 'img'
ATLAS_JS = ROOT / 'static' / 'game' / 'js' / 'atlas.js'
TILE = 16

# --- Kenney palette -------------------------------------------------------
OUT = (63, 38, 49)
GRASS, GRASS_L, GRASS_D = (132, 198, 105), (139, 216, 125), (101, 165, 86)
DIRT, WOOD, WOOD_D = (234, 165, 108), (189, 108, 74), (118, 59, 54)
STONE_L, STONE, STONE_D, STONE_DD = (192, 203, 220), (139, 155, 180), (90, 105, 136), (82, 96, 124)
NAVY = (38, 43, 68)
RED, RED_L, RED_D, PEACH = (195, 75, 53), (242, 132, 98), (140, 48, 44), (252, 188, 143)
YELLOW, ORANGE, WHITE = (253, 190, 83), (227, 134, 40), (255, 255, 255)
WATER, WATER_D, WATER_L, WATER_S = (75, 146, 219), (58, 118, 196), (124, 190, 240), (214, 240, 255)
SAND = (247, 214, 158)
LI_BLUE = (10, 102, 194)

CONTAINER_COLOURS = [  # (roof, body, ribs)
    (YELLOW, ORANGE, (170, 90, 30)),
    (WATER_L, WATER_D, (38, 82, 150)),
    (GRASS, (71, 159, 74), (46, 110, 58)),
    (RED_L, RED, RED_D),
]

# Tiny Dungeon cells used for people, in chars.png order. The player (Mahdi)
# is cell 85 recoloured: dark hair, moustache, red sweater, dark jeans.
CHARACTERS = [85, 96, 99, 100, 112, 84, 98, 86, 87]
PLAYER_RECOLOUR = {
    (189, 108, 74): (72, 54, 58),     # hair
    (118, 59, 54): (50, 38, 44),      # hair shade, boots
    (192, 203, 220): (178, 70, 56),   # shirt -> sweater
    (139, 155, 180): (128, 46, 44),   # shirt shade
}


def rgba(c, a=255):
    return c if len(c) == 4 else (*c, a)


def new(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def cell(sheet, index):
    x, y = (index % 12) * TILE, (index // 12) * TILE
    return sheet.crop((x, y, x + TILE, y + TILE))


def rect(img, box, c):
    """Filled rectangle, inclusive corners."""
    ImageDraw.Draw(img).rectangle(box, fill=rgba(c))


def put(img, x, y, c):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), rgba(c))


def art(rows, key):
    """ASCII art -> image. Characters missing from `key` are transparent."""
    img = new(max(len(r) for r in rows), len(rows))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in key:
                img.putpixel((x, y), rgba(key[ch]))
    return img


def outline(img, c=OUT):
    """Kenney-style 1 px outline around every opaque pixel."""
    out = img.copy()
    w, h = img.size
    alpha = img.getchannel('A').load()
    for y in range(h):
        for x in range(w):
            if alpha[x, y]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and alpha[nx, ny]:
                    out.putpixel((x, y), rgba(c))
                    break
    return out


# --- terrain ----------------------------------------------------------------
def water(frame):
    img = new(16, 16)
    rect(img, (0, 0, 15, 15), WATER)
    for i, (x, y) in enumerate([(1, 2), (9, 5), (4, 9), (12, 12)]):
        step = 2 if i % 2 == 0 else -2
        for k in range(3):
            put(img, (x + frame * step + k) % 16, y, WATER_L)
    for x, y in [(6, 7), (14, 1), (2, 14)]:
        for k in range(2):
            put(img, (x - frame + k) % 16, y, WATER_D)
    sx, sy = [(5, 3), (11, 9), (2, 11)][frame]
    put(img, sx, sy, WATER_S)
    return img


# Sand edge width per row, repeats every tile so the shore tiles vertically.
SHORE_EDGE = [5, 5, 6, 6, 6, 5, 5, 4, 4, 5, 5, 6, 6, 5, 5, 5]


def shore(frame):
    """Grass on the left, water on the right (the sea is east of the city)."""
    img = water(frame)
    for y, edge in enumerate(SHORE_EDGE):
        for x in range(edge):
            put(img, x, y, GRASS)
        put(img, edge, y, SAND)
        put(img, edge + 1, y, SAND)
        put(img, edge + 2, y, WATER_L if (y + frame) % 3 else WATER_S)
    for x, y in [(1, 3), (3, 10), (2, 13)]:
        put(img, x, y, GRASS_D)
    return img


def dock(edge):
    img = new(16, 16)
    rect(img, (0, 0, 15, 15), WOOD)
    for x in (3, 7, 11, 15):
        rect(img, (x, 0, x, 15), WOOD_D)
    for x in (0, 4, 8, 12):
        rect(img, (x, 0, x, 15), DIRT)
    if edge == 'top':
        rect(img, (0, 0, 15, 0), OUT)
        for x in (1, 9):
            rect(img, (x, 1, x + 1, 2), OUT)
    else:
        rect(img, (0, 14, 15, 14), WOOD_D)
        rect(img, (0, 15, 15, 15), OUT)
    return img


def conveyor(frame):
    img = new(16, 16)
    rect(img, (0, 2, 15, 13), NAVY)
    rect(img, (0, 3, 15, 12), STONE_DD)
    for x in range(-3, 16, 3):
        rect(img, (x + frame, 4, x + frame, 11), STONE)
    rect(img, (0, 2, 15, 2), STONE_L)
    rect(img, (0, 13, 15, 13), OUT)
    for x in (3, 11):
        rect(img, (x, 14, x + 1, 15), OUT)
    return img


# --- harbour ------------------------------------------------------------------
def container(colours):
    roof, body, ribs = colours
    img = new(32, 16)
    rect(img, (0, 0, 31, 15), OUT)
    rect(img, (1, 1, 30, 3), roof)
    rect(img, (1, 4, 30, 14), body)
    for x in range(3, 29, 3):
        rect(img, (x, 5, x, 13), ribs)
    rect(img, (26, 5, 26, 13), OUT)
    rect(img, (1, 14, 30, 14), ribs)
    return img


def ship():
    img = new(96, 40)
    d = ImageDraw.Draw(img)
    # cargo: two tiers of little containers
    colours = [c[1] for c in CONTAINER_COLOURS]
    for tier, y in enumerate((11, 16)):
        for i, x in enumerate(range(10, 66, 11)):
            c = colours[(i + tier * 2) % 4]
            rect(img, (x, y, x + 9, y + 4), c)
            rect(img, (x, y, x + 9, y), WHITE if tier else STONE_L)
    # bridge and funnel
    rect(img, (72, 5, 88, 20), STONE_L)
    rect(img, (73, 8, 87, 9), NAVY)
    rect(img, (73, 14, 87, 14), STONE)
    rect(img, (77, 0, 82, 4), RED)
    rect(img, (77, 2, 82, 2), WHITE)
    # hull
    d.polygon([(2, 21), (93, 21), (88, 35), (9, 35)], fill=rgba((52, 62, 104)))
    rect(img, (3, 21, 92, 22), STONE_L)
    d.polygon([(7, 31), (90, 31), (88, 35), (9, 35)], fill=rgba(RED))
    for x in range(16, 86, 9):
        put(img, x, 26, STONE_L)
        put(img, x + 1, 26, STONE_L)
    img = outline(img)
    # waterline foam (drawn after the outline so it sits on top of it)
    for x in range(6, 92):
        put(img, x, 36, WATER_S if x % 5 else WATER_L)
        if x % 3 == 0:
            put(img, x, 37, WATER_L)
    return img


def crane():
    img = new(48, 48)
    d = ImageDraw.Draw(img)
    for x in (6, 20):  # legs
        rect(img, (x, 15, x + 2, 43), ORANGE)
        rect(img, (x, 15, x, 43), YELLOW)
    for y in range(18, 42, 8):  # braces
        d.line([(9, y), (19, y + 6)], fill=rgba(ORANGE))
        d.line([(19, y), (9, y + 6)], fill=rgba(ORANGE))
    rect(img, (4, 13, 24, 16), ORANGE)
    rect(img, (4, 13, 24, 13), YELLOW)
    rect(img, (1, 7, 46, 10), ORANGE)  # boom out over the water
    rect(img, (1, 7, 46, 7), YELLOW)
    for x in range(3, 46, 3):
        put(img, x, 9, (170, 90, 30))
    rect(img, (8, 1, 18, 8), ORANGE)  # machine house
    rect(img, (10, 3, 13, 5), NAVY)
    rect(img, (4, 44, 10, 46), STONE_D)
    rect(img, (18, 44, 24, 46), STONE_D)
    img = outline(img)
    for y in range(12, 30):  # cable, hook and a hanging container
        put(img, 40, y, OUT)
    rect(img, (39, 29, 41, 30), STONE_D)
    hanging = container(CONTAINER_COLOURS[1]).resize((16, 8), Image.NEAREST)
    img.alpha_composite(hanging, (32, 31))
    return img


# --- network hill -----------------------------------------------------------------
def antenna(frame):
    img = new(16, 48)
    d = ImageDraw.Draw(img)
    rect(img, (2, 42, 13, 46), STONE)
    rect(img, (2, 42, 13, 42), STONE_L)
    rect(img, (1, 47, 14, 47), OUT)
    rect(img, (1, 42, 1, 46), OUT)
    rect(img, (14, 42, 14, 46), OUT)
    d.line([(3, 41), (7, 6)], fill=rgba(OUT))
    d.line([(12, 41), (8, 6)], fill=rgba(OUT))
    for y in range(10, 40, 6):  # zig-zag bracing
        half = 1 + (y - 6) * 4 // 35
        d.line([(7 - half, y), (8 + half, y + 5)], fill=rgba(STONE_D))
        d.line([(8 + half, y), (7 - half, y + 5)], fill=rgba(STONE_D))
    rect(img, (7, 2, 8, 6), OUT)
    rect(img, (3, 13, 5, 18), STONE_L)  # panel antennas
    rect(img, (10, 13, 12, 18), STONE_L)
    rect(img, (3, 13, 3, 18), STONE_D)
    rect(img, (12, 13, 12, 18), STONE_D)
    light = (255, 86, 64) if frame else RED_D
    rect(img, (7, 0, 8, 1), light)
    if frame:
        for x, y in [(6, 0), (9, 0), (6, 1), (9, 1), (7, 2), (8, 2)]:
            put(img, x, y, (255, 178, 160))
    return img


def dish():
    img = art([
        '................',
        '................',
        '.......wwww.....',
        '.....wwllllw....',
        '....wlllllllw...',
        '...wlllllllllw..',
        '...wlllllsllll..',
        '..wllllllsllll..',
        '..wlllllllllll..',
        '...wllllllllw...',
        '....wwllllww....',
        '.......ss.......',
        '......ssss......',
        '.....dddddd.....',
        '.....dddddd.....',
        '................',
    ], {'w': STONE, 'l': STONE_L, 's': STONE_D, 'd': STONE_D})
    return outline(img)


def rack(frame):
    img = new(16, 16)
    rect(img, (3, 1, 12, 15), NAVY)
    for y in (3, 7, 11):
        rect(img, (4, y, 11, y + 2), STONE_DD)
        rect(img, (4, y, 11, y), STONE_D)
    leds = [(5, 4), (7, 8), (5, 12), (9, 4), (9, 12)]
    for i, (x, y) in enumerate(leds):
        on = (i + frame) % 2 == 0
        put(img, x, y, (120, 230, 120) if on else (60, 110, 70))
    put(img, 10, 8, YELLOW if frame else ORANGE)
    return outline(img)


# --- plaza and street furniture ------------------------------------------------------
def fountain(frame):
    img = new(32, 32)
    d = ImageDraw.Draw(img)
    d.ellipse((2, 19, 29, 30), fill=rgba(STONE_D))
    rect(img, (2, 18, 29, 24), STONE)
    for x in range(5, 28, 5):
        rect(img, (x, 20, x, 24), STONE_D)
    d.ellipse((2, 11, 29, 24), fill=rgba(STONE_L))
    d.ellipse((5, 13, 26, 22), fill=rgba(WATER))
    d.ellipse((8, 15, 23, 21), fill=rgba(WATER_L) if frame else rgba(WATER))
    rect(img, (14, 7, 17, 18), STONE)
    rect(img, (14, 7, 14, 18), STONE_L)
    d.ellipse((10, 4, 21, 9), fill=rgba(STONE_L))
    d.ellipse((12, 5, 19, 8), fill=rgba(WATER))
    img = outline(img)
    drops = [(15, 1), (16, 0), (12, 3), (19, 3), (10, 6), (21, 6), (9, 12), (22, 12)]
    for i, (x, y) in enumerate(drops):
        if (i + frame) % 2 == 0:
            put(img, x, y, WATER_S)
        else:
            put(img, x, y + 1, WATER_L)
    for x, y in [(11, 17), (20, 16), (15, 19)]:
        put(img, x + frame, y, WATER_S)
    return img


def mailbox():
    img = art([
        '................',
        '................',
        '....bbbbbbb.....',
        '...bllllllbb.rr.',
        '...bllllllbb.rr.',
        '...bbbbbbbbb.r..',
        '...bnnnnnnbb.r..',
        '...bbbbbbbbbbr..',
        '...bbbbbbbbb....',
        '.......ww.......',
        '.......ww.......',
        '.......ww.......',
        '.......ww.......',
        '.......ww.......',
        '......dddd......',
        '................',
    ], {'b': WATER_D, 'l': WATER_L, 'n': NAVY, 'r': RED, 'w': WOOD, 'd': WOOD_D})
    return outline(img)


def board():
    img = new(32, 26)
    rect(img, (4, 16, 5, 24), WOOD_D)
    rect(img, (26, 16, 27, 24), WOOD_D)
    rect(img, (1, 1, 30, 17), WOOD)
    rect(img, (3, 3, 28, 15), DIRT)
    for x0, y0, x1, y1, c in [(5, 4, 11, 10, WHITE), (13, 5, 20, 13, PEACH), (22, 4, 27, 9, WHITE)]:
        rect(img, (x0, y0, x1, y1), c)
        for y in range(y0 + 2, y1, 2):
            rect(img, (x0 + 1, y, x1 - 1, y), STONE)
        put(img, (x0 + x1) // 2, y0, RED)
    return outline(img)


def stall():
    """Market stand with a red and white awning (the Redis stand)."""
    img = new(48, 32)
    rect(img, (4, 10, 5, 30), WOOD_D)
    rect(img, (42, 10, 43, 30), WOOD_D)
    rect(img, (2, 20, 45, 29), WOOD)
    rect(img, (2, 20, 45, 21), DIRT)
    for x in range(8, 40, 6):  # little red cubes on the counter
        rect(img, (x, 16, x + 3, 19), RED)
        rect(img, (x, 16, x + 3, 16), RED_L)
    for i, x in enumerate(range(1, 47, 4)):
        rect(img, (x, 1, x + 3, 9), RED if i % 2 == 0 else WHITE)
        rect(img, (x + 1, 10, x + 2, 11), RED if i % 2 == 0 else WHITE)
    return outline(img)


def chimney():
    img = new(16, 16)
    rect(img, (5, 4, 10, 14), STONE)
    rect(img, (5, 4, 6, 14), STONE_L)
    rect(img, (4, 3, 11, 4), STONE_D)
    rect(img, (7, 7, 8, 7), STONE_DD)
    rect(img, (7, 11, 8, 11), STONE_DD)
    return outline(img)


def logo_github():
    img = art([
        '................',
        '.....kkkkkk.....',
        '...kkkkkkkkkk...',
        '..kkwkkkkkkwkk..',
        '..kkwwwwwwwwkk..',
        '.kkkwwwwwwwwkkk.',
        '.kkwwwwwwwwwwkk.',
        '.kkwwwwwwwwwwkk.',
        '.kkwwwwwwwwwwkk.',
        '.kkkwwwwwwwwkkk.',
        '..kkkkwwwwkkkk..',
        '..kwkkwwwwkkkk..',
        '...kwwwwwwkkk...',
        '.....kwwwwk.....',
        '................',
        '................',
    ], {'k': NAVY, 'w': WHITE})
    return outline(img)


def logo_linkedin():
    img = art([
        '................',
        '.bbbbbbbbbbbbbb.',
        '.bbbbbbbbbbbbbb.',
        '.bbwwbbbbbbbbbb.',
        '.bbwwbbbbbbbbbb.',
        '.bbbbbbbbbbbbbb.',
        '.bbwwbbwwbwwwbb.',
        '.bbwwbbwwwwwwwb.',
        '.bbwwbbwwwbbwwb.',
        '.bbwwbbwwbbbwwb.',
        '.bbwwbbwwbbbwwb.',
        '.bbwwbbwwbbbwwb.',
        '.bbbbbbbbbbbbbb.',
        '.bbbbbbbbbbbbbb.',
        '................',
        '................',
    ], {'b': LI_BLUE, 'w': WHITE})
    return outline(img)


# 5x5 letters for the interact bubble.
BUBBLE_LETTERS = {
    'E': ['#####', '#....', '####.', '#....', '#####'],
    'A': ['.###.', '#...#', '#####', '#...#', '#...#'],
}


def bubble(letter):
    img = new(13, 13)
    rect(img, (1, 0, 11, 10), OUT)
    rect(img, (0, 1, 12, 9), OUT)
    rect(img, (1, 1, 11, 9), WHITE)
    rect(img, (5, 11, 7, 11), OUT)
    put(img, 6, 12, OUT)
    put(img, 6, 10, WHITE)
    for y, row in enumerate(BUBBLE_LETTERS[letter]):
        for x, ch in enumerate(row):
            if ch == '#':
                put(img, 4 + x, 3 + y, OUT)
    return img


def shadow():
    img = new(12, 4)
    ImageDraw.Draw(img).ellipse((0, 0, 11, 3), fill=(*OUT, 80))
    return img


# --- sheets -------------------------------------------------------------------
def build_chars(dungeon):
    sheet = new(TILE * len(CHARACTERS), TILE)
    for i, index in enumerate(CHARACTERS):
        sprite = cell(dungeon, index)
        if i == 0:
            sprite = recolour_player(sprite)
        sheet.alpha_composite(sprite, (i * TILE, 0))
    return sheet


def recolour_player(sprite):
    px = sprite.load()
    for y in range(TILE):
        for x in range(TILE):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in PLAYER_RECOLOUR:
                px[x, y] = rgba(PLAYER_RECOLOUR[(r, g, b)])
    for x in range(6, 10):  # moustache under the nose
        px[x, 9] = rgba(PLAYER_RECOLOUR[(118, 59, 54)])
    for x in range(5, 11):  # jeans
        if px[x, 13][3] and px[x, 13][:3] != OUT:
            px[x, 13] = rgba((68, 76, 118))
    return sprite


def prop_list():
    """(name, [frames]) — frames of one prop share a size."""
    return [
        ('ship', [ship()]),
        ('crane', [crane()]),
        ('antenna', [antenna(0), antenna(1)]),
        ('stall', [stall()]),
        ('fountain', [fountain(0), fountain(1)]),
        ('board', [board()]),
        ('container', [container(c) for c in CONTAINER_COLOURS]),
        ('water', [water(f) for f in range(3)]),
        ('shore', [shore(f) for f in range(3)]),
        ('conveyor', [conveyor(f) for f in range(3)]),
        ('rack', [rack(0), rack(1)]),
        ('dock', [dock('top'), dock('bottom')]),
        ('mailbox', [mailbox()]),
        ('chimney', [chimney()]),
        ('dish', [dish()]),
        ('logoGithub', [logo_github()]),
        ('logoLinkedin', [logo_linkedin()]),
        ('bubble', [bubble('E'), bubble('A')]),
        ('shadow', [shadow()]),
    ]


def pack(props, width=256):
    """Shelf-pack each prop's frame strip. Returns (sheet, atlas)."""
    placed, x, y, shelf = [], 0, 0, 0
    for name, frames in sorted(props, key=lambda p: -p[1][0].height):
        w, h = frames[0].size
        strip = w * len(frames)
        if x + strip > width:
            x, y, shelf = 0, y + shelf, 0
        placed.append((name, frames, x, y))
        x, shelf = x + strip, max(shelf, h)
    sheet = new(width, y + shelf)
    atlas = {}
    for name, frames, px, py in placed:
        w, h = frames[0].size
        for i, frame in enumerate(frames):
            assert frame.size == (w, h), name
            sheet.alpha_composite(frame, (px + i * w, py))
        atlas[name] = {'x': px, 'y': py, 'w': w, 'h': h, 'frames': len(frames)}
    return sheet, atlas


def write_atlas_js(atlas, path=ATLAS_JS):
    lines = [f'    {name}: {{ x: {a["x"]}, y: {a["y"]}, w: {a["w"]}, h: {a["h"]}, frames: {a["frames"]} }},'
             for name, a in sorted(atlas.items())]
    path.write_text(
        '// Generated by scripts/build_city_art.py from the props sheet. Do not edit by hand.\n'
        'window.CITY_ATLAS = {\n' + '\n'.join(lines) + '\n};\n',
        encoding='utf-8', newline='\n',
    )


def main():
    town = Image.open(SRC / 'tiny-town.png').convert('RGBA')
    dungeon = Image.open(SRC / 'tiny-dungeon.png').convert('RGBA')
    IMG.mkdir(parents=True, exist_ok=True)
    town.save(IMG / 'tiles.png', optimize=True)
    build_chars(dungeon).save(IMG / 'chars.png', optimize=True)
    sheet, atlas = pack(prop_list())
    sheet.save(IMG / 'props.png', optimize=True)
    write_atlas_js(atlas)
    for name in ('tiles', 'chars', 'props'):
        print(f'{name}.png  {(IMG / f"{name}.png").stat().st_size:>6,} bytes')
    print(f'atlas.js  {len(atlas)} props, sheet {sheet.width}x{sheet.height}')


if __name__ == '__main__':
    main()
