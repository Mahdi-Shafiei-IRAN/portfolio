from django.contrib.staticfiles import finders
from django.templatetags.static import static
from django.urls import reverse
from django.views.generic import TemplateView

from apps.core import content as site_content
from apps.projects.models import Project

from . import content
from .lots import assign_lots

DISTRICTS = ['backend', 'devops', 'network']
PORTRAIT = 'game/img/portrait.png'
PORTRAIT_FALLBACK = 'img/doodle/waving-static.png'


class CityView(TemplateView):
    template_name = 'city/city.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        projects = list(Project.objects.prefetch_related('gallery'))

        districts = {}
        for key in DISTRICTS:
            placed = assign_lots(p.case_study for p in projects if p.category == key)
            districts[key] = placed

        spawn = self.request.GET.get('spawn', '')
        contact = site_content.CONTACT
        ctx['city_payload'] = {
            'districts': districts,
            'skills': content.SKILLS,
            'npcs': content.NPCS,
            'links': {
                'github': contact['github'],
                'linkedin': contact['linkedin'],
                'email': f"mailto:{contact['email']}",
            },
            'roleUrls': {key: reverse(f'core:{key}') for key in DISTRICTS},
            'resumeUrl': reverse('resume:hero'),
            'portrait': static(PORTRAIT if finders.find(PORTRAIT) else PORTRAIT_FALLBACK),
            'spawn': spawn if spawn in DISTRICTS else 'gate',
        }
        return ctx
