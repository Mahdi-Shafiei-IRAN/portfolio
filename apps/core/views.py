from django.contrib.staticfiles import finders
from django.views.generic import TemplateView

from apps.projects.models import Project

from . import content


class HomeView(TemplateView):
    template_name = 'core/home.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['home'] = content.HOME
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
