from django import template
from django.utils.html import format_html, format_html_join

register = template.Library()


@register.simple_tag
def convex(text):
    """Wrap each character in a span for the navbar's convex hover effect (upstream ConvexText)."""
    chars = format_html_join(
        '', '<span class="convex-char">{}</span>',
        ((' ' if ch == ' ' else ch,) for ch in str(text)),
    )
    return format_html('<span class="convex-word">{}</span>', chars)


@register.inclusion_tag('resume/_masked_title.html')
def masked_title(text, number='', css_class='section-title uppercase'):
    """Section heading split into masked words (upstream MaskedTitle)."""
    return {'words': str(text).split(), 'number': number, 'css_class': css_class}
