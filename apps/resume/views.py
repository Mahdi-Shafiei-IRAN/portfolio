from datetime import timedelta

from django.contrib.staticfiles import finders
from django.http import JsonResponse
from django.utils import timezone
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.generic import TemplateView

from apps.projects.models import Project

from . import content
from .forms import ContactForm
from .models import ContactMessage

# The resume's sections, in the order the wheel/swipe walks through them.
ROUTES = [
    ('hero', 'Home', '01'),
    ('about', 'About', '02'),
    ('work', 'Work', '03'),
    ('skills', 'Skills', '04'),
    ('contact', 'Contact', '05'),
]

RATE_LIMIT = 5          # messages per IP ...
RATE_WINDOW = 60 * 60   # ... per hour


class ResumePage(TemplateView):
    page = None  # one of the ROUTES keys

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        keys = [key for key, _, _ in ROUTES]
        i = keys.index(self.page)
        ctx.update({
            'resume': content.RESUME,
            'page': self.page,
            'nav_routes': [
                {'key': key, 'label': label, 'number': number, 'url': reverse(f'resume:{key}')}
                for key, label, number in ROUTES
            ],
            'prev_url': reverse(f'resume:{keys[i - 1]}') if i > 0 else '',
            'next_url': reverse(f'resume:{keys[i + 1]}') if i < len(keys) - 1 else '',
            'next_key': keys[i + 1] if i < len(keys) - 1 else '',
            # finders.find looks in static/ itself; no file hides the resume buttons.
            'has_resume': finders.find('resume.pdf') is not None,
        })
        return ctx


class HeroView(ResumePage):
    template_name = 'resume/hero.html'
    page = 'hero'


class AboutView(ResumePage):
    template_name = 'resume/about.html'
    page = 'about'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['project_count'] = Project.objects.count()
        return ctx


class WorkView(ResumePage):
    template_name = 'resume/work.html'
    page = 'work'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        projects = list(Project.objects.prefetch_related('gallery'))
        ctx['projects'] = projects
        ctx['projects_json'] = [p.case_study for p in projects]
        return ctx


class SkillsView(ResumePage):
    template_name = 'resume/skills.html'
    page = 'skills'


class ContactView(ResumePage):
    template_name = 'resume/contact.html'
    page = 'contact'


def _client_ip(request):
    # Host nginx sets X-Real-IP; Gunicorn itself only listens on 127.0.0.1.
    return request.META.get('HTTP_X_REAL_IP') or request.META.get('REMOTE_ADDR') or None


@require_POST
def send_message(request):
    """Store a contact-form message for the admin; JSON in, JSON out."""
    if request.POST.get('website'):
        return JsonResponse({'ok': True})  # honeypot: pretend it worked

    form = ContactForm(request.POST)
    if not form.is_valid():
        field, errors = next(iter(form.errors.items()))
        return JsonResponse({'ok': False, 'error': f'{field}: {errors[0]}'}, status=400)

    ip = _client_ip(request)
    # Counted in the database, so the limit holds across Gunicorn workers and restarts.
    since = timezone.now() - timedelta(seconds=RATE_WINDOW)
    if ip and ContactMessage.objects.filter(ip=ip, created_at__gte=since).count() >= RATE_LIMIT:
        return JsonResponse(
            {'ok': False, 'error': 'Too many messages — please use Copy Email instead.'}, status=429,
        )

    ContactMessage.objects.create(
        name=form.cleaned_data['name'],
        email=form.cleaned_data['email'],
        message=form.cleaned_data['message'],
        ip=ip,
    )
    return JsonResponse({'ok': True})
