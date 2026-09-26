import json
import re
from pathlib import Path

import pytest
from PIL import Image

from apps.city.lots import LOTS_PER_DISTRICT, assign_lots
from apps.city.views import PANEL_FIELDS
from apps.core import content as site_content
from apps.projects.models import Project
from scripts import build_city_art, make_portrait


def payload(html):
    match = re.search(r'<script id="city-data" type="application/json">(.*?)</script>', html, re.S)
    return json.loads(match.group(1))


# --- lot assignment -----------------------------------------------------------

def test_assign_lots_pads_empty_lots():
    assert assign_lots(['a', 'b']) == {'lots': ['a', 'b', None, None, None, None], 'overflow': []}


def test_assign_lots_caps_at_six_and_overflows_in_order():
    result = assign_lots(list('abcdefgh'))
    assert result['lots'] == list('abcdef')
    assert result['overflow'] == ['g', 'h']


def test_assign_lots_custom_size():
    assert assign_lots(['a'], per=2) == {'lots': ['a', None], 'overflow': []}


# --- page ---------------------------------------------------------------------

@pytest.mark.django_db
def test_city_page_renders(client):
    r = client.get('/city/')
    assert r.status_code == 200
    names = [t.name for t in r.templates]
    assert 'city/city.html' in names
    html = r.content.decode()
    assert 'vendor/kaplay-3001.0.19/kaplay.js' in html
    assert 'game/js/map.js' in html and 'game/js/game.js' in html
    assert '<noscript>' in html


@pytest.mark.django_db
def test_city_payload_places_projects_by_district(client):
    Project.objects.create(title='API Kit', description='d', tech_stack='Python', category='backend', order=2)
    Project.objects.create(title='Auth Service', description='d', tech_stack='Django', category='backend', order=1)
    Project.objects.create(title='Deployer', description='d', tech_stack='Docker', category='devops')
    data = payload(client.get('/city/').content.decode())
    backend = data['districts']['backend']
    assert [lot and lot['title'] for lot in backend['lots']] == ['Auth Service', 'API Kit', None, None, None, None]
    assert data['districts']['devops']['lots'][0]['title'] == 'Deployer'
    assert data['districts']['network']['lots'] == [None] * 6
    assert set(data) >= {'districts', 'skills', 'npcs', 'links', 'roleUrls', 'resumeUrl', 'portrait', 'spawn'}
    assert data['roleUrls'] == {'backend': '/backend/', 'devops': '/devops/', 'network': '/network/'}


@pytest.mark.django_db
def test_city_payload_sends_only_panel_fields(client):
    Project.objects.create(title='API Kit', description='d', tech_stack='Python', problem='long text')
    lot = payload(client.get('/city/').content.decode())['districts']['backend']['lots'][0]
    assert set(lot) == set(PANEL_FIELDS)


@pytest.mark.django_db
def test_equal_order_keeps_houses_stable(client):
    first = Project.objects.create(title='First', description='d', tech_stack='x', order=0)
    Project.objects.create(title='Second', description='d', tech_stack='x', order=0)
    Project.objects.filter(pk=first.pk).update(title='First')   # touch the row, as an edit would
    lots = payload(client.get('/city/').content.decode())['districts']['backend']['lots']
    assert [lots[0]['title'], lots[1]['title']] == ['First', 'Second']


def test_map_has_one_building_per_lot():
    """map.js hard-codes the houses; it must match LOTS_PER_DISTRICT or projects vanish."""
    source = (GAME / 'js' / 'map.js').read_text(encoding='utf-8')
    for district in ('backend', 'devops', 'network'):
        indexes = sorted(int(i) for i in re.findall(rf"\{{ lot: \['{district}', (\d+)\]", source))
        assert indexes == list(range(LOTS_PER_DISTRICT)), district


@pytest.mark.django_db
def test_city_overflow_goes_to_notice_board(client):
    for i in range(8):
        Project.objects.create(title=f'P{i}', description='d', tech_stack='x', category='network', order=i)
    data = payload(client.get('/city/').content.decode())
    assert [p['title'] for p in data['districts']['network']['overflow']] == ['P6', 'P7']


@pytest.mark.django_db
@pytest.mark.parametrize('query,expected', [
    ('', 'gate'), ('?spawn=backend', 'backend'), ('?spawn=devops', 'devops'),
    ('?spawn=network', 'network'), ('?spawn=../../etc', 'gate'),
])
def test_city_spawn_is_validated(client, query, expected):
    assert payload(client.get('/city/' + query).content.decode())['spawn'] == expected


@pytest.mark.django_db
def test_city_links_are_live_now(client):
    assert site_content.CITY_ENABLED is True
    html = client.get('/devops/').content.decode()
    assert '/city/?spawn=devops' in html and 'Enter the city' in html
    assert 'Backend City' in client.get('/').content.decode()


# --- art ----------------------------------------------------------------------

GAME = Path(__file__).resolve().parent.parent / 'static' / 'game'


def test_art_is_built_and_small():
    files = [GAME / 'img' / f'{name}.png' for name in ('tiles', 'chars', 'props', 'portrait')]
    assert all(f.exists() for f in files)
    assert sum(f.stat().st_size for f in files) < 500_000


def test_atlas_entries_fit_the_props_sheet():
    sheet = Image.open(GAME / 'img' / 'props.png')
    entries = re.findall(r'(\w+): \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+), frames: (\d+) \}',
                         (GAME / 'js' / 'atlas.js').read_text(encoding='utf-8'))
    names = {e[0] for e in entries}
    assert {'water', 'shore', 'dock', 'ship', 'antenna', 'fountain', 'bubble'} <= names
    for name, x, y, w, h, frames in entries:
        x, y, w, h, frames = map(int, (x, y, w, h, frames))
        assert x + w * frames <= sheet.width and y + h <= sheet.height, name


def test_chars_sheet_is_one_row_of_people():
    sheet = Image.open(GAME / 'img' / 'chars.png')
    assert sheet.height == 16 and sheet.width == 16 * len(build_city_art.CHARACTERS)


def test_pack_never_overlaps():
    props = [(f'p{i}', [Image.new('RGBA', (w, h))] * n)
             for i, (w, h, n) in enumerate([(48, 48, 1), (16, 16, 3), (96, 40, 1), (32, 16, 4), (16, 48, 2)])]
    _, atlas = build_city_art.pack(props, width=128)
    boxes = [(a['x'], a['y'], a['x'] + a['w'] * a['frames'], a['y'] + a['h']) for a in atlas.values()]
    for i, a in enumerate(boxes):
        assert a[2] <= 128
        for b in boxes[i + 1:]:
            assert a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1]


def test_pixelate_limits_size_and_palette():
    photo = Image.effect_noise((200, 200), 64).convert('RGB')
    out = make_portrait.pixelate(photo, size=48, colours=24)
    assert out.size == (96, 96)
    assert len(out.convert('RGB').getcolors(10_000)) <= 24
