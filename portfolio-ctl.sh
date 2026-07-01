#!/bin/bash
# ============================================================
#  Mahdi — Portfolio  ·  Management CLI  (portfolio)
#  Manages the Dockerized Django stack at /opt/portfolio
#  Usage: portfolio
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

INSTALL_DIR='/opt/portfolio'
COMPOSE_FILE='docker-compose.server.yml'
PROJECT='portfolio'
ENV_FILE="${INSTALL_DIR}/.env"

[[ $EUID -ne 0 ]] && exec sudo bash "$0" "$@"
[[ -d "$INSTALL_DIR" ]] || { echo "Install dir ${INSTALL_DIR} not found."; exit 1; }
cd "$INSTALL_DIR" || exit 1

# Resolve compose command (explicit project name keeps this stack isolated)
if docker compose version &>/dev/null; then
    COMPOSE="docker compose -p ${PROJECT} -f ${COMPOSE_FILE}"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose -p ${PROJECT} -f ${COMPOSE_FILE}"
else
    echo "Docker Compose not found."; exit 1
fi

# ── helpers ──────────────────────────────────────────────────
get_env()  { grep -oP "(?<=^${1}=).*" "$ENV_FILE" 2>/dev/null | head -1; }
set_env()  { # set_env KEY VALUE  (escape & and | for sed)
    local v; v=$(printf '%s' "$2" | sed -e 's/[&|]/\\&/g')
    if grep -q "^${1}=" "$ENV_FILE"; then
        sed -i "s|^${1}=.*|${1}=${v}|" "$ENV_FILE"
    else
        echo "${1}=${2}" >> "$ENV_FILE"
    fi
}
pause() { echo ""; read -rp "$(echo -e "  ${DIM}Press Enter to continue...${NC}")" _; }
ok()    { echo -e "\n  ${GREEN}✓  $1${NC}"; }
fail()  { echo -e "\n  ${RED}✗  $1${NC}"; }
info()  { echo -e "  ${CYAN}·  $1${NC}"; }
warn()  { echo -e "  ${YELLOW}!  $1${NC}"; }
section() { echo -e "\n  ${BOLD}${BLUE}▸ $1${NC}"; echo -e "  ${DIM}────────────────────────────────────────${NC}"; }

domain() { get_env ALLOWED_HOSTS | cut -d, -f1; }

web_status() {
    local s; s=$($COMPOSE ps --status running --services 2>/dev/null | grep -c '^web$')
    [[ "$s" == "1" ]] && echo -e "${GREEN}● running${NC}" || echo -e "${RED}● stopped${NC}"
}
https_active() { grep -q "listen 443" /etc/nginx/sites-available/portfolio 2>/dev/null; }

header() {
    clear; echo ""
    echo -e "  ${BOLD}${CYAN}┌─────────────────────────────────────────────────────┐${NC}"
    echo -e "  ${BOLD}${CYAN}│${NC}             ${BOLD}Mahdi — Portfolio  ·  portfolio${NC}           ${BOLD}${CYAN}│${NC}"
    echo -e "  ${BOLD}${CYAN}└─────────────────────────────────────────────────────┘${NC}"
    echo ""
}

show_status() {
    local d proto; d=$(domain); proto="http"; https_active && proto="https"
    echo -e "  ${DIM}┌──────────────────────────────────────────────────┐${NC}"
    echo -e "  ${DIM}│${NC}  Web      $(web_status)"
    echo -e "  ${DIM}│${NC}  Website  ${CYAN}${proto}://${d}${NC}"
    echo -e "  ${DIM}│${NC}  Admin    ${CYAN}${proto}://${d}/admin/${NC}"
    echo -e "  ${DIM}│${NC}  SSL      $(https_active && echo -e "${GREEN}enabled${NC}" || echo -e "${YELLOW}HTTP only${NC}")"
    echo -e "  ${DIM}└──────────────────────────────────────────────────┘${NC}"
    echo ""
}

