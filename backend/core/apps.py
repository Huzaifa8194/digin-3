from django.apps import AppConfig
from django.contrib.admin import apps as admin_apps


class SecureAdminConfig(admin_apps.AdminConfig):
    """Replaces django.contrib.admin so admin.site is our 2FA-enforcing site."""

    default = False
    default_site = "core.admin_site.SecureAdminSite"


class CoreConfig(AppConfig):
    default = True
    name = "core"
    verbose_name = "Security"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        from axes.signals import user_locked_out

        from .alerts import on_user_locked_out

        user_locked_out.connect(on_user_locked_out, dispatch_uid="digiinn-lockout-alert")
