"""Public JSON API used by the website forms.

GET  /api/form-session/  -> CSRF token + signed form token (issued-at time)
POST /api/leads/         -> store an inquiry / demo request

Defences: CSRF (token + Origin check), JSON-only small bodies, server-side
validation, honeypot field, minimum fill time, per-IP rate limits, a global
kill switch in the admin, and generic error messages.
"""
from __future__ import annotations

import json
import logging
import time

from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from core import pow as pow_captcha
from core.net import client_bucket, get_client_ip

from .forms import LeadForm
from .models import Lead, SiteSettings
from .notify import notify_new_lead

log = logging.getLogger("digiinn")
security_log = logging.getLogger("digiinn.security")

FORM_TOKEN_SALT = "leads.form-token"
MAX_BODY_BYTES = 16 * 1024


def _json(data: dict, status: int = 200) -> JsonResponse:
    return JsonResponse(data, status=status)


@never_cache
@require_GET
@ensure_csrf_cookie
def form_session(request):
    accepting = SiteSettings.load().accept_submissions
    return _json(
        {
            "csrfToken": get_token(request),
            "formToken": signing.dumps({"t": int(time.time())}, salt=FORM_TOKEN_SALT),
            "accepting": accepting,
            "pow": pow_captcha.new_challenge("lead") if settings.POW_ENABLED else None,
        }
    )


def _rate_limited(bucket: str) -> bool:
    """Fixed-window counters. The expiry is stored with the count so every
    update keeps the window's real end time."""
    now = time.time()
    limited = False
    for limit, window in settings.LEADS_RATE_LIMITS:
        if limit <= 0:
            continue
        key = f"leads:rl:{window}:{bucket}"
        count, expires = cache.get(key) or (0, now + window)
        if expires <= now:
            count, expires = 0, now + window
        count += 1
        cache.set(key, (count, expires), timeout=max(1, int(expires - now)))
        if count > limit:
            limited = True
    return limited


def _form_token_ok(token: str) -> bool:
    try:
        data = signing.loads(token or "", salt=FORM_TOKEN_SALT, max_age=settings.LEADS_FORM_TOKEN_MAX_AGE)
    except signing.BadSignature:
        return False
    issued = data.get("t") if isinstance(data, dict) else None
    if not isinstance(issued, int):
        return False
    return time.time() - issued >= settings.LEADS_MIN_FILL_SECONDS


@never_cache
@require_POST
def create_lead(request):
    ip = get_client_ip(request)

    if not request.content_type or request.content_type.lower() != "application/json":
        return _json({"ok": False, "error": "Unsupported request."}, 415)
    try:
        length = int(request.META.get("CONTENT_LENGTH") or 0)
    except ValueError:
        length = 0
    if length <= 0 or length > MAX_BODY_BYTES:
        return _json({"ok": False, "error": "Request too large."}, 413)

    if not SiteSettings.load().accept_submissions:
        return _json({"ok": False, "error": "The form is paused. Please email us instead."}, 503)

    if _rate_limited(client_bucket(request)):
        security_log.warning("lead rate limited ip=%s", ip)
        return _json({"ok": False, "error": "Too many messages from your network. Please try again later or email us."}, 429)

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, ValueError, RecursionError):
        return _json({"ok": False, "error": "Unsupported request."}, 400)
    if not isinstance(payload, dict):
        return _json({"ok": False, "error": "Unsupported request."}, 400)

    # Honeypot and timing: pretend success so automated senders learn nothing.
    if str(payload.get("website") or "").strip() or not _form_token_ok(str(payload.get("formToken") or "")):
        security_log.info("lead dropped (bot heuristics) ip=%s", ip)
        return _json({"ok": True}, 201)

    # Proof-of-work CAPTCHA. A real browser always has a solution; without one
    # the page falls back to an email draft, so people are never locked out.
    if not pow_captcha.verify(payload.get("altcha"), "lead"):
        security_log.info("lead rejected (captcha) ip=%s", ip)
        return _json({"ok": False, "code": "captcha", "error": "Automatic check failed."}, 400)

    fields = {k: payload.get(k) for k in LeadForm.base_fields if isinstance(payload.get(k), (str, type(None)))}
    form = LeadForm({k: v or "" for k, v in fields.items()})
    if not form.is_valid():
        errors = {field: [str(e) for e in errs] for field, errs in form.errors.items()}
        return _json({"ok": False, "errors": errors}, 400)

    data = form.cleaned_data
    lead = Lead.objects.create(
        kind=data["kind"],
        status=Lead.Status.SPAM if form.looks_like_spam() else Lead.Status.NEW,
        name=data["name"],
        email=data["email"],
        company=data["company"],
        phone=data["phone"],
        interest=data["interest"],
        product=data["product"],
        message=data["message"],
        source_page=data["page"],
        ip_address=ip if ip != "0.0.0.0" else None,
        user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:300],
    )
    log.info("lead stored id=%s kind=%s", lead.pk, lead.kind)
    if lead.status != Lead.Status.SPAM:
        notify_new_lead(lead)
    return _json({"ok": True}, 201)


@never_cache
@require_GET
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return _json({"ok": True})
    except Exception:  # noqa: BLE001 - report only up/down
        log.exception("health check failed")
        return _json({"ok": False}, 503)
