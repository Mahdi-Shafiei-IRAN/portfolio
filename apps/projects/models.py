from django.db import models


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
