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
git clone https://github.com/Mahdi-Shafiei-IRAN/portfolio.git
cd portfolio
sudo bash install.sh
```

**Or one-line (edit the URL to your repo):**

```bash
sudo bash <(curl -Ls https://raw.githubusercontent.com/Mahdi-Shafiei-IRAN/portfolio/main/install.sh)
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

1. Installs Docker (if missing), plus the server's **host Nginx** and Certbot.
2. Copies the project to `/opt/portfolio` (its own folder — data-safe on re-run).
3. Generates `.env` (random `SECRET_KEY` + DB password, `DEBUG=False`) and picks
   a free local port for Gunicorn.
4. Builds and starts the two-service Docker stack
   (`docker compose -p portfolio -f docker-compose.server.yml`) with Gunicorn on
   `127.0.0.1:<port>`.
5. Runs migrations, `collectstatic`, and creates your admin superuser.
6. Adds a **host Nginx** site that routes your domain → `127.0.0.1:<port>` and
   serves `/static/` + `/media/` from disk.
7. Obtains a Let's Encrypt certificate with `certbot --nginx` (adds the
   HTTP→HTTPS redirect).
8. Enables SSL auto-renewal (certbot systemd timer, cron fallback).
9. Installs the `portfolio` management command.

Because it reuses the shared host Nginx on ports 80/443 rather than binding them
itself, it **coexists with other sites** already running on the server.

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

## Notes

- The installer and the CLI's *Update* command pull from
  `github.com/Mahdi-Shafiei-IRAN/portfolio` (branch `main`). If you fork or
  rename the repo, update `REPO_URL` in `install.sh` accordingly.
- Running the installer again is safe: it preserves your existing `.env`,
  database, and uploaded media.
