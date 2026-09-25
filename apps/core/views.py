from django.contrib.staticfiles import finders
from django.views.generic import TemplateView

from apps.projects.models import Project

from . import content

SKILLS = [
    'Python', 'Django', 'PostgreSQL', 'SQL',
    'Git', 'Docker', 'REST APIs', 'Linux', 'Networking',
]

# Grouped skills for the Skills section (richer than a flat list).
SKILL_GROUPS = [
    {
        'name': 'Languages & Frameworks',
        'items': ['Python', 'Django', 'Django REST Framework', 'SQL'],
    },
    {
        'name': 'Data & Storage',
        'items': ['PostgreSQL', 'Redis', 'Database Design'],
    },
    {
        'name': 'DevOps & Infrastructure',
        'items': ['Docker', 'Nginx', 'Git', 'Linux', 'CI/CD', 'Networking'],
    },
]

# Number of scroll-driven background frames in static/frames/.
# Regenerate frames with: ffmpeg -i static/video/hero.mp4 -vf "fps=<F>,scale=768:-1" \
#   -c:v libwebp -quality 80 static/frames/frame_%04d.webp
# then set this to the resulting `ls static/frames | wc -l`.
FRAME_COUNT = 200
# Lighter set for phones (static/frames-m/) — saves data + memory on mobile.
FRAME_COUNT_MOBILE = 120


class HomeView(TemplateView):
    template_name = 'core/home.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['projects'] = Project.objects.all()
        ctx['skills'] = SKILLS
        ctx['skill_groups'] = SKILL_GROUPS
        ctx['frame_count'] = FRAME_COUNT
        ctx['frame_count_mobile'] = FRAME_COUNT_MOBILE
        return ctx


class RoleView(TemplateView):
    """One themed page per role; `role` is set in urls.py via as_view(role=...)."""

    role = None

    def get_template_names(self):
        return [content.ROLES[self.role]['template']]

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['role_key'] = self.role
        ctx['role'] = content.ROLES[self.role]
        ctx['projects'] = Project.objects.filter(category=self.role)
        return ctx


class AboutView(TemplateView):
    template_name = 'core/about.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['about'] = content.ABOUT
        ctx['skill_groups'] = content.SKILL_GROUPS
        # finders.find looks in static/ itself, so this works before and after
        # collectstatic; no file simply hides the download button.
        ctx['has_resume'] = finders.find('resume.pdf') is not None
        return ctx


class ContactView(TemplateView):
    template_name = 'core/contact.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['page'] = content.CONTACT_PAGE
        return ctx
