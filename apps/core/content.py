"""All human-written copy for the site, in one place.

Templates and views only read these values — edit the text here.
"""

# Phase 2 switch. While False, the "Enter the city" buttons and the
# "Backend City" menu item are hidden (and /city/ is not routed).
CITY_ENABLED = False

SITE = {
    'name': 'Mahdi Shafiei',
    'first_name': 'MAHDI',
    'role': 'Backend Developer',
    'description': (
        'Mahdi Shafiei — backend developer building APIs and infrastructure '
        'with Python, Django, Docker and Linux.'
    ),
}

CONTACT = {
    'email': 'mahdishafiei930@gmail.com',
    'github': 'https://github.com/Mahdi-Shafiei-IRAN',
    'github_label': 'github.com/Mahdi-Shafiei-IRAN',
    'linkedin': 'https://www.linkedin.com/in/mahdi-shafiei-iran/',
    'linkedin_label': 'linkedin.com/in/mahdi-shafiei-iran',
}

HOME = {
    'greeting': "Hi! I'm",
    'touch_heading': 'Get in touch',
    'touch_body': 'Open to backend roles, freelance projects and interesting collaborations.',
}

ABOUT = {
    'heading': 'About Me',
    'body': (
        "I'm Mahdi, a backend developer who ships maintainable systems. I focus on "
        "clean architecture, solid database design and REST APIs, and I own the "
        "full backend lifecycle — from data modeling in PostgreSQL to deploying "
        "with Docker and Nginx on Linux."
    ),
}

CONTACT_PAGE = {
    'heading': "Let's build something.",
    'body': 'Open to backend roles, freelance projects and interesting collaborations.',
}

SKILL_GROUPS = [
    {'name': 'Languages & Frameworks', 'items': ['Python', 'Django', 'Django REST Framework', 'SQL']},
    {'name': 'Data & Storage', 'items': ['PostgreSQL', 'Redis', 'Database Design']},
    {'name': 'DevOps & Infrastructure', 'items': ['Docker', 'Nginx', 'Git', 'Linux', 'CI/CD', 'Networking']},
]

# The roles a visitor drags into "Hi! I'm a [Drop Here]", in chip order.
# Keys must equal Project.Category values (tests/test_pages.py enforces this).
ROLES = {
    'backend': {
        'label': 'Backend',
        'title': 'backend',
        'tagline': 'APIs, data models and the services behind them.',
        'template': 'core/role_backend.html',
    },
    'devops': {
        'label': 'DevOps',
        'title': 'DEVOPS',
        'tagline': 'Containers, pipelines and servers that stay up.',
        'template': 'core/role_devops.html',
    },
    'network': {
        'label': 'Network',
        'title': 'NETWORK',
        'tagline': 'Proxies, routing and the wires between services.',
        'template': 'core/role_network.html',
    },
}
