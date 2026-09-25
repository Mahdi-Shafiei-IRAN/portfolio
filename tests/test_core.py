import pytest


@pytest.mark.django_db
def test_home_renders_landing(client):
    response = client.get('/')
    assert response.status_code == 200
    names = [t.name for t in response.templates]
    assert 'core/home.html' in names
    assert 'base.html' in names


@pytest.mark.django_db
def test_home_chips_are_links_in_role_order(client):
    html = client.get('/').content.decode()
    positions = [html.index(f'href="/{key}/" data-role="{key}"') for key in ('backend', 'devops', 'network')]
    assert positions == sorted(positions)


@pytest.mark.django_db
def test_home_has_greeting_drop_slot_and_doodle(client):
    html = client.get('/').content.decode()
    assert 'data-text="Hi! I&#x27;m"' in html
    assert 'class="drop-slot"' in html
    assert 'img/doodle/waving.gif' in html


@pytest.mark.django_db
def test_home_has_no_legacy_assets(client):
    html = client.get('/').content.decode()
    for legacy in ('cinematic', 'frames/', 'gsap', 'lenis'):
        assert legacy not in html
