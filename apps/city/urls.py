from django.urls import path

from .views import CityView

app_name = 'city'

urlpatterns = [
    path('', CityView.as_view(), name='play'),
]
