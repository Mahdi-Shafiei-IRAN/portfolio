from django.views.generic import TemplateView
from apps.projects.models import Project

SKILLS = [
    'Python', 'Django', 'PostgreSQL', 'SQL',
    'Git', 'Docker', 'REST APIs', 'Linux', 'Networking',
]

# Number of scroll-driven background frames in static/frames/.
# Regenerate frames with: ffmpeg -i static/video/hero.mp4 -vf "fps=<F>,scale=768:-1" \
#   -c:v libwebp -quality 80 static/frames/frame_%04d.webp
# then set this to the resulting `ls static/frames | wc -l`.
FRAME_COUNT = 240


class HomeView(TemplateView):
    template_name = 'core/home.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['projects'] = Project.objects.all()
        ctx['skills'] = SKILLS
        ctx['frame_count'] = FRAME_COUNT
        return ctx
