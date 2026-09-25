from django.contrib import admin
from django.utils.html import format_html
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['order', 'title', 'category', 'date_range', 'is_featured', 'thumbnail']
    list_display_links = ['title']
    list_editable = ['order', 'category', 'is_featured']
    list_filter = ['category', 'is_featured']
    ordering = ['order']
    search_fields = ['title', 'description']

    def thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" height="40" style="border-radius:4px"/>', obj.image.url)
        return '—'
    thumbnail.short_description = 'Preview'
