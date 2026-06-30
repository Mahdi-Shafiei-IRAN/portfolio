import pytest
from django.test import Client
from django.urls import reverse
from apps.projects.models import Project

@pytest.fixture
def client():
    return Client()

@pytest.mark.django_db
def test_home_returns_200(client):
    response = client.get('/')
    assert response.status_code == 200

@pytest.mark.django_db
def test_home_context_has_projects(client):
    Project.objects.create(title='Test', description='d', tech_stack='Python', order=1)
    response = client.get('/')
    assert 'projects' in response.context
    assert response.context['projects'].count() == 1

@pytest.mark.django_db
def test_home_context_has_skills(client):
    response = client.get('/')
    assert 'skills' in response.context
    assert 'Python' in response.context['skills']
    assert 'Django' in response.context['skills']

@pytest.mark.django_db
def test_home_uses_correct_template(client):
    response = client.get('/')
    assert 'core/home.html' in [t.name for t in response.templates]
