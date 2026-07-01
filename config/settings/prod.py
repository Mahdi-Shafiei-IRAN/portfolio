# config/settings/prod.py
from .base import *  # noqa: F401,F403
import dj_database_url
from decouple import config, Csv

DEBUG = False

DATABASES = {
    'default': dj_database_url.parse(config('DATABASE_URL'))
}

# Host nginx terminates TLS and sets X-Forwarded-Proto, so Django knows the
# original scheme. The HTTP->HTTPS redirect is handled by nginx/certbot, so
# Django's own redirect is OFF by default (prevents a redirect loop / broken
# site during the pre-SSL bootstrap window). Flip SECURE_SSL_REDIRECT=True in
# .env only if you ever run without an nginx-level redirect.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Admin login POSTs over HTTPS on a custom domain need the origin trusted,
# or Django returns 403 CSRF. Derive from ALLOWED_HOSTS.
_hosts = config('ALLOWED_HOSTS', default='', cast=Csv())
CSRF_TRUSTED_ORIGINS = [f'https://{h}' for h in _hosts if h]
