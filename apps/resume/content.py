"""All copy for the resume (the "other side of the wormhole").

Draft written from what the site already says about Mahdi — edit freely.
Journey dates are placeholders on purpose; metrics are real facts from this
project, not invented benchmarks.
"""

RESUME = {
    'name': 'MAHDI',
    'full_name': 'Mahdi Shafiei',
    'subtitle': 'Backend Developer & Infrastructure Builder',
    'title_1': 'BACKEND',
    'title_2': 'DEVELOPER',

    'about_text': (
        "I'm Mahdi, a backend developer who ships maintainable systems. I work at the "
        "architecture level — data models, API contracts and service boundaries — and "
        "carry them all the way to production: Django and PostgreSQL behind REST APIs, "
        "packaged with Docker, served by Nginx on Linux, and deployed with a single command."
    ),
    'about_bullets': [
        'Backend Architecture & Data Modeling',
        'REST APIs with Django & Django REST Framework',
        'Docker, Nginx & Linux Deployments',
        'Networking, TLS & Server Operations',
    ],

    'status_line': 'Active in 2026 • Open for Opportunities',
    'focus': {
        'title': 'Backend Systems',
        'text': (
            'Designing clean Django backends — data models, API contracts and admin '
            'tooling — and shipping them to Linux servers with Docker and Nginx.'
        ),
        'stack': 'Python, Django, PostgreSQL, Docker, Nginx',
    },
    'github_title': 'Projects & Tooling',
    'github_text': (
        'Public repositories from concept to deployment — Django apps, a GitHub sync '
        'command and a one-command multi-project server installer.'
    ),
    'profile_role': 'Backend Developer • Python & Django',
    'profile_text': 'Open for backend engineering roles, freelance projects and interesting collaborations.',

    'journey': [
        {
            'epoch': '01', 'date': 'THE BEGINNING', 'category': 'THE SPARK',
            'title': 'Python & Django Foundations',
            'headline': 'From Scripts to Web Apps',
            'summary': (
                'Started with Python and moved into Django: URL routing, views, the ORM and '
                'templates. Learned to model the data first and let the framework do the '
                'rest — and picked up Git and Linux along the way.'
            ),
            'metrics': [('Language', 'Python'), ('Framework', 'Django'), ('Tooling', 'Git & Linux')],
            'tech': ['Python', 'Django', 'SQL', 'Git', 'HTML & CSS'],
            'visualizer': 'django',
        },
        {
            'epoch': '02', 'date': 'BUILDING APIS', 'category': 'API & DATA',
            'title': 'REST APIs & Database Design',
            'headline': 'Contracts First, Then Code',
            'summary': (
                'Designed REST APIs with Django REST Framework on top of carefully modeled '
                'PostgreSQL schemas, with Redis for caching and validation handled at the '
                'API boundary.'
            ),
            'metrics': [('API', 'Django REST Framework'), ('Database', 'PostgreSQL'), ('Cache', 'Redis')],
            'tech': ['Django REST Framework', 'PostgreSQL', 'Redis', 'SQL', 'pytest'],
            'visualizer': 'api',
        },
        {
            'epoch': '03', 'date': 'SHIPPING TO SERVERS', 'category': 'DEVOPS',
            'title': 'Docker, Nginx & Linux',
            'headline': 'From Localhost to Production',
            'summary': (
                'Containerized apps with Docker Compose, put Nginx in front as a reverse proxy '
                'with TLS from certbot, and ran them on Linux servers — including servers where '
                'CDNs are blocked, which meant self-hosting every asset.'
            ),
            'metrics': [('Runtime', 'Docker Compose'), ('Edge', 'Nginx + certbot'), ('OS', 'Ubuntu Linux')],
            'tech': ['Docker', 'Docker Compose', 'Nginx', 'certbot', 'Bash', 'Linux'],
            'visualizer': 'docker',
        },
        {
            'epoch': '04', 'date': '2026 • THIS PORTFOLIO', 'category': 'PRODUCTION',
            'title': 'One-Command Multi-Project Installer',
            'headline': 'Shared Nginx, Isolated Stacks',
            'summary': (
                'Built this portfolio and its installer: one command provisions Docker, the '
                'shared host Nginx and SSL, running several projects side by side on one '
                'server. Cut the static payload from 96 MB to 317 KB with hashed, '
                'pre-compressed assets.'
            ),
            'metrics': [('Install', '1 Command'), ('Static Assets', '96 MB → 317 KB'), ('Tests', 'pytest suite')],
            'tech': ['Django', 'Docker', 'Nginx', 'Bash', 'WhiteNoise', 'pytest'],
            'visualizer': 'installer',
        },
    ],

    'capabilities': [
        {
            'id': '01', 'tag': 'BACKEND ENGINEERING', 'title': 'Python & Django Backends',
            'summary': 'Clean architecture, well-shaped models, admin tooling and management commands.',
            'telemetry': 'Django • Clean Architecture',
            'skills': ['Python', 'Django', 'Django ORM', 'Django Admin', 'Management Commands', 'Class-Based Views'],
        },
        {
            'id': '02', 'tag': 'API DESIGN', 'title': 'REST APIs & Contracts',
            'summary': 'REST endpoints, serializers, validation, authentication and pagination.',
            'telemetry': 'DRF • JSON Contracts',
            'skills': ['Django REST Framework', 'REST Design', 'Serializers', 'Authentication', 'Pagination', 'API Testing'],
        },
        {
            'id': '03', 'tag': 'DATA & STORAGE', 'title': 'Databases & Caching',
            'summary': 'Normalized schemas, indexes and query tuning, with Redis where speed matters.',
            'telemetry': 'PostgreSQL • Redis',
            'skills': ['PostgreSQL', 'SQL', 'Database Design', 'Indexes & Queries', 'Redis', 'SQLite'],
        },
        {
            'id': '04', 'tag': 'DEVOPS', 'title': 'Containers & Deployment',
            'summary': 'Docker images, Compose stacks, one-command installers and safe updates.',
            'telemetry': 'Docker • Compose • Bash',
            'skills': ['Docker', 'Docker Compose', 'Bash Scripting', 'CI/CD', 'Git', 'GitHub'],
        },
        {
            'id': '05', 'tag': 'INFRASTRUCTURE', 'title': 'Linux, Nginx & Networking',
            'summary': 'Reverse proxies, TLS and the Linux servers underneath them.',
            'telemetry': 'Nginx • certbot • Ubuntu',
            'skills': ['Linux', 'Nginx', 'Reverse Proxy', 'certbot / TLS', 'Networking', 'Bash'],
        },
        {
            'id': '06', 'tag': 'ENGINEERING PRACTICE', 'title': 'Quality & Tooling',
            'summary': 'Automated tests, code review and docs that stay in step with the code.',
            'telemetry': 'pytest • Code Review',
            'skills': ['pytest', 'Automated Testing', 'Code Review', 'Git', 'Documentation', 'Static Asset Pipelines'],
        },
    ],

    'contact_lead': (
        'Have a backend project, an API to design, or a server to tame? '
        'Send a direct message below.'
    ),
    'availability': 'Available for new projects & opportunities',
    'footer': '© 2026 BUILT BY MAHDI. All systems operational.',
    'drawer_meta': ['BACKEND DEVELOPER · PYTHON & DJANGO', 'PORTFOLIO v2.0'],
}
