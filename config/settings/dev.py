# config/settings/dev.py
from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# runserver and pytest use plain storage: tests run with DEBUG=False, and the
# Manifest storage needs a collected staticfiles.json to resolve {% static %}.
# tests/test_static.py exercises the real Manifest storage explicitly.
STORAGES = {
    **STORAGES,
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
