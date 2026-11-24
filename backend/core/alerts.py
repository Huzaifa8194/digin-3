"""Security alerts by email to the superusers (lockouts, 2FA resets)."""
from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail

log = logging.getLogger("digiinn.security")


def send_security_alert(subject: str, body: str, dedupe_key: str | None = None) -> None:
    if dedupe_key and not cache.add(f"alert:{dedupe_key}", 1, timeout=1800):
        return  # already alerted about this recently
    if not getattr(settings, "EMAIL_ENABLED", False):
        return
    recipients = list(
        get_user_model().objects.filter(is_superuser=True, is_active=True).exclude(email="").values_list("email", flat=True)
    )
    if not recipients:
        return
    try:
        send_mail(f"[Website security] {subject}", body, settings.DEFAULT_FROM_EMAIL, recipients)
    except Exception:  # noqa: BLE001
        log.exception("could not send security alert")


def on_user_locked_out(sender, request=None, username=None, ip_address=None, **kwargs):
    log.warning("admin lockout username=%s ip=%s", username, ip_address)
    send_security_alert(
        "Admin sign-in locked",
        f"Too many wrong passwords for the admin username '{username}' from IP {ip_address}.\n"
        f"Sign-in from there is blocked for {settings.AXES_COOLOFF_TIME * 60:.0f} minutes.\n\n"
        "If this was not one of your team, someone is guessing passwords. Their attempts are blocked,\n"
        "and two-step login protects the account, but consider changing that user's password.\n"
        "Details: admin > Security > Failed logins.",
        dedupe_key=f"lockout:{username}:{ip_address}",
    )
