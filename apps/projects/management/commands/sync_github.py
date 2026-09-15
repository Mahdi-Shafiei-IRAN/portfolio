"""ساختِ خودکارِ پروژه‌ها از روی ریپوهای عمومیِ گیت‌هاب.

نکته: سرورِ ایرانی معمولاً به گیت‌هاب دسترسی ندارد، پس این دستور را از روی یک
سیستم که به گیت‌هاب می‌رسد اجرا کن؛ سپس با «loaddata» یا دیپلوی، دیتابیس را ببر.

    python manage.py sync_github --user Mahdi-Shafiei-IRAN

فورک‌ها و ریپوهای فهرستِ SKIP نادیده گرفته می‌شوند. پروژه‌ها بر اساسِ نامِ ریپو
upsert می‌شوند (github_url کلید یکتا نیست، پس با title تطبیق می‌دهیم).
"""

import json
import urllib.request

from django.core.management.base import BaseCommand

from apps.projects.models import Project

SKIP = {"portfolio", "test", "mahdi-shafiei-iran"}


class Command(BaseCommand):
    help = "Create/update Project rows from a GitHub user's public repos."

    def add_arguments(self, parser):
        parser.add_argument("--user", default="Mahdi-Shafiei-IRAN")
        parser.add_argument("--token", default="", help="optional GitHub token")

    def handle(self, *args, **opts):
        user = opts["user"]
        url = f"https://api.github.com/users/{user}/repos?per_page=100&sort=pushed"
        req = urllib.request.Request(url, headers={"User-Agent": "portfolio-sync"})
        if opts["token"]:
            req.add_header("Authorization", f"token {opts['token']}")
        with urllib.request.urlopen(req, timeout=30) as r:
            repos = json.load(r)

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
            if not desc:
                desc = f"A {lang} project." if lang else "A software project."
            tech = ", ".join([t for t in [lang, *topics] if t]) or "Software"
            obj, was_created = Project.objects.update_or_create(
                title=title,
                defaults={
                    "description": desc,
                    "tech_stack": tech,
                    "github_url": repo.get("html_url", ""),
                    "live_url": repo.get("homepage") or "",
                    "order": order,
                    "is_featured": (repo.get("stargazers_count", 0) or 0) >= 1,
                },
            )
            created += was_created
            updated += (not was_created)

        self.stdout.write(
            self.style.SUCCESS(f"synced: {created} created, {updated} updated")
        )
