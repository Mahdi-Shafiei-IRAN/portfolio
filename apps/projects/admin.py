from django.contrib import admin
from django.utils.html import format_html
from .models import Project, ProjectImage


class ProjectImageInline(admin.TabularInline):
    model = ProjectImage
    extra = 1
    fields = ['image', 'order']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['order', 'title', 'category', 'date_range', 'is_featured', 'thumbnail']
    list_display_links = ['title']
    list_editable = ['order', 'category', 'is_featured']
    list_filter = ['category', 'is_featured']
    ordering = ['order']
    search_fields = ['title', 'description']
    inlines = [ProjectImageInline]
    fieldsets = [
        ('Basics', {'fields': [
            'title', 'description', 'tech_stack', 'category',
            'started_on', 'ended_on', 'order', 'is_featured',
        ]}),
        ('Links & cover', {'fields': ['github_url', 'live_url', 'image']}),
        ('Case study (resume modal)', {
            'classes': ['collapse'],
            'fields': ['tagline', 'problem', 'features', 'architecture', 'decisions', 'metrics'],
        }),
    ]

    def thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" height="40" style="border-radius:4px"/>', obj.image.url)
        return '—'
    thumbnail.short_description = 'Preview'
