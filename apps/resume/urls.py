from django.urls import path

from .views import AboutView, ContactView, HeroView, SkillsView, WorkView, send_message

app_name = 'resume'

urlpatterns = [
    path('', HeroView.as_view(), name='hero'),
    path('about/', AboutView.as_view(), name='about'),
    path('work/', WorkView.as_view(), name='work'),
    path('skills/', SkillsView.as_view(), name='skills'),
    path('contact/', ContactView.as_view(), name='contact'),
    path('contact/send/', send_message, name='send'),
]
