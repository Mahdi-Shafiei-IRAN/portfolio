import pytest

@pytest.fixture
def project_data():
    return {
        'title': 'Django Blog',
        'description': 'A blog built with Django',
        'tech_stack': 'Python, Django, PostgreSQL',
        'order': 1,
    }
