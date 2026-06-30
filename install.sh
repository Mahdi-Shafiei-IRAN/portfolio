#!/bin/bash
# ============================================================
#  Mahdi — Portfolio  ·  One-Command Installer (Ubuntu 20.04+)
#  Docker + Django + PostgreSQL + Nginx + Let's Encrypt
#
#  Usage (from a cloned repo):
#    sudo bash install.sh
#  Or one-liner (replace with your repo URL):
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
REPO_URL="https://github.com/Mahdi-Shafiei-IRAN/portfolio.git"   # <-- change to your repo
COMPOSE_FILE="docker-compose.prod.yml"

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
echo -e "  ${DIM}│${NC}  ${CY}Stack    ${NC}  Django · PostgreSQL · Nginx · Docker  ${DIM}│${NC}"
echo -e "  ${DIM}│${NC}  ${CY}Features ${NC}  Admin Panel · SSL · Auto-Renew        ${DIM}│${NC}"
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
#  STEP 2 — System dependencies (Docker + git)
# ══════════════════════════════════════════════
step "Installing System Dependencies"

apt-get update -qq
apt-get install -y -qq curl git ca-certificates >/dev/null
success "curl, git installed"

if command -v docker &>/dev/null; then
    success "Docker already installed: $(docker --version | cut -d, -f1)"
else
    info "Installing Docker Engine..."
    curl -fsSL https://get.docker.com | sh >/dev/null 2>&1 \
        || error "Docker installation failed — check internet connection."
    systemctl enable --now docker
    success "Docker installed"
fi

# Compose v2 (docker compose) or legacy docker-compose
if docker compose version &>/dev/null; then
    COMPOSE="docker compose -f ${COMPOSE_FILE}"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose -f ${COMPOSE_FILE}"
else
    info "Installing docker compose plugin..."
    apt-get install -y -qq docker-compose-plugin >/dev/null 2>&1
    docker compose version &>/dev/null \
        && COMPOSE="docker compose -f ${COMPOSE_FILE}" \
        || error "Docker Compose not available — install it and re-run."
fi
success "Using: ${COMPOSE}"

# ══════════════════════════════════════════════
#  STEP 3 — Fetch project
# ══════════════════════════════════════════════
step "Fetching Project Files"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || true)"
if [[ -n "$SCRIPT_DIR" ]] && [[ -f "${SCRIPT_DIR}/manage.py" ]] && [[ -f "${SCRIPT_DIR}/${COMPOSE_FILE}" ]]; then
    info "Using local project files from ${SCRIPT_DIR}"
    mkdir -p "$INSTALL_DIR"
    # Copy everything except local-only artifacts
    rsync -a --delete \
        --exclude '.venv' --exclude 'db.sqlite3' --exclude '.git' \
        --exclude 'graphify-out' --exclude '__pycache__' \
        "${SCRIPT_DIR}/" "$INSTALL_DIR/" 2>/dev/null \
        || cp -r "${SCRIPT_DIR}/." "$INSTALL_DIR/"
else
    info "Cloning from ${REPO_URL}..."
    rm -rf "$INSTALL_DIR"
    git clone --depth=1 "$REPO_URL" "$INSTALL_DIR" \
        || error "Could not clone repository. Check REPO_URL and internet connection."
fi
cd "$INSTALL_DIR" || error "Install dir not found"
success "Project ready at ${INSTALL_DIR}"

# ══════════════════════════════════════════════
#  STEP 4 — Generate .env
# ══════════════════════════════════════════════
step "Generating Configuration"

rand() { tr -dc 'a-zA-Z0-9' </dev/urandom | head -c "$1"; }
SECRET_KEY="$(rand 64)"
PG_DB="portfolio"
PG_USER="portfolio"
PG_PASS="$(rand 32)"

ALLOWED="${DOMAIN}"
[[ -n "$WWW_DOMAIN" ]] && ALLOWED="${DOMAIN},${WWW_DOMAIN}"

