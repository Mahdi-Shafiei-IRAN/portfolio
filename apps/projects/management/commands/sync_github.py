"""ساختِ خودکارِ پروژه‌ها از روی ریپوهای عمومیِ گیت‌هاب.

نکته: سرورِ ایرانی معمولاً به گیت‌هاب دسترسی ندارد، پس این دستور را از روی یک
سیستم که به گیت‌هاب می‌رسد اجرا کن؛ سپس با «loaddata» یا دیپلوی، دیتابیس را ببر.

    python manage.py sync_github --user Mahdi-Shafiei-IRAN

فورک‌ها و ریپوهای فهرستِ SKIP نادیده گرفته می‌شوند. پروژه‌ها بر اساسِ نامِ ریپو
upsert می‌شوند (github_url کلید یکتا نیست، پس با title تطبیق می‌دهیم).

دسته (category) از روی topicهای ریپو حدس زده می‌شود و تاریخِ شروع از تاریخِ ساختِ
ریپو می‌آید؛ هر دو فقط هنگامِ ساختِ ردیف تنظیم می‌شوند تا ویرایش‌های ادمین بمانند.

در همگام‌سازیِ دوباره: لینک‌ها و ستاره (is_featured) از گیت‌هاب می‌آیند؛ توضیح فقط
وقتی عوض می‌شود که خودِ ریپو توضیح داشته باشد؛ فهرستِ فناوری فقط وقتی که توضیحِ
پروژه هنوز همان متنِ خودکار است؛ ترتیب (order) دست نمی‌خورد. پس متنی که در ادمین
نوشته شده با sync پاک نمی‌شود.
"""

import json
import urllib.request
from datetime import date

from django.core.management.base import BaseCommand

from apps.projects.models import Project, web_url

SKIP = {"portfolio", "test", "mahdi-shafiei-iran"}

DEVOPS_TOPICS = {"docker", "devops", "ci", "cicd", "kubernetes"}
NETWORK_TOPICS = {"network", "networking"}


def guess_category(topics):
    """Map GitHub repo topics to a Project.Category value."""
    lowered = {t.lower() for t in topics or []}
    if lowered & DEVOPS_TOPICS:
        return Project.Category.DEVOPS
    if lowered & NETWORK_TOPICS:
        return Project.Category.NETWORK
    return Project.Category.BACKEND


def parse_created(created_at):
    """'2025-04-03T10:00:00Z' -> date(2025, 4, 3); None or '' -> None."""
    if not created_at:
        return None
    return date.fromisoformat(created_at[:10])


def fetch_repos(user, token=""):
    url = f"https://api.github.com/users/{user}/repos?per_page=100&sort=pushed"
    req = urllib.request.Request(url, headers={"User-Agent": "portfolio-sync"})
    if token:
        req.add_header("Authorization", f"token {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def placeholder(lang):
    """The description written for a repo that has none on GitHub."""
    return f"A {lang} project." if lang else "A software project."


def has_placeholder(project):
    """True while the description is still the one sync wrote. The language it was
    written for is the first entry of the synced tech stack ("Python, docker")."""
    first = (project.tech_stack or "").split(",")[0].strip()
    return project.description in {"", placeholder(""), placeholder(first)}


def sync_repos(repos):
    """Upsert Project rows from a GitHub repos payload. Returns (created, updated)."""
    created = updated = 0
    order = 0
    for repo in repos:
        if repo.get("fork") or repo.get("private"):
            continue
        if repo["name"].lower() in SKIP:
            continue
        order += 1
        title = repo["name"].replace("-", " ").replace("_", " ").title()
        lang = repo.get("language") or ""
        topics = repo.get("topics") or []
        desc = (repo.get("description") or "").strip()
        tech = ", ".join([t for t in [lang, *topics] if t]) or "Software"
        # The repo "homepage" is free text on GitHub: keep only real web links.
        homepage = web_url(repo.get("homepage"))
        featured = (repo.get("stargazers_count", 0) or 0) >= 1

        project = Project.objects.filter(title=title).first()
        if project is None:
            Project.objects.create(
                title=title, description=desc or placeholder(lang), tech_stack=tech,
                github_url=web_url(repo.get("html_url")), live_url=homepage,
                order=order, is_featured=featured,
                category=guess_category(topics), started_on=parse_created(repo.get("created_at")),
            )
            created += 1
            continue

        # Re-sync: GitHub owns the links, the star flag and its own description;
        # text, order and category written in the admin survive. The tech stack
        # follows GitHub while the description does too (placeholder or GitHub's).
        synced_text = has_placeholder(project) or (desc and project.description == desc)
        if desc:
            project.description = desc
        elif synced_text:
            project.description = placeholder(lang)
        if synced_text:
            project.tech_stack = tech
        project.github_url = web_url(repo.get("html_url"))
        project.live_url = homepage or project.live_url
        project.is_featured = featured
        project.save()
        updated += 1
    return created, updated


class Command(BaseCommand):
    help = "Create/update Project rows from a GitHub user's public repos."

    def add_arguments(self, parser):
        parser.add_argument("--user", default="Mahdi-Shafiei-IRAN")
        parser.add_argument("--token", default="", help="optional GitHub token")

    def handle(self, *args, **opts):
        created, updated = sync_repos(fetch_repos(opts["user"], opts["token"]))
        self.stdout.write(
            self.style.SUCCESS(f"synced: {created} created, {updated} updated")
        )
