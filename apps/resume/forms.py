from django import forms


class ContactForm(forms.Form):
    name = forms.CharField(max_length=100)
    email = forms.EmailField(required=False)
    message = forms.CharField(min_length=5, max_length=5000, widget=forms.Textarea)
    # Honeypot: hidden from people, filled in by bots.
    website = forms.CharField(required=False)
