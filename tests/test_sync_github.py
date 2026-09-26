from datetime import date

import pytest

from apps.projects.management.commands.sync_github import guess_category, parse_created, sync_repos
from apps.projects.models import Project


def repo(name, topics=(), created_at='2025-04-03T10:00:00Z', **extra):
    """A minimal GitHub /users/<u>/repos item."""
    data = {
        'name': name, 'fork': False, 'private': False, 'language': 'Python',
        'topics': list(topics), 'description': f'{name} description',
        'html_url': f'https://github.com/u/{name}', 'homepage': '',
        'stargazers_count': 0, 'created_at': created_at,
    }
    data.update(extra)
    return data


@pytest.mark.parametrize('topics,expected', [
    (['docker'], 'devops'),
    (['CI'], 'devops'),
    (['kubernetes', 'go'], 'devops'),
    (['networking'], 'network'),
    (['Network'], 'network'),
    (['django', 'api'], 'backend'),
    ([], 'backend'),
    (None, 'backend'),
])
def test_guess_category(topics, expected):
    assert guess_category(topics) == expected


def test_parse_created():
    assert parse_created('2025-04-03T10:00:00Z') == date(2025, 4, 3)
    assert parse_created(None) is None
    assert parse_created('') is None


@pytest.mark.django_db
def test_sync_creates_project_with_category_and_start_date():
    assert sync_repos([repo('api-gateway', ['docker'])]) == (1, 0)
    p = Project.objects.get(title='Api Gateway')
    assert p.category == 'devops'
    assert p.started_on == date(2025, 4, 3)
    assert p.github_url == 'https://github.com/u/api-gateway'


@pytest.mark.django_db
def test_sync_keeps_only_web_homepages():
    sync_repos([repo('good', homepage='https://good.dev'), repo('bad', homepage='javascript:alert(1)')])
    assert Project.objects.get(title='Good').live_url == 'https://good.dev'
    assert Project.objects.get(title='Bad').live_url == ''


@pytest.mark.django_db
def test_sync_skips_forks_private_and_skip_list():
    sync_repos([repo('forked', fork=True), repo('secret', private=True), repo('portfolio')])
    assert Project.objects.count() == 0


@pytest.mark.django_db
def test_resync_keeps_edited_category_but_updates_description():
    sync_repos([repo('api-gateway', ['docker'])])
    Project.objects.filter(title='Api Gateway').update(category='network')
    assert sync_repos([repo('api-gateway', ['docker'], description='new text')]) == (0, 1)
    p = Project.objects.get(title='Api Gateway')
    assert p.category == 'network'
    assert p.description == 'new text'


@pytest.mark.django_db
def test_resync_keeps_admin_text_order_and_live_url():
    """Repos without a GitHub description get a placeholder; once the admin writes
    real text (and picks an order and live link), a re-sync must not undo it."""
    sync_repos([repo('karshar', description=None, homepage='')])
    p = Project.objects.get(title='Karshar')
    assert p.description == 'A Python project.'
    Project.objects.filter(pk=p.pk).update(
        description='A Django job board.', tech_stack='Django, PostgreSQL', order=7,
        live_url='https://karshar.example')
    sync_repos([repo('other'), repo('karshar', description=None, homepage='', topics=['django'])])
    p.refresh_from_db()
    assert p.description == 'A Django job board.'
    assert p.tech_stack == 'Django, PostgreSQL'
    assert p.order == 7
    assert p.live_url == 'https://karshar.example'


@pytest.mark.django_db
def test_resync_refreshes_untouched_placeholder_projects():
    sync_repos([repo('tool', description=None)])
    sync_repos([repo('tool', description=None, language='Go', topics=['cli'])])
    p = Project.objects.get(title='Tool')
    assert p.description == 'A Go project.'
    assert p.tech_stack == 'Go, cli'
