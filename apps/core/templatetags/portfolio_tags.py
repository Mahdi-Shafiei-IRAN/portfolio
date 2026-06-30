from django import template

register = template.Library()

@register.filter
def split(value, delimiter=','):
    """Split a string by delimiter and strip whitespace from each item."""
    return [item.strip() for item in str(value).split(delimiter)]
