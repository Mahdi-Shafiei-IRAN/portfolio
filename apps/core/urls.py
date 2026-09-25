from django.urls import path

from .views import AboutView, ContactView, HomeView, RoleView

app_name = 'core'

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('backend/', RoleView.as_view(role='backend'), name='backend'),
    path('devops/', RoleView.as_view(role='devops'), name='devops'),
    path('network/', RoleView.as_view(role='network'), name='network'),
    path('about/', AboutView.as_view(), name='about'),
    path('contact/', ContactView.as_view(), name='contact'),
]
