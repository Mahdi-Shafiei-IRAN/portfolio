import pytest
from django.core.cache import cache
from django.test import Client

from apps.resume.models import ContactMessage

SEND = '/resume/contact/send/'


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
