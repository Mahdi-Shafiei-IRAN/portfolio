# Mahdi — Portfolio

Django portfolio website with admin-managed projects, dark theme, hero video, and AOS animations.

## Local Development

```bash
python -m venv .venv && source .venv/bin/activate  # Linux/macOS
# OR: .venv\Scripts\activate                        # Windows
pip install -r requirements/dev.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Visit: http://localhost:8000 · Admin: http://localhost:8000/admin/

## Add a Hero Video

Download a dark looping video from Coverr.co and place at:
- `static/video/hero.webm`
- `static/video/hero.mp4`

See `static/video/README.md` for compression instructions.

## Personalize

Before going live, update these placeholders:
- `templates/core/home.html` — `your@email.com`, `yourusername` (GitHub, LinkedIn)
- `templates/base.html` — `Mahdi` logo text and meta description
- `apps/core/views.py` — `SKILLS` list

## Production Deployment (VPS)

1. Copy `.env.example` → `.env`, fill in production values
2. Replace `yourdomain.com` in `nginx/default.conf`
3. ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
   docker-compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
   ```
4. Get SSL certificate:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
     --webroot --webroot-path /var/www/certbot \
     -d yourdomain.com -d www.yourdomain.com \
     --email your@email.com --agree-tos --no-eff-email
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

## Run Tests

```bash
pytest tests/ -v
```
