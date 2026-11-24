from __future__ import annotations

from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpRequest
from django.shortcuts import redirect
from django.urls import path, reverse
from unfold.sites import UnfoldAdminSite


def needs_second_factor(request: HttpRequest) -> bool:
    user = getattr(request, "user", None)
    return bool(
        settings.ADMIN_REQUIRE_2FA
        and user is not None
        and user.is_authenticated
        and user.is_active
        and user.is_staff
        and not user.is_verified()
    )


class SecureAdminSite(UnfoldAdminSite):
    site_title = "Digiinn360 Admin"
    site_header = "Digiinn360"
    index_title = "Dashboard"

    def has_permission(self, request: HttpRequest) -> bool:
        if not super().has_permission(request):
            return False
        if settings.ADMIN_REQUIRE_2FA:
            return request.user.is_verified()
        return True

    def login(self, request: HttpRequest, extra_context=None):
        if needs_second_factor(request):
            query = urlencode({"next": request.GET.get("next", "")}) if request.GET.get("next") else ""
            return redirect(reverse("admin:otp") + (f"?{query}" if query else ""))
        return super().login(request, extra_context)

    def get_urls(self):
        from . import twofactor

        extra = [
            path("2fa/", twofactor.otp_view, {"admin_site": self}, name="otp"),
            path("2fa/backup-codes/", twofactor.backup_codes_view, {"admin_site": self}, name="otp_backup_codes"),
        ]
        return extra + super().get_urls()
