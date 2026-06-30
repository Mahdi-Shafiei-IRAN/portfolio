FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps for psycopg2 and Pillow
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements/prod.txt requirements/prod.txt
RUN pip install --no-cache-dir -r requirements/prod.txt

COPY . .

# Collect static for production image.
# These ARGs only satisfy settings import at build time — collectstatic never
# connects to the database, so the DATABASE_URL value just needs to parse.
ARG DJANGO_SETTINGS_MODULE=config.settings.prod
ARG SECRET_KEY=build-time-dummy-key
ARG ALLOWED_HOSTS=localhost
ARG DATABASE_URL=postgres://build:build@localhost:5432/build
RUN python manage.py collectstatic --no-input

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "60"]
