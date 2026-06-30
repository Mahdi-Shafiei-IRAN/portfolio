from django.views.generic import TemplateView
from apps.projects.models import Project

SKILLS = [
    'Python', 'Django', 'PostgreSQL', 'SQL',
    'Git', 'Docker', 'REST APIs', 'Linux', 'Networking',
]

class HomeView(TemplateView):
    template_name = 'core/home.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['projects'] = Project.objects.all()
        ctx['skills'] = SKILLS
        return ctx
