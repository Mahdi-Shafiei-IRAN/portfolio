import pytest
from django.core.cache import cache
from django.test import Client
from django.utils.html import escape

from apps.resume import content as resume_content
from apps.resume.models import ContactMessage
from apps.resume.templatetags.resume_tags import convex

SEND = '/resume/contact/send/'
PAGES = {
    '/resume/': 'resume/hero.html',
    '/resume/about/': 'resume/about.html',
    '/resume/work/': 'resume/work.html',
    '/resume/skills/': 'resume/skills.html',
    '/resume/contact/': 'resume/contact.html',
}


# --- shell --------------------------------------------------------------------

def test_convex_wraps_each_character_and_escapes():
    assert convex('A <b') == (
        '<span class="convex-word"><span class="convex-char">A</span>'
        '<span class="convex-char">\xa0</span><span class="convex-char">&lt;</span>'
        '<span class="convex-char">b</span></span>'
    )


@pytest.mark.django_db
@pytest.mark.parametrize('url,template', PAGES.items())
def test_resume_page_renders_on_its_own_base(client, url, template):
    r = client.get(url)
    assert r.status_code == 200
    names = [t.name for t in r.templates]
    assert template in names and 'resume/base.html' in names
    assert 'base.html' not in names          # independent from the doodle layout
    html = r.content.decode()
    for route in PAGES:
        assert f'href="{route}"' in html     # drawer lists every section
    assert 'Back to the sketchbook' in html


@pytest.mark.django_db
def test_hero_has_titles_import_map_and_black_hole(client):
    html = client.get('/resume/').content.decode()
    assert resume_content.RESUME['title_1'] in html and resume_content.RESUME['title_2'] in html
    assert '"three": "/static/vendor/three-0.184.0/three.module.min.js"' in html
    assert '"three/addons/": "/static/vendor/three-0.184.0/addons/"' in html
    assert 'resume/js/blackhole.js' in html
    assert 'resume/js/starfield.js' not in html   # starfield only behind inner pages


@pytest.mark.django_db
def test_section_order_prev_next(client):
    about = client.get('/resume/about/').context
    assert (about['prev_url'], about['next_url'], about['next_key']) == ('/resume/', '/resume/work/', 'work')
    contact = client.get('/resume/contact/').context
    assert (contact['prev_url'], contact['next_url']) == ('/resume/skills/', '')


@pytest.mark.django_db
def test_about_has_journey_activity_and_visualizers(client):
    from apps.projects.models import Project
    Project.objects.create(title='Only One', description='d', tech_stack='Python')
    html = client.get('/resume/about/').content.decode()
    for stage in resume_content.RESUME['journey']:
        assert escape(stage['title']) in html
    for key in ('django', 'api', 'docker', 'installer'):
        assert f'data-visualizer="{key}"' in html
    assert '1 Project</span>' in html
    assert 'img/profile.jpg' in html


@pytest.mark.django_db
def test_resume_pdf_buttons_follow_file(client, monkeypatch):
    monkeypatch.setattr('apps.resume.views.finders.find', lambda path: None)
    assert 'resume.pdf' not in client.get('/resume/about/').content.decode()
    monkeypatch.setattr('apps.resume.views.finders.find', lambda path: 'static/resume.pdf')
    assert 'resume.pdf' in client.get('/resume/about/').content.decode()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()


# --- contact endpoint --------------------------------------------------------

@pytest.mark.django_db
def test_send_stores_message(client):
    r = client.post(SEND, {'name': 'Alex', 'email': 'a@b.co', 'message': 'Hello there!'})
    assert r.status_code == 200 and r.json() == {'ok': True}
    m = ContactMessage.objects.get()
    assert (m.name, m.email, m.message, m.is_read) == ('Alex', 'a@b.co', 'Hello there!', False)


@pytest.mark.django_db
def test_send_rejects_invalid(client):
    r = client.post(SEND, {'name': '', 'message': 'hi'})
    assert r.status_code == 400 and r.json()['ok'] is False
    assert ContactMessage.objects.count() == 0


@pytest.mark.django_db
def test_honeypot_is_silently_dropped(client):
    r = client.post(SEND, {'name': 'Bot', 'message': 'Buy things now', 'website': 'spam.example'})
    assert r.status_code == 200 and r.json() == {'ok': True}
    assert ContactMessage.objects.count() == 0


@pytest.mark.django_db
def test_rate_limit_five_per_hour(client):
    for i in range(5):
        assert client.post(SEND, {'name': 'A', 'message': f'message {i}'}).status_code == 200
    r = client.post(SEND, {'name': 'A', 'message': 'one more'})
    assert r.status_code == 429 and r.json()['ok'] is False
    assert ContactMessage.objects.count() == 5


@pytest.mark.django_db
def test_send_requires_csrf():
    r = Client(enforce_csrf_checks=True).post(SEND, {'name': 'A', 'message': 'Hello there!'})
    assert r.status_code == 403


def test_send_rejects_get(client):
    assert client.get(SEND).status_code == 405