# ══════════════════════════════════════════════
#  MENU: Domain
# ══════════════════════════════════════════════
menu_domain() {
    while true; do
        header; section "Domain Management"
        echo ""
        echo -e "    Current domain: ${CYAN}$(domain)${NC}"
        echo ""
        echo "    [1]  Change domain (updates .env + nginx)"
        echo "    [2]  Issue / re-issue SSL certificate"
        echo "    [0]  ← Back"
        echo ""
        read -rp "  Choice: " ch
        case $ch in
        1)
            local old new; old=$(domain)
            read -rp "  New domain: " new
            [[ -z "$new" ]] && continue
            read -rp "  Also serve www.${new}? [Y/n]: " w
            local hosts="$new"; [[ ! "$w" =~ ^[Nn]$ ]] && hosts="${new},www.${new}"
            set_env ALLOWED_HOSTS "$hosts"
            # repoint host nginx server_name (space-separated) + reload
            sed -i "s/server_name .*/server_name ${hosts//,/ };/" /etc/nginx/sites-available/portfolio 2>/dev/null
            nginx -t 2>/dev/null && systemctl reload nginx
            $COMPOSE restart web >/dev/null 2>&1
            ok "Domain changed to ${new} — now issue SSL (option 2)"
            pause ;;
        2)
            local d w_d args; d=$(domain)
            args=(-d "$d")
            w_d=$(get_env ALLOWED_HOSTS | tr ',' '\n' | grep -E "^www\." | head -1)
            [[ -n "$w_d" ]] && args+=(-d "$w_d")
            info "Requesting certificate for ${d}..."
            if certbot --nginx "${args[@]}" --non-interactive --agree-tos \
                --email "admin@${d}" --redirect 2>&1 | tail -6; then
                ok "SSL enabled — https://${d}"
            else
                fail "SSL failed — check that DNS points here"
            fi
            pause ;;
        0) break ;;
        esac
    done
}

# ══════════════════════════════════════════════
#  MENU: Admin credentials  (Django superuser)
# ══════════════════════════════════════════════
menu_credentials() {
    while true; do
        header; section "Admin Credentials (Django superuser)"
        echo ""
        echo "    [1]  Reset a superuser's password"
        echo "    [2]  Create a new superuser"
        echo "    [0]  ← Back"
        echo ""
        read -rp "  Choice: " ch
        case $ch in
        1)
            read -rp "  Username: " u
            [[ -z "$u" ]] && continue
            local p p2
            while true; do
                read -rsp "  New password (min 8): " p; echo
                [[ ${#p} -lt 8 ]] && fail "Too short" && continue
                read -rsp "  Confirm: " p2; echo
                [[ "$p" == "$p2" ]] && break
                fail "Passwords do not match"
            done
            # Reset via Django shell (no echo of password into argv)
            if echo "from django.contrib.auth import get_user_model as g; u=g().objects.get(username='${u}'); u.set_password('${p}'); u.save(); print('OK')" \
                | $COMPOSE exec -T web python manage.py shell 2>/dev/null | grep -q OK; then
                ok "Password updated for '${u}'"
            else
                fail "User '${u}' not found"
            fi
            pause ;;
        2)
            read -rp "  New username (min 3): " u
            [[ ${#u} -lt 3 ]] && fail "Too short" && pause && continue
            read -rp "  Email: " e; [[ -z "$e" ]] && e="${u}@$(domain)"
            local p p2
            while true; do
                read -rsp "  Password (min 8): " p; echo
                [[ ${#p} -lt 8 ]] && fail "Too short" && continue
                read -rsp "  Confirm: " p2; echo
                [[ "$p" == "$p2" ]] && break
                fail "Passwords do not match"
            done
            if $COMPOSE exec -T -e DJANGO_SUPERUSER_PASSWORD="$p" web \
                python manage.py createsuperuser --noinput --username "$u" --email "$e" 2>/dev/null; then
                ok "Superuser '${u}' created"
            else
                fail "Could not create '${u}' (already exists?)"
            fi
            pause ;;
        0) break ;;
        esac
    done
}

# ══════════════════════════════════════════════
#  MENU: Service
# ══════════════════════════════════════════════
menu_service() {
    while true; do
        header; section "Service Management"; echo ""
        show_status
        echo "    [1]  Restart all"
        echo "    [2]  Stop all"
        echo "    [3]  Start all"
        echo "    [4]  Live logs  (Ctrl+C to exit)"
        echo "    [5]  Last 50 web log lines"
        echo "    [6]  Container status"
        echo "    [0]  ← Back"
        echo ""
        read -rp "  Choice: " ch
        case $ch in
        1) $COMPOSE restart && ok "Restarted"; pause ;;
        2) $COMPOSE stop && warn "Stopped"; pause ;;
        3) $COMPOSE up -d && ok "Started"; pause ;;
        4) $COMPOSE logs -f --tail=50 ;;
        5) $COMPOSE logs --tail=50 web; pause ;;
        6) $COMPOSE ps; pause ;;
        0) break ;;
        esac
    done
}

