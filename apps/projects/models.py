from django.db import models


def _lines(text):
    return [line.strip() for line in text.splitlines() if line.strip()]


def _cells(line, count):
    parts = [p.strip() for p in line.split('|')]
    return (parts + [''] * count)[:count]


def web_url(value):
    """Only http(s) URLs may become links; anything else (e.g. 'javascript:') becomes ''."""
    value = (value or '').strip()
    return value if value.lower().startswith(('http://', 'https://')) else ''


class Project(models.Model):
    class Category(models.TextChoices):
        BACKEND = 'backend', 'Backend'
        DEVOPS = 'devops', 'DevOps'
        NETWORK = 'network', 'Network'

    title = models.CharField(max_length=200)
    description = models.TextField()
    tech_stack = models.CharField(
        max_length=300, help_text='Comma-separated, e.g. "Python, Django, PostgreSQL".',
    )
    github_url = models.URLField(blank=True, default='')
    live_url = models.URLField(blank=True, default='')
    image = models.ImageField(upload_to='projects/', blank=True)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.BACKEND,
        help_text='Which role page (and later, which Backend City district) shows this project.',
    )
    started_on = models.DateField(null=True, blank=True)
    ended_on = models.DateField(
        null=True, blank=True, help_text='Leave empty while the project is ongoing (shown as PRESENT).',
    )
    order = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Case study shown in the resume's project modal. Plain text keeps the admin simple.
    tagline = models.CharField(max_length=200, blank=True, default='')
    problem = models.TextField(blank=True, default='', help_text='"The Engineering Challenge" paragraph.')
    features = models.TextField(blank=True, default='', help_text='One feature per line.')
    architecture = models.TextField(
        blank=True, default='', help_text='One step per line: Title | Tech | Description',
    )
    decisions = models.TextField(blank=True, default='', help_text='One per line: Title | Description')
    metrics = models.TextField(blank=True, default='', help_text='One per line: Label | Value')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

    @property
    def tech_list(self):
        """tech_stack as a clean list: 'Python, Django' -> ['Python', 'Django']."""
        return [t.strip() for t in self.tech_stack.split(',') if t.strip()]

    @property
    def date_range(self):
        """Card label such as 'APR 2025 – PRESENT'; '' when no start date is set."""
        if not self.started_on:
            return ''
        start = self.started_on.strftime('%b %Y').upper()
        end = self.ended_on.strftime('%b %Y').upper() if self.ended_on else 'PRESENT'
        return f'{start} – {end}'

    @property
    def features_list(self):
        return _lines(self.features)

    @property
    def architecture_steps(self):
        steps = []
        for i, line in enumerate(_lines(self.architecture), start=1):
            title, tech, desc = _cells(line, 3)
            steps.append({'step': f'{i:02d}', 'title': title, 'tech': tech, 'desc': desc})
        return steps

    @property
    def decisions_list(self):
        return [dict(zip(('title', 'desc'), _cells(line, 2))) for line in _lines(self.decisions)]

    @property
    def metrics_list(self):
        return [dict(zip(('label', 'value'), _cells(line, 2))) for line in _lines(self.metrics)]

    @property
    def gallery_urls(self):
        """Gallery images in order; the cover image alone when there is no gallery."""
        urls = [img.image.url for img in self.gallery.all() if img.image]
        if not urls and self.image:
            urls = [self.image.url]
        return urls

    @property
    def card_category(self):
        """Resume card eyebrow, e.g. 'DEVOPS • PYTHON • DJANGO'."""
        return ' • '.join([self.get_category_display(), *self.tech_list[:2]]).upper()

    @property
    def case_study(self):
        """JSON-ready payload for the resume's project modal."""
        return {
            'title': self.title, 'tagline': self.tagline, 'category': self.card_category,
            'description': self.description, 'problem': self.problem,
            'techStack': self.tech_list, 'features': self.features_list,
            'architectureFlow': self.architecture_steps, 'architectureDetails': self.decisions_list,
            'metrics': self.metrics_list, 'images': self.gallery_urls,
            'githubUrl': web_url(self.github_url), 'liveUrl': web_url(self.live_url),
        }


class ProjectImage(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='gallery')
    image = models.ImageField(upload_to='projects/gallery/')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.project.title} #{self.order}'
