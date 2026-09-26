from django.templatetags.static import static
from django.urls import reverse
from django.views.generic import TemplateView

from apps.core import content as site_content
from apps.projects.models import Project

from . import content
from .lots import assign_lots

DISTRICTS = ['backend', 'devops', 'network']
PORTRAIT = 'game/img/portrait.png'
# The parts of a case study the city's project panel shows.
PANEL_FIELDS = ('title', 'tagline', 'category', 'description', 'techStack', 'features',
                'images', 'githubUrl', 'liveUrl')


def panel_data(project):
    study = project.case_study
    return {field: study[field] for field in PANEL_FIELDS}


class CityView(TemplateView):
    template_name = 'city/city.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        # 'id' breaks ties so equal `order` values keep the same houses on every visit.
        projects = list(Project.objects.order_by('order', 'id').prefetch_related('gallery'))

        districts = {}
        for key in DISTRICTS:
            placed = assign_lots(panel_data(p) for p in projects if p.category == key)
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
            'portrait': static(PORTRAIT),
            'spawn': spawn if spawn in DISTRICTS else 'gate',
        }
        return ctx
