"""Admin registrations for accounts and security records, styled with Unfold."""
from __future__ import annotations

import logging

from axes.models import AccessAttempt, AccessFailureLog, AccessLog
from django.contrib import admin, messages
from django.contrib.admin.models import LogEntry
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group, User
from django_otp.plugins.otp_static.models import StaticDevice
from django_otp.plugins.otp_totp.models import TOTPDevice
from unfold.admin import ModelAdmin
from unfold.decorators import action, display
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

security_log = logging.getLogger("digiinn.security")

for model in (User, Group, TOTPDevice, StaticDevice, AccessAttempt, AccessLog, AccessFailureLog):
    try:
        admin.site.unregister(model)
    except admin.sites.NotRegistered:
        pass


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    list_display = ("username", "email", "first_name", "last_name", "is_staff", "is_superuser", "has_2fa", "last_login")
    actions = ["reset_2fa"]

    PRIVILEGE_FIELDS = ("is_superuser", "is_staff", "groups", "user_permissions")

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if not request.user.is_superuser:
            fields += [f for f in self.PRIVILEGE_FIELDS if f not in fields]
        return fields

    def has_change_permission(self, request, obj=None):
        # Only a superuser may edit (or reset the password of) a superuser.
        if obj is not None and obj.is_superuser and not request.user.is_superuser:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if obj is not None and obj.is_superuser and not request.user.is_superuser:
            return False
        return super().has_delete_permission(request, obj)

    @display(description="2FA set up", boolean=True)
    def has_2fa(self, obj):
        return TOTPDevice.objects.filter(user=obj, confirmed=True).exists()

    @action(description="Reset two-step login (user re-enrols at next login)")
    def reset_2fa(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(request, "Only superusers can reset two-step login.", messages.ERROR)
            return
        for user in queryset:
            TOTPDevice.objects.filter(user=user).delete()
            StaticDevice.objects.filter(user=user).delete()
            security_log.warning("2fa reset target=%s by=%s", user.get_username(), request.user.get_username())
            from .alerts import send_security_alert

            send_security_alert(
                "Two-step login reset",
                f"{request.user.get_username()} reset two-step login for '{user.get_username()}'. "
                "That account will set up a new authenticator at its next login. If you did not expect this, check the audit trail.",
            )
        self.message_user(request, f"Two-step login reset for {queryset.count()} user(s).", messages.SUCCESS)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


class ReadOnlyAdmin(ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(TOTPDevice)
class TOTPDeviceAdmin(ReadOnlyAdmin):
    """Shows who has an authenticator. The secret key is never displayed."""

    list_display = ("user", "name", "confirmed", "last_used_at")
    fields = ("user", "name", "confirmed", "last_used_at", "created_at")
    readonly_fields = fields
    list_filter = ("confirmed",)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(AccessAttempt)
class AccessAttemptAdmin(ReadOnlyAdmin):
    """Current lockouts. Delete a row to unlock that user/IP early."""

    list_display = ("attempt_time", "username", "ip_address", "failures_since_start")
    search_fields = ("username", "ip_address")
    readonly_fields = ("attempt_time", "username", "ip_address", "user_agent", "path_info", "failures_since_start")
    exclude = ("get_data", "post_data", "http_accept")

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(AccessLog)
class AccessLogAdmin(ReadOnlyAdmin):
    list_display = ("attempt_time", "username", "ip_address", "logout_time")
    search_fields = ("username", "ip_address")
    readonly_fields = ("attempt_time", "logout_time", "username", "ip_address", "user_agent", "path_info")
    exclude = ("http_accept",)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AccessFailureLog)
class AccessFailureLogAdmin(ReadOnlyAdmin):
    list_display = ("attempt_time", "username", "ip_address", "locked_out")
    search_fields = ("username", "ip_address")
    list_filter = ("locked_out",)
    readonly_fields = ("attempt_time", "username", "ip_address", "user_agent", "path_info", "locked_out")
    exclude = ("http_accept",)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LogEntry)
class LogEntryAdmin(ReadOnlyAdmin):
    """Audit trail: every change made through the admin."""

    list_display = ("action_time", "user", "content_type", "object_repr", "action_flag_label")
    list_filter = ("action_flag", "content_type")
    search_fields = ("object_repr", "change_message", "user__username")
    date_hierarchy = "action_time"
    readonly_fields = ("action_time", "user", "content_type", "object_id", "object_repr", "action_flag", "change_message")

    @display(description="Action", label={"Added": "success", "Changed": "info", "Deleted": "danger"})
    def action_flag_label(self, obj):
        return {1: "Added", 2: "Changed", 3: "Deleted"}.get(obj.action_flag, str(obj.action_flag))

    def has_delete_permission(self, request, obj=None):
        return False