cat > "${INSTALL_DIR}/.env" <<EOF
# Generated by install.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
SECRET_KEY=${SECRET_KEY}
DEBUG=False
ALLOWED_HOSTS=${ALLOWED}

# Database (web container reaches Postgres at host 'db')
DATABASE_URL=postgres://${PG_USER}:${PG_PASS}@db:5432/${PG_DB}
POSTGRES_DB=${PG_DB}
POSTGRES_USER=${PG_USER}
POSTGRES_PASSWORD=${PG_PASS}
EOF
chmod 600 "${INSTALL_DIR}/.env"
success ".env written (DEBUG=False, generated SECRET_KEY + DB password)"

# Inject the real domain into both nginx configs
for conf in nginx/default.conf nginx/default.ssl.conf; do
    [[ -f "$conf" ]] || continue
    if [[ -n "$WWW_DOMAIN" ]]; then
        sed -i "s/yourdomain.com www.yourdomain.com/${DOMAIN} ${WWW_DOMAIN}/g" "$conf"
    else
        sed -i "s/yourdomain.com www.yourdomain.com/${DOMAIN}/g" "$conf"
    fi
    sed -i "s/yourdomain.com/${DOMAIN}/g" "$conf"
done
success "Nginx configs pointed at ${DOMAIN} (HTTP bootstrap active)"

# ══════════════════════════════════════════════
#  STEP 5 — Build & start the stack
# ══════════════════════════════════════════════
step "Building & Starting Containers"

$COMPOSE up -d --build 2>&1 | tail -6 \
    || error "docker compose build/up failed — see output above."

info "Waiting for database & web to become healthy..."
for i in $(seq 1 30); do
    sleep 2
    if $COMPOSE exec -T web python manage.py check >/dev/null 2>&1; then
        break
    fi
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

success "Stack is up (HTTP)"

# ══════════════════════════════════════════════
#  STEP 6 — SSL via Let's Encrypt (dockerized certbot)
# ══════════════════════════════════════════════
step "Obtaining SSL Certificate"

CB_DOMAINS=(-d "$DOMAIN")
[[ -n "$WWW_DOMAIN" ]] && CB_DOMAINS+=(-d "$WWW_DOMAIN")

info "Requesting certificate for ${DOMAIN}${WWW_DOMAIN:+ + }${WWW_DOMAIN}..."
if $COMPOSE run --rm certbot certonly \
    --webroot --webroot-path /var/www/certbot \
    "${CB_DOMAINS[@]}" \
    --email "$ADMIN_EMAIL" --agree-tos --no-eff-email --non-interactive 2>&1 | tail -8; then

    if [[ -d "/var/lib/docker/volumes" ]] && $COMPOSE run --rm certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        info "Switching Nginx to HTTPS config..."
        cp nginx/default.ssl.conf nginx/default.conf
        $COMPOSE restart nginx
        success "HTTPS active — https://${DOMAIN}"
        SSL_OK=true
    else
        warn "Certificate issued but verification was inconclusive — switching anyway."
        cp nginx/default.ssl.conf nginx/default.conf
        $COMPOSE restart nginx
        SSL_OK=true
    fi
else
    warn "SSL issuance failed (DNS not pointed here yet?). Site is live over HTTP."
    warn "After DNS propagates, run:  portfolio   →  Domain management → Re-issue SSL"
    SSL_OK=false
fi

# Auto-renew: cron runs certbot renew + reloads nginx (twice daily)
RENEW_CMD="cd ${INSTALL_DIR} && ${COMPOSE} run --rm certbot renew --webroot --webroot-path /var/www/certbot --quiet && ${COMPOSE} restart nginx"
( crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "0 3,15 * * * ${RENEW_CMD}" ) | crontab -
success "Auto-renewal scheduled (cron, twice daily)"

# ══════════════════════════════════════════════
#  STEP 7 — Install management CLI
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
