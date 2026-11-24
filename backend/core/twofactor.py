"""Second login step for the admin: authenticator-app codes (TOTP).

* First login of a staff account: shows a QR code, the user scans it with an
  authenticator app (Google Authenticator, Microsoft Authenticator, 1Password,
  ...) and confirms one code. Ten single-use backup codes are shown once.
* Every later login: password, then a 6-digit code (or a backup code).

Wrong codes are throttled by django-otp (growing delay) and ten wrong codes in
one session end the session.
"""
from __future__ import annotations

import base64
import logging
import re

import qrcode
import qrcode.image.svg
from django.contrib.auth import logout
from django.db import transaction
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.debug import sensitive_post_parameters
from django_otp import login as otp_login
from django_otp.plugins.otp_static.models import StaticDevice, StaticToken
from django_otp.plugins.otp_totp.models import TOTPDevice

from .net import get_client_ip

security_log = logging.getLogger("digiinn.security")
MAX_FAILURES_PER_SESSION = 10
BACKUP_CODE_COUNT = 10
PENDING_KEY = "otp_pending_device"


def _safe_next(request, candidate: str) -> str:
    if candidate and candidate.startswith("/") and url_has_allowed_host_and_scheme(
        candidate, allowed_hosts={request.get_host()}, require_https=request.is_secure()
    ):
        return candidate
    return reverse("admin:index")


def _qr_svg(uri: str) -> str:
    image = qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage, box_size=8, border=2)
    return image.to_string(encoding="unicode")


def _issue_backup_codes(user) -> list[str]:
    device, _ = StaticDevice.objects.get_or_create(user=user, name="Backup codes", defaults={"confirmed": True})
    device.confirmed = True
    device.save()
    device.token_set.all().delete()
    codes = []
    for _ in range(BACKUP_CODE_COUNT):
        code = StaticToken.random_token()
        device.token_set.create(token=code)
        codes.append(code)
    return codes


def _context(request, admin_site, **extra):
    return {**admin_site.each_context(request), **extra}


@never_cache
@csrf_protect
@sensitive_post_parameters("token")
def otp_view(request, admin_site):
    user = request.user
    if not (user.is_authenticated and user.is_active and user.is_staff):
        return redirect("admin:login")

    next_url = _safe_next(request, request.POST.get("next") or request.GET.get("next") or "")
    if user.is_verified():
        return redirect(next_url)

    if request.method == "POST" and request.POST.get("action") == "cancel":
        logout(request)
        return redirect("admin:login")

    device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
    enrolling = device is None
    if enrolling:
        # The secret being enrolled belongs to this login session only. A new
        # session (or anyone else who got the password) gets a new secret, so
        # a QR code seen once cannot be used later.
        pending_id = request.session.get(PENDING_KEY)
        device = TOTPDevice.objects.filter(pk=pending_id, user=user, confirmed=False).first() if pending_id else None
        if device is None:
            TOTPDevice.objects.filter(user=user, confirmed=False).delete()
            device = TOTPDevice.objects.create(user=user, name="Authenticator app", confirmed=False)
            request.session[PENDING_KEY] = device.pk

    error = ""
    if request.method == "POST":
        token = re.sub(r"[\s-]", "", request.POST.get("token", ""))[:32]
        matched = None
        with transaction.atomic():
            # Row locks stop parallel guesses from slipping past throttling/replay checks.
            if token.isdigit() and len(token) == 6:
                locked = TOTPDevice.objects.select_for_update().get(pk=device.pk)
                if locked.verify_token(token):
                    matched = device = locked
            elif not enrolling and token:
                for backup in StaticDevice.objects.select_for_update().filter(user=user, confirmed=True):
                    if backup.verify_token(token.lower()):
                        matched = backup
                        break

        if matched is not None:
            new_codes: list[str] = []
            if enrolling:
                device.confirmed = True
                device.save(update_fields=["confirmed"])
                new_codes = _issue_backup_codes(user)
            request.session.pop(PENDING_KEY, None)
            request.session.cycle_key()
            otp_login(request, matched)
            request.session.pop("otp_failures", None)
            security_log.info(
                "2fa ok user=%s ip=%s method=%s enrolled=%s",
                user.get_username(), get_client_ip(request), type(matched).__name__, enrolling,
            )
            if new_codes:
                return TemplateResponse(
                    request,
                    "admin/otp/backup_codes.html",
                    _context(request, admin_site, title="Save your backup codes", codes=new_codes, next=next_url),
                )
            return redirect(next_url)

        failures = request.session.get("otp_failures", 0) + 1
        request.session["otp_failures"] = failures
        security_log.warning(
            "2fa failed user=%s ip=%s failures=%s", user.get_username(), get_client_ip(request), failures
        )
        if failures >= MAX_FAILURES_PER_SESSION:
            logout(request)
            return redirect("admin:login")
        error = "That code did not work. Codes change every 30 seconds; check your phone's clock is set automatically."

    extra = {}
    if enrolling:
        extra = {
            "qr_svg": _qr_svg(device.config_url),
            "secret": base64.b32encode(device.bin_key).decode().rstrip("="),
        }
    return TemplateResponse(
        request,
        "admin/otp/verify.html",
        _context(
            request,
            admin_site,
            title="Set up two-step login" if enrolling else "Two-step login",
            enrolling=enrolling,
            error=error,
            next=next_url,
            **extra,
        ),
    )


@never_cache
@csrf_protect
def backup_codes_view(request, admin_site):
    """Lets a fully signed-in user replace their backup codes (shown once)."""
    if not admin_site.has_permission(request):
        return redirect("admin:login")
    if request.method == "POST":
        codes = _issue_backup_codes(request.user)
        security_log.info("2fa backup codes regenerated user=%s", request.user.get_username())
        return TemplateResponse(
            request,
            "admin/otp/backup_codes.html",
            _context(request, admin_site, title="New backup codes", codes=codes, next=reverse("admin:index")),
        )
    return TemplateResponse(
        request,
        "admin/otp/backup_codes.html",
        _context(request, admin_site, title="Backup codes", codes=None, next=reverse("admin:index")),
    )
