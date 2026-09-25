from datetime import date

import pytest
from apps.projects.models import Project

@pytest.mark.django_db
def test_project_str(project_data):
    p = Project.objects.create(**project_data)
    assert str(p) == 'Django Blog'

@pytest.mark.django_db
def test_project_default_ordering(project_data):
    Project.objects.create(title='Second', description='', tech_stack='', order=2)
    Project.objects.create(title='First', description='', tech_stack='', order=1)
    titles = list(Project.objects.values_list('title', flat=True))
    assert titles == ['First', 'Second']

@pytest.mark.django_db
def test_project_is_featured_default_false(project_data):
    p = Project.objects.create(**project_data)
    assert p.is_featured is False

@pytest.mark.django_db
def test_project_optional_urls(project_data):
    p = Project.objects.create(**project_data)
    assert p.github_url == ''
    assert p.live_url == ''


@pytest.mark.django_db
def test_project_category_defaults_to_backend(project_data):
    p = Project.objects.create(**project_data)
    assert p.category == Project.Category.BACKEND == 'backend'


def test_category_values_in_role_order():
    assert Project.Category.values == ['backend', 'devops', 'network']


def test_tech_list_splits_on_commas():
    p = Project(tech_stack='Python, Django ,, PostgreSQL ')
    assert p.tech_list == ['Python', 'Django', 'PostgreSQL']


def test_tech_list_empty():
    assert Project(tech_stack='').tech_list == []


def test_date_range_ongoing():
    assert Project(started_on=date(2025, 4, 3)).date_range == 'APR 2025 – PRESENT'


def test_date_range_finished():
    p = Project(started_on=date(2025, 3, 1), ended_on=date(2025, 6, 30))
    assert p.date_range == 'MAR 2025 – JUN 2025'


def test_date_range_without_start_is_empty():
    assert Project(ended_on=date(2025, 6, 30)).date_range == ''


@pytest.mark.django_db
def test_admin_changelist_renders(admin_client, project_data):
    Project.objects.create(**project_data)
    assert admin_client.get('/admin/projects/project/').status_code == 200
