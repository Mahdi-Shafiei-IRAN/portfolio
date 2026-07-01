#!/bin/bash
# ============================================================
#  Mahdi — Portfolio  ·  One-Command Installer (Ubuntu 20.04+)
#  Django + PostgreSQL in Docker, behind the server's host Nginx.
#  Coexists with other projects on the same server (shared host
#  nginx on :80/:443); each project stays in its own folder.
#
#  Usage (from a cloned repo):
#    sudo bash install.sh
#  Or one-liner:
#    sudo bash <(curl -Ls https://raw.githubusercontent.com/Mahdi-Shafiei-IRAN/portfolio/main/install.sh)
# ============================================================
set -o pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

info()    { echo -e "${CYAN}[•]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }

# ---- Must be root ----
[[ $EUID -ne 0 ]] && error "Please run as root:  sudo bash install.sh"

# ---- Config ----
INSTALL_DIR="/opt/portfolio"
REPO_URL="https://github.com/Mahdi-Shafiei-IRAN/portfolio.git"
PROJECT="portfolio"
COMPOSE_FILE="docker-compose.server.yml"

clear
C1='\033[38;5;42m'; C2='\033[38;5;36m'; CW='\033[1;37m'; CG='\033[38;5;46m'; CY='\033[38;5;226m'
echo ""
echo -e "${C1}  ██████╗  ██████╗ ██████╗ ████████╗███████╗ ██████╗ ██╗     ██╗ ██████╗ "
echo -e "${C1}  ██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██║     ██║██╔═══██╗"
echo -e "${C2}  ██████╔╝██║   ██║██████╔╝   ██║   █████╗  ██║   ██║██║     ██║██║   ██║"
echo -e "${C2}  ██╔═══╝ ██║   ██║██╔══██╗   ██║   ██╔══╝  ██║   ██║██║     ██║██║   ██║"
echo -e "${C1}  ██║     ╚██████╔╝██║  ██║   ██║   ██║     ╚██████╔╝███████╗██║╚██████╔╝"
echo -e "${C1}  ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝ ${NC}"
echo ""
echo -e "  ${CW}Mahdi — Portfolio${NC}  ${DIM}+${NC}  ${CG}One-Click Installer${NC}"
echo ""
echo -e "  ${DIM}┌─────────────────────────────────────────────────┐${NC}"
echo -e "  ${DIM}│${NC}  ${CY}Stack    ${NC}  Django · PostgreSQL · Docker         ${DIM}│${NC}"
echo -e "  ${DIM}│${NC}  ${CY}Proxy    ${NC}  Shared host Nginx + Let's Encrypt     ${DIM}│${NC}"
echo -e "  ${DIM}│${NC}  ${CY}Platform ${NC}  Ubuntu 20.04+                         ${DIM}│${NC}"
echo -e "  ${DIM}└─────────────────────────────────────────────────┘${NC}"
echo ""

# ══════════════════════════════════════════════
#  STEP 1 — Collect information
# ══════════════════════════════════════════════
step "Setup Information"
echo ""
echo -e "  ${YELLOW}Point your domain's DNS A record at this server's IP before continuing.${NC}"
echo -e "  ${YELLOW}The domain must resolve here for SSL to be issued.${NC}"
echo ""

while true; do
    read -rp "$(echo -e "  ${BOLD}Domain${NC} (e.g. mahdi.dev): ")" DOMAIN
    [[ -n "$DOMAIN" ]] && break
    echo -e "  ${RED}Domain cannot be empty.${NC}"
done

read -rp "$(echo -e "  ${BOLD}Also serve www.${DOMAIN}?${NC} [Y/n]: ")" USE_WWW
if [[ "$USE_WWW" =~ ^[Nn]$ ]]; then WWW_DOMAIN=""; else WWW_DOMAIN="www.${DOMAIN}"; fi

echo ""
while true; do
    read -rp "$(echo -e "  ${BOLD}Admin username${NC}: ")" ADMIN_USER
    [[ ${#ADMIN_USER} -ge 3 ]] && break
    echo -e "  ${RED}Username must be at least 3 characters.${NC}"
done

read -rp "$(echo -e "  ${BOLD}Admin email${NC} (used for SSL + admin login): ")" ADMIN_EMAIL
[[ -z "$ADMIN_EMAIL" ]] && ADMIN_EMAIL="admin@${DOMAIN}"

while true; do
    read -rsp "$(echo -e "  ${BOLD}Admin password${NC} (min 8 characters): ")" ADMIN_PASS; echo ""
    if [[ ${#ADMIN_PASS} -lt 8 ]]; then
        echo -e "  ${RED}Password must be at least 8 characters.${NC}"; continue
    fi
    read -rsp "$(echo -e "  ${BOLD}Confirm password${NC}: ")" ADMIN_PASS2; echo ""
    [[ "$ADMIN_PASS" == "$ADMIN_PASS2" ]] && break
    echo -e "  ${RED}Passwords do not match. Try again.${NC}"
done

echo ""
echo -e "  ${GREEN}Configuration summary:${NC}"
echo -e "  Website URL : ${CYAN}https://${DOMAIN}${NC}"
echo -e "  Admin URL   : ${CYAN}https://${DOMAIN}/admin/${NC}"
echo -e "  Admin user  : ${CYAN}${ADMIN_USER}${NC}"
echo ""
read -rp "$(echo -e "  ${BOLD}Proceed with installation? [y/N]:${NC} ")" CONFIRM
[[ ! "$CONFIRM" =~ ^[Yy]$ ]] && echo "Aborted." && exit 0

# ══════════════════════════════════════════════
#  STEP 2 — System dependencies (Docker + host Nginx + Certbot)
# ══════════════════════════════════════════════
step "Installing System Dependencies"

apt-get update -qq
apt-get install -y -qq curl git ca-certificates rsync nginx certbot python3-certbot-nginx >/dev/null
success "curl, git, rsync, nginx, certbot installed"

if command -v docker &>/dev/null; then
    success "Docker already installed: $(docker --version | cut -d, -f1)"
else
    info "Installing Docker Engine..."
    curl -fsSL https://get.docker.com | sh >/dev/null 2>&1 \
        || error "Docker installation failed — check internet connection."
    systemctl enable --now docker
    success "Docker installed"
fi

if docker compose version &>/dev/null; then
    COMPOSE="docker compose -p ${PROJECT} -f ${COMPOSE_FILE}"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose -p ${PROJECT} -f ${COMPOSE_FILE}"
else
    info "Installing docker compose plugin..."
    apt-get install -y -qq docker-compose-plugin >/dev/null 2>&1
    docker compose version &>/dev/null \
        && COMPOSE="docker compose -p ${PROJECT} -f ${COMPOSE_FILE}" \
        || error "Docker Compose not available — install it and re-run."
fi
success "Using: ${COMPOSE}"

systemctl enable --now nginx >/dev/null 2>&1
success "Host nginx active"

# ══════════════════════════════════════════════
#  STEP 3 — Fetch project (preserve data on re-run)
# ══════════════════════════════════════════════
step "Fetching Project Files"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || true)"
if [[ -n "$SCRIPT_DIR" ]] && [[ -f "${SCRIPT_DIR}/manage.py" ]] && [[ -f "${SCRIPT_DIR}/${COMPOSE_FILE}" ]]; then
    info "Using local project files from ${SCRIPT_DIR}"
    mkdir -p "$INSTALL_DIR"
    # Never overwrite runtime data: .env, media, staticfiles, backups are excluded.
    rsync -a \
        --exclude '.venv' --exclude '.git' --exclude 'db.sqlite3' \
        --exclude 'graphify-out' --exclude '__pycache__' \
        --exclude '.env' --exclude 'media' --exclude 'staticfiles' --exclude 'backups' \
        "${SCRIPT_DIR}/" "$INSTALL_DIR/" 2>/dev/null \
        || cp -r "${SCRIPT_DIR}/." "$INSTALL_DIR/"
elif [[ -d "${INSTALL_DIR}/.git" ]]; then
    info "Existing install found — pulling latest code (data preserved)..."
    git -C "$INSTALL_DIR" pull --rebase 2>&1 | tail -3 || warn "git pull failed — using existing code"
else
    info "Cloning from ${REPO_URL}..."
    # Only wipe the dir if there is no existing install to protect.
    [[ -f "${INSTALL_DIR}/.env" ]] || rm -rf "$INSTALL_DIR"
    git clone --depth=1 "$REPO_URL" "$INSTALL_DIR" \
        || error "Could not clone repository. Check REPO_URL and internet connection."
fi
cd "$INSTALL_DIR" || error "Install dir not found"
mkdir -p "${INSTALL_DIR}/staticfiles" "${INSTALL_DIR}/media"
success "Project ready at ${INSTALL_DIR}"

# ══════════════════════════════════════════════
#  STEP 4 — Pick a free localhost port for Gunicorn
# ══════════════════════════════════════════════
step "Allocating Local Port"

pick_port() {
    local p
    for p in $(seq 8001 8099); do
        ss -ltn 2>/dev/null | grep -q ":${p} " || { echo "$p"; return; }
    done
    echo 8001
}
WEB_PORT="$(grep -oP '(?<=^WEB_PORT=).*' .env 2>/dev/null || true)"
[[ -z "$WEB_PORT" ]] && WEB_PORT="$(pick_port)"
success "Gunicorn will listen on 127.0.0.1:${WEB_PORT}"

# ══════════════════════════════════════════════
#  STEP 5 — Generate / preserve .env
# ══════════════════════════════════════════════
step "Generating Configuration"

rand() { tr -dc 'a-zA-Z0-9' </dev/urandom | head -c "$1"; }
ALLOWED="${DOMAIN}"
[[ -n "$WWW_DOMAIN" ]] && ALLOWED="${DOMAIN},${WWW_DOMAIN}"

if [[ ! -f .env ]]; then
    PG_PASS="$(rand 32)"
    cat > .env <<EOF
# Generated by install.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
SECRET_KEY=$(rand 64)
DEBUG=False
ALLOWED_HOSTS=${ALLOWED}
WEB_PORT=${WEB_PORT}

# Database (web container reaches Postgres at host 'db')
DATABASE_URL=postgres://portfolio:${PG_PASS}@db:5432/portfolio
POSTGRES_DB=portfolio
POSTGRES_USER=portfolio
POSTGRES_PASSWORD=${PG_PASS}
EOF
    chmod 600 .env
    success ".env written (generated SECRET_KEY + DB password, DEBUG=False)"
else
    sed -i "s|^ALLOWED_HOSTS=.*|ALLOWED_HOSTS=${ALLOWED}|" .env
    grep -q '^WEB_PORT=' .env || echo "WEB_PORT=${WEB_PORT}" >> .env
    success "Existing .env preserved (updated ALLOWED_HOSTS)"
fi

# ══════════════════════════════════════════════
#  STEP 6 — Build & start the stack
# ══════════════════════════════════════════════
step "Building & Starting Containers"

$COMPOSE up -d --build 2>&1 | tail -6 \
    || error "docker compose build/up failed — see output above."

info "Waiting for web to become healthy..."
for i in $(seq 1 30); do
    sleep 2
    $COMPOSE exec -T web python manage.py check >/dev/null 2>&1 && break
done

info "Running migrations..."
$COMPOSE exec -T web python manage.py migrate --noinput 2>&1 | tail -4

info "Collecting static files..."
$COMPOSE exec -T web python manage.py collectstatic --noinput >/dev/null 2>&1 || true

info "Creating admin superuser..."
$COMPOSE exec -T \
    -e DJANGO_SUPERUSER_PASSWORD="$ADMIN_PASS" \
    web python manage.py createsuperuser --noinput \
    --username "$ADMIN_USER" --email "$ADMIN_EMAIL" 2>/dev/null \
    && success "Admin user '${ADMIN_USER}' created" \
    || warn "Superuser may already exist — change the password later with: portfolio"

success "App is up on 127.0.0.1:${WEB_PORT}"

# ══════════════════════════════════════════════
#  STEP 7 — Host Nginx site (routes this domain only)
# ══════════════════════════════════════════════
step "Configuring Host Nginx"

SERVER_NAMES="${DOMAIN}"
[[ -n "$WWW_DOMAIN" ]] && SERVER_NAMES="${DOMAIN} ${WWW_DOMAIN}"

sed -e "s|__SERVER_NAMES__|${SERVER_NAMES}|g" \
    -e "s|__WEB_PORT__|${WEB_PORT}|g" \
    -e "s|__INSTALL_DIR__|${INSTALL_DIR}|g" \
    deploy/nginx-site.conf.template > /etc/nginx/sites-available/portfolio
ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio

if nginx -t 2>/dev/null; then
    systemctl reload nginx
    success "Nginx routing ${SERVER_NAMES} → 127.0.0.1:${WEB_PORT}"
else
    nginx -t
    error "nginx config invalid — see output above."
fi

# ══════════════════════════════════════════════
#  STEP 8 — SSL via host Certbot
# ══════════════════════════════════════════════
step "Obtaining SSL Certificate"

CB_DOMAINS=(-d "$DOMAIN")
[[ -n "$WWW_DOMAIN" ]] && CB_DOMAINS+=(-d "$WWW_DOMAIN")

info "Requesting certificate for ${DOMAIN}${WWW_DOMAIN:+ + }${WWW_DOMAIN}..."
if certbot --nginx "${CB_DOMAINS[@]}" \
    --non-interactive --agree-tos --email "$ADMIN_EMAIL" --redirect 2>&1 | tail -8; then
    success "HTTPS active — https://${DOMAIN}"
    SSL_OK=true
else
    warn "SSL issuance failed (DNS not pointed here yet?). Site is live over HTTP."
    warn "After DNS propagates, run:  portfolio  → Domain & SSL → Issue SSL"
    SSL_OK=false
fi

# certbot's systemd timer handles renewal; add a cron fallback if it's absent.
systemctl enable certbot.timer >/dev/null 2>&1 \
    || ( crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "0 3 * * * certbot renew --quiet" ) | crontab -
success "Auto-renewal scheduled"

# ══════════════════════════════════════════════
#  STEP 9 — Install management CLI
# ══════════════════════════════════════════════
step "Installing 'portfolio' Management Tool"

if [[ -f "${INSTALL_DIR}/portfolio-ctl.sh" ]]; then
    cp "${INSTALL_DIR}/portfolio-ctl.sh" /usr/local/bin/portfolio
    chmod +x /usr/local/bin/portfolio
    success "Installed — type 'portfolio' anytime to manage your site"
else
    warn "portfolio-ctl.sh not found — management CLI skipped"
fi

# ══════════════════════════════════════════════
#  Done
# ══════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║        Installation Complete! ✓           ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"
PROTO="http"; $SSL_OK && PROTO="https"
echo -e "  🌐  Website   : ${CYAN}${PROTO}://${DOMAIN}${NC}"
echo -e "  🔧  Admin     : ${CYAN}${PROTO}://${DOMAIN}/admin/${NC}"
echo -e "  👤  Username  : ${CYAN}${ADMIN_USER}${NC}"
echo ""
echo -e "  ${YELLOW}Management tool:${NC}  ${BOLD}portfolio${NC}  — domains, credentials, logs, update, backup"
echo ""
echo -e "  ${DIM}Add your projects at${NC} ${CYAN}${PROTO}://${DOMAIN}/admin/projects/project/${NC}"
echo -e "  ${DIM}Add a hero video to${NC} static/video/hero.webm ${DIM}(see static/video/README.md)${NC}"
echo ""
$SSL_OK || echo -e "  ${YELLOW}⚠  SSL pending — run 'portfolio' once DNS resolves to issue the certificate.${NC}\n"
