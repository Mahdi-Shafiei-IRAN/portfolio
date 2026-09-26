"""Copy for Backend City: what skill buildings, landmarks and townsfolk say."""

SKILLS = {
    'nginx': {
        'title': 'Nginx Gate',
        'text': 'The reverse proxy at the town gate: TLS from certbot, static files served straight '
                'from disk, and every request routed to the right house.',
    },
    'postgres': {
        'title': 'PostgreSQL Library',
        'text': 'Every book is a row, every shelf an index. Schemas are designed here — normalized '
                'tables, the right indexes, and queries that stay fast as the data grows.',
    },
    'rest': {
        'title': 'REST API Post Office',
        'text': 'Requests come in, JSON goes out. Endpoints built with Django REST Framework: '
                'serializers, validation, authentication and pagination at the counter.',
    },
    'redis': {
        'title': 'Redis Stand',
        'text': 'Fast food for slow queries: hot results are cached here, so the library is not '
                'asked the same question twice.',
    },
    'django': {
        'title': 'Django Factory',
        'text': 'Where apps are assembled: models, views, admin and management commands — clean '
                'architecture, one component at a time.',
    },
    'docker': {
        'title': 'Container Ship',
        'text': 'Every app ships in its own container. Docker Compose loads the web and database '
                'stacks and sails them to any Linux server.',
    },
    'cicd': {
        'title': 'CI/CD Conveyor',
        'text': 'Code rolls in, tests run, images get built — and only green builds reach the dock.',
    },
    'relay': {
        'title': 'Relay Station',
        'text': 'Routing, ports and TLS: the wires that connect every district to the outside world.',
    },
    'github': {
        'title': 'GitHub House',
        'text': 'Every public repository lives here — code, history and all.',
        'link': 'github', 'cta': 'Visit GitHub',
    },
    'linkedin': {
        'title': 'LinkedIn House',
        'text': 'The professional side of town: experience, roles and endorsements.',
        'link': 'linkedin', 'cta': 'Open LinkedIn',
    },
    'mailbox': {
        'title': 'Mailbox',
        'text': 'Drop a letter — Mahdi reads every one.',
        'link': 'email', 'cta': 'Send an email',
    },
}

NPCS = {
    'guide': {
        'name': 'Gate Keeper',
        'lines': [
            "Welcome to Backend City! I guard the Nginx gate — every visitor passes through me.",
            "Walk with WASD or the arrow keys (the D-pad on phones). Press E, Enter or Space next to "
            "buildings and people.",
            "West is the Backend district, east the DevOps harbour, north the Network hill. "
            "Every house there is one of Mahdi's projects.",
        ],
    },
    'recruiter': {
        'name': 'Recruiter',
        'lines': [
            "Looking for a backend developer? You found the right town.",
            "Mahdi builds Django backends and ships them with Docker and Nginx on Linux.",
            "In a hurry? The full resume is one black hole away.",
        ],
        'resume': True,
    },
    'librarian': {
        'name': 'Librarian',
        'lines': [
            "Shh… the PostgreSQL library is indexing.",
            "A good schema is like a good catalogue: you find anything without reading every page.",
        ],
    },
    'docker': {
        'name': 'Dock Worker',
        'lines': [
            "Careful — containers coming through!",
            "Same image on the laptop, same image on the server. That's the whole point.",
        ],
    },
    'wizard': {
        'name': 'Packet Wizard',
        'lines': [
            "I send packets across the hill… most of them arrive.",
            "The antennas up here are Mahdi's networking projects.",
        ],
    },
}
