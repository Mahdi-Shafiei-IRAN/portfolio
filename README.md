# Mahdi — Portfolio

A hand-drawn, drag-and-drop portfolio built with Django. Visitors drag a role —
**Backend**, **DevOps** or **Network** — into "Hi! I'm a [Drop Here]" and land on
a page themed for that role, listing its projects from the Django admin.

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

## Edit the Content

- All copy (bio, links, skills, role taglines) lives in `apps/core/content.py`.
- Projects: add them in the admin, or import public GitHub repos from a machine
  that can reach GitHub:

  ```bash
  python manage.py sync_github --user Mahdi-Shafiei-IRAN
  ```

  A project's **category** decides which role page lists it. It is guessed from
  the repo topics on first import; change it in the admin any time.
- Resume: commit a PDF at `static/resume.pdf`; the About page shows a download
  button only when that file exists.

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

Static files are collected with content-hashed names and pre-compressed `.gz`
copies; Nginx serves them directly with a one-year cache.

See [INSTALL.md](INSTALL.md) for the full flow and the `portfolio` management CLI
(domains, SSL, credentials, logs, update, backup, uninstall).

## Run Tests

```bash
pytest tests/ -v
```

## Credits

- Doodle artwork by [Dylan Chen](https://dylanchen.me)
  ([PotatoSlop/portfolio](https://github.com/PotatoSlop/portfolio)), used with
  permission. The drag-a-role landing is inspired by his portfolio.
- Fonts (SIL Open Font License, self-hosted): DM Mono, Nunito, Archivo, Gochi Hand.
