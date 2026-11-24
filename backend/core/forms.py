import json

from django import forms
from django.conf import settings
from unfold.forms import AuthenticationForm

from . import pow as pow_captcha


class CaptchaLoginForm(AuthenticationForm):
    """Admin login with a proof-of-work check before the password is even tried."""

    altcha = forms.CharField(required=False, widget=forms.HiddenInput)

    def __init__(self, request=None, *args, **kwargs):
        super().__init__(request, *args, **kwargs)
        self.pow_challenge = json.dumps(pow_captcha.new_challenge("login")) if settings.POW_ENABLED else ""

    def clean(self):
        if not pow_captcha.verify(self.data.get("altcha", ""), "login"):
            raise forms.ValidationError(
                "The automatic security check did not finish. Wait a moment and press Log in again.",
                code="captcha",
            )
        return super().clean()
