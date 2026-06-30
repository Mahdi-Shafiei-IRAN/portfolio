# Deploying the Portfolio — One-Command Installer

A Docker-based installer for Ubuntu 20.04+ that brings up the full production
stack (Django + Gunicorn + PostgreSQL + Nginx + Let's Encrypt SSL) and installs
a `portfolio` management CLI.

## What you need first

1. An Ubuntu 20.04+ server (VPS).
2. A domain with a DNS **A record** pointing at the server's IP.
   *(SSL can't be issued until the domain resolves to this server.)*
3. Root / sudo access.

## Install

**From a clone of this repo on the server:**

```bash
git clone https://github.com/yourusername/portfolio.git
cd portfolio
sudo bash install.sh
```

**Or one-line (edit the URL to your repo):**

```bash
sudo bash <(curl -Ls https://raw.githubusercontent.com/yourusername/portfolio/main/install.sh)
```

The installer asks for:

| Prompt | Example |
|--------|---------|
| Domain | `mahdi.dev` |
| Serve `www.`? | `Y` |
| Admin username | `mahdi` |
| Admin email | `you@example.com` |
| Admin password | (min 8 chars) |

Then it automatically:

1. Installs Docker (if missing) + git.
2. Copies the project to `/opt/portfolio`.
3. Generates `.env` (random `SECRET_KEY` + DB password, `DEBUG=False`).
4. Points the Nginx configs at your domain.
5. Builds and starts the stack (`docker compose -f docker-compose.prod.yml`).
6. Runs migrations, `collectstatic`, and creates your admin superuser.
7. Obtains a Let's Encrypt certificate and switches Nginx to HTTPS.
8. Schedules twice-daily SSL auto-renewal (cron).
9. Installs the `portfolio` management command.

> If DNS hasn't propagated yet, the site still comes up over HTTP and SSL is
> skipped — run `portfolio` → **Domain & SSL** → *Issue SSL* once it resolves.

## Managing the site — `portfolio`

Type `portfolio` on the server for a menu:

```
  ┌─────────────────────────────────────────────────────┐
  │             Mahdi — Portfolio  ·  portfolio          │
  └─────────────────────────────────────────────────────┘

  Web      ● running
  Website  https://mahdi.dev
  Admin    https://mahdi.dev/admin/
  SSL      enabled

  Main Menu
    [1]  Domain & SSL
    [2]  Admin credentials
    [3]  Service management   (restart / logs / status)
    [4]  Update to latest version   (git pull + rebuild, keeps data)
    [5]  Backup & restore      (Postgres dump + media)
    [6]  Uninstall
    [0]  Exit
```

- **Update** pulls the latest code, rebuilds, and migrates — your database,
  media uploads, `.env`, and SSL certificate are preserved.
- **Backup** writes `backups/portfolio-<timestamp>.tar.gz` (database dump +
  uploaded media); **Restore** loads one back.

## After install

- Add projects: `https://<domain>/admin/projects/project/`
- Add a hero video: drop `hero.webm` / `hero.mp4` into `static/video/`
  (see `static/video/README.md`), then `portfolio` → Update or restart.

## Before publishing the repo

Replace the placeholder repo URL in `install.sh` (`REPO_URL=`) and the
`yourusername` references with your real GitHub repo so the one-line installer
and the CLI's *Update* command work.