# ══════════════════════════════════════════════
#  MENU: Update  (git pull + rebuild, keep DB & media)
# ══════════════════════════════════════════════
menu_update() {
    header; section "Update Portfolio"
    echo ""
    echo -e "  This will:"
    echo -e "    ${DIM}·${NC} Pull the latest code (git)"
    echo -e "    ${DIM}·${NC} Rebuild the web image"
    echo -e "    ${DIM}·${NC} Apply migrations + collectstatic"
    echo -e "    ${DIM}·${NC} ${GREEN}Keep your database, media uploads, .env and SSL intact${NC}"
    echo ""
    read -rp "$(echo -e "  ${YELLOW}Proceed? [y/N]:${NC} ")" c
    [[ ! "$c" =~ ^[Yy]$ ]] && return

    info "Pulling latest code (.env, DB, media and host nginx site are preserved)..."
    if ! git -C "$INSTALL_DIR" pull --rebase 2>&1 | tail -3; then
        fail "git pull failed — check connectivity / local changes"; pause; return
    fi

    info "Rebuilding and restarting..."
    $COMPOSE up -d --build 2>&1 | tail -5

    info "Applying migrations..."
    $COMPOSE exec -T web python manage.py migrate --noinput 2>&1 | tail -3
    $COMPOSE exec -T web python manage.py collectstatic --noinput >/dev/null 2>&1 || true

    if [[ "$(web_status)" == *running* ]]; then
        ok "Update complete — web is running"
    else
        warn "Web container not running — check: portfolio → Service → logs"
    fi
    pause
}

# ══════════════════════════════════════════════
#  MENU: Backup / Restore  (Postgres dump + media)
# ══════════════════════════════════════════════
menu_backup() {
    while true; do
        header; section "Backup & Restore"
        echo ""
        echo -e "    Backups are stored in ${CYAN}${INSTALL_DIR}/backups/${NC}"
        echo ""
        echo "    [1]  Create backup  (database + media)"
        echo "    [2]  Restore from backup"
        echo "    [0]  ← Back"
        echo ""
        read -rp "  Choice: " ch
        case $ch in
        1)
            mkdir -p "${INSTALL_DIR}/backups"
            local ts file; ts=$(date +%Y%m%d-%H%M%S); file="backups/portfolio-${ts}.tar.gz"
            info "Dumping database..."
            $COMPOSE exec -T db pg_dump -U "$(get_env POSTGRES_USER)" "$(get_env POSTGRES_DB)" > "${INSTALL_DIR}/backups/db-${ts}.sql" 2>/dev/null \
                || { fail "pg_dump failed"; pause; continue; }
            info "Archiving media + database dump..."
            tar -czf "${INSTALL_DIR}/${file}" -C "$INSTALL_DIR" "backups/db-${ts}.sql" media 2>/dev/null
            rm -f "${INSTALL_DIR}/backups/db-${ts}.sql"
            ok "Backup created: ${file}"
            pause ;;
        2)
            ls -1 "${INSTALL_DIR}/backups/"*.tar.gz 2>/dev/null || { warn "No backups found"; pause; continue; }
            echo ""
            read -rp "  Backup filename (in backups/): " bf
            [[ -f "${INSTALL_DIR}/backups/${bf}" ]] || { fail "File not found"; pause; continue; }
            read -rp "$(echo -e "  ${RED}This overwrites current DB + media. Type 'yes':${NC} ")" conf
            [[ "$conf" != "yes" ]] && { warn "Cancelled"; pause; continue; }
            local tmp; tmp=$(mktemp -d)
            tar -xzf "${INSTALL_DIR}/backups/${bf}" -C "$tmp"
            info "Restoring media..."
            rm -rf "${INSTALL_DIR}/media"; cp -r "${tmp}/media" "${INSTALL_DIR}/media" 2>/dev/null
            info "Restoring database..."
            local sql; sql=$(find "$tmp" -name 'db-*.sql' | head -1)
            if [[ -n "$sql" ]]; then
                $COMPOSE exec -T db psql -U "$(get_env POSTGRES_USER)" -d "$(get_env POSTGRES_DB)" < "$sql" >/dev/null 2>&1 \
                    && ok "Database restored" || fail "DB restore had errors"
            fi
            rm -rf "$tmp"
            $COMPOSE restart web >/dev/null 2>&1
            ok "Restore complete"
            pause ;;
        0) break ;;
        esac
    done
}

