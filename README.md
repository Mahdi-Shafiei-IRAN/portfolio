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

One command on a fresh Ubuntu 20.04+ server:

```bash
sudo bash <(curl -Ls https://raw.githubusercontent.com/Mahdi-Shafiei-IRAN/portfolio/main/install.sh)
```

It installs Docker + the server's host Nginx + Certbot, runs Django and
PostgreSQL as a two-service Docker stack (`docker-compose.server.yml`) with
Gunicorn bound to `127.0.0.1:<free-port>`, then points the **host** Nginx at your
domain and issues SSL with `certbot --nginx`. Because it reuses the shared host
Nginx on ports 80/443 (instead of running its own), it **coexists with other
projects** on the same server — each install lives in its own `/opt/portfolio`
folder with its own Docker project name.

See [INSTALL.md](INSTALL.md) for the full flow and the `portfolio` management CLI
(domains, SSL, credentials, logs, update, backup, uninstall).

## Run Tests

```bash
pytest tests/ -v
```
