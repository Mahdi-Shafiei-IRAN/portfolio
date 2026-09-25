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
