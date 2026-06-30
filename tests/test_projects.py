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
