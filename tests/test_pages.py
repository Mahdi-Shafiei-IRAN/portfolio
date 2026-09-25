from datetime import date

import pytest

from apps.core import content
from apps.projects.models import Project


def test_role_keys_match_project_categories():
    assert list(content.ROLES) == Project.Category.values


@pytest.mark.django_db
@pytest.mark.parametrize('url,template', [
    ('/backend/', 'core/role_backend.html'),
    ('/devops/', 'core/role_devops.html'),
    ('/network/', 'core/role_network.html'),
    ('/about/', 'core/about.html'),
    ('/contact/', 'core/contact.html'),
])
def test_page_renders_with_base(client, url, template):
    response = client.get(url)
    assert response.status_code == 200
    names = [t.name for t in response.templates]
    assert template in names
    assert 'base.html' in names


@pytest.mark.django_db
def test_role_page_lists_only_its_category(client):
    Project.objects.create(title='API Kit', description='d', tech_stack='Python', category='backend')
    Project.objects.create(title='Ship It', description='d', tech_stack='Docker', category='devops')
    html = client.get('/backend/').content.decode()
    assert 'API Kit' in html
    assert 'Ship It' not in html


@pytest.mark.django_db
def test_empty_role_shows_placeholder(client):
    assert 'Projects coming soon' in client.get('/network/').content.decode()


@pytest.mark.django_db
def test_project_card_shows_date_tech_and_links(client):
    Project.objects.create(
        title='API Kit', description='d', tech_stack='Python, Django', category='backend',
        github_url='https://github.com/u/api-kit', started_on=date(2025, 4, 1),
    )
    html = client.get('/backend/').content.decode()
    assert 'APR 2025 – PRESENT' in html
    assert '<li>Django</li>' in html
    assert 'https://github.com/u/api-kit' in html
    assert 'Live ↗' not in html


@pytest.mark.django_db
def test_role_page_has_theme_class(client):
    assert 'theme-devops' in client.get('/devops/').content.decode()


@pytest.mark.django_db
def test_city_links_hidden_while_disabled(client, monkeypatch):
    monkeypatch.setattr(content, 'CITY_ENABLED', False)
    html = client.get('/backend/').content.decode()
    assert 'Enter the city' not in html
    assert 'Backend City' not in html


@pytest.mark.django_db
def test_city_links_shown_when_enabled(client, monkeypatch):
    monkeypatch.setattr(content, 'CITY_ENABLED', True)
    html = client.get('/devops/').content.decode()
    assert '/city/?spawn=devops' in html
    assert 'Backend City' in html


@pytest.mark.django_db
def test_menu_and_footer_on_every_page(client):
    html = client.get('/about/').content.decode()
    for href in ['/backend/', '/devops/', '/network/', '/about/', '/contact/']:
        assert f'href="{href}"' in html
    assert 'Doodle by' in html and 'Dylan Chen' in html


@pytest.mark.django_db
def test_resume_button_follows_file_presence(client, monkeypatch):
    monkeypatch.setattr('apps.core.views.finders.find', lambda path: None)
    assert 'Download Resume' not in client.get('/about/').content.decode()
    monkeypatch.setattr('apps.core.views.finders.find', lambda path: 'static/resume.pdf')
    assert 'Download Resume' in client.get('/about/').content.decode()


@pytest.mark.django_db
def test_contact_page_lists_links(client):
    html = client.get('/contact/').content.decode()
    assert f'mailto:{content.CONTACT["email"]}' in html
    assert content.CONTACT['github'] in html
    assert content.CONTACT['linkedin'] in html
