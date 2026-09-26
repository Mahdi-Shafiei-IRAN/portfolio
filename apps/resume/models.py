from django.db import models


class ContactMessage(models.Model):
    """A message sent from the resume's contact form (read it in the admin)."""

    name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, default='')
    message = models.TextField()
    ip = models.GenericIPAddressField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name}: {self.message[:40]}'
