import json
import re

import pytest

from apps.city.lots import assign_lots
from apps.core import content as site_content
from apps.projects.models import Project


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
