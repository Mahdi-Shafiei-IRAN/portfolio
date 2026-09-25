from django.urls import reverse

from . import content


def site(request):
    """Site-wide values every template needs (header, menu, footer)."""
    return {
        'site': content.SITE,
        'contact': content.CONTACT,
        'city_enabled': content.CITY_ENABLED,
        'roles': [
            {'key': key, 'url': reverse(f'core:{key}'), **role}
            for key, role in content.ROLES.items()
        ],
    }
