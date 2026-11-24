from __future__ import annotations

import logging

from django.conf import settings
from django.http import Http404, HttpRequest, HttpResponse

from .csp import admin_policy, site_policy
from .net import from_trusted_proxy, get_client_ip, ip_in_networks

security_log = logging.getLogger("digiinn.security")

PERMISSIONS_POLICY = (
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), "
    "microphone=(), payment=(), usb=(), interest-cohort=()"
)


def _is_admin_path(path: str) -> bool:
    return path.startswith(f"/{settings.ADMIN_PATH}/") or path == f"/{settings.ADMIN_PATH}"


PROXY_HEADERS = ("HTTP_X_FORWARDED_FOR", "HTTP_X_FORWARDED_PROTO", "HTTP_X_REAL_IP", "HTTP_CF_CONNECTING_IP", "HTTP_TRUE_CLIENT_IP")


class ProxyHeadersMiddleware:
    """Drops client-IP / protocol headers unless the request came from a trusted proxy."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if not from_trusted_proxy(request):
            for name in PROXY_HEADERS:
                request.META.pop(name, None)
        return self.get_response(request)


class SecurityHeadersMiddleware:
    """Adds CSP, Permissions-Policy and cache rules to every response,
    including the static site files served by WhiteNoise."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        secure = request.is_secure()
        path = request.path
        if "Content-Security-Policy" not in response:
            policy = admin_policy(secure) if _is_admin_path(path) else site_policy(secure)
            response["Content-Security-Policy"] = policy
        response.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        response.setdefault("X-Content-Type-Options", "nosniff")
        response.setdefault("X-Frame-Options", "DENY")
        if _is_admin_path(path) or path.startswith("/api/"):
            response["Cache-Control"] = "no-store"
            response["X-Robots-Tag"] = "noindex, nofollow"
        return response


class AdminIPAllowListMiddleware:
    """When ADMIN_ALLOWED_IPS is set, the admin answers 404 to everyone else."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        allowed = settings.ADMIN_ALLOWED_IPS
        if allowed and _is_admin_path(request.path):
            ip = get_client_ip(request)
            if not ip_in_networks(ip, allowed):
                security_log.warning("admin blocked by IP allow-list ip=%s path=%s", ip, request.path)
                raise Http404
        return self.get_response(request)