# ══════════════════════════════════════════════
#  MENU: Uninstall
# ══════════════════════════════════════════════
menu_uninstall() {
    header; section "Uninstall Portfolio"
    echo ""
    echo -e "  ${RED}${BOLD}⚠  This will remove:${NC}"
    echo -e "    ${DIM}·${NC} All containers, the web image, and the Postgres volume (DATA LOSS)"
    echo -e "    ${DIM}·${NC} Project files at ${INSTALL_DIR}"
    echo -e "    ${DIM}·${NC} The 'portfolio' command and its cron renewal"
    echo ""
    read -rp "$(echo -e "  ${YELLOW}Keep a final backup first? [Y/n]:${NC} ")" kb
    if [[ ! "$kb" =~ ^[Nn]$ ]]; then
        mkdir -p "$HOME/portfolio-final-backup"
        local ts; ts=$(date +%Y%m%d-%H%M%S)
        $COMPOSE exec -T db pg_dump -U "$(get_env POSTGRES_USER)" "$(get_env POSTGRES_DB)" > "$HOME/portfolio-final-backup/db-${ts}.sql" 2>/dev/null
        cp -r "${INSTALL_DIR}/media" "$HOME/portfolio-final-backup/media-${ts}" 2>/dev/null
        info "Saved to ~/portfolio-final-backup/"
    fi
    echo ""
    read -rp "$(echo -e "  Type ${BOLD}yes${NC} to confirm uninstall: ")" f
    [[ "$f" != "yes" ]] && { warn "Cancelled"; pause; return; }

    info "Stopping containers and removing volumes..."
    $COMPOSE down -v --rmi local 2>/dev/null
    info "Removing host nginx site..."
    rm -f /etc/nginx/sites-enabled/portfolio /etc/nginx/sites-available/portfolio
    nginx -t 2>/dev/null && systemctl reload nginx
    info "Removing cron renewal..."
    ( crontab -l 2>/dev/null | grep -v 'certbot renew' ) | crontab - 2>/dev/null
    info "Removing files..."
    rm -rf "$INSTALL_DIR"
    rm -f /usr/local/bin/portfolio
    echo ""
    echo -e "  ${GREEN}${BOLD}✓  Uninstall complete.${NC}"
    echo -e "  ${DIM}Docker itself was left installed (remove with: apt remove docker-ce).${NC}"
    echo ""
    exit 0
}

# ══════════════════════════════════════════════
#  MAIN MENU
# ══════════════════════════════════════════════
while true; do
    header
    show_status
    echo -e "  ${BOLD}Main Menu${NC}"
    echo ""
    echo "    [1]  Domain & SSL"
    echo "    [2]  Admin credentials"
    echo "    [3]  Service management"
    echo "    [4]  Update to latest version"
    echo "    [5]  Backup & restore"
    echo ""
    echo -e "    ${RED}[6]  Uninstall${NC}"
    echo ""
    echo "    [0]  Exit"
    echo ""
    read -rp "  Choice: " choice
    case $choice in
    1) menu_domain ;;
    2) menu_credentials ;;
    3) menu_service ;;
    4) menu_update ;;
    5) menu_backup ;;
    6) menu_uninstall ;;
    0) echo ""; exit 0 ;;
    esac
done
