#!/bin/sh
# Collect static files before Gunicorn serves a single request. STATIC_ROOT is
# the bind-mounted staticfiles/ that host nginx serves, and the Manifest storage
# needs its staticfiles.json to match the running code — collecting at every
# container start keeps them in step (and a failure stops the container loudly).
set -e
python manage.py collectstatic --noinput --clear --verbosity 0
exec "$@"
