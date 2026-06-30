# config/settings/prod.py
from .base import *  # noqa: F401,F403
import dj_database_url
from decouple import config

DEBUG = False

DATABASES = {
    'default': dj_database_url.parse(config('DATABASE_URL'))
}

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
