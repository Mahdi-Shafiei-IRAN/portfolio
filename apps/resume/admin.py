from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'name', 'email', 'is_read']
    list_editable = ['is_read']
    list_filter = ['is_read']
    search_fields = ['name', 'email', 'message']
    readonly_fields = ['created_at', 'ip']
