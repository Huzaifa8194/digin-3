from __future__ import annotations

import csv
import logging

from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import ChoicesDropdownFilter, RangeDateFilter
from unfold.decorators import action, display

from .models import Lead, SiteSettings

security_log = logging.getLogger("digiinn.security")

STATUS_COLORS = {
    Lead.Status.NEW: "info",
    Lead.Status.CONTACTED: "warning",
    Lead.Status.QUALIFIED: "primary",
    Lead.Status.WON: "success",
    Lead.Status.CLOSED: "default",
    Lead.Status.SPAM: "danger",
}


def _csv_safe(value) -> str:
    """Stop spreadsheet formula injection (=, +, -, @ at the start of a cell)."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


@admin.register(Lead)
class LeadAdmin(ModelAdmin):
    list_display = ("created_at", "kind_label", "who", "email_link", "topic", "status_label", "assigned_to")
    list_display_links = ("created_at", "who")
    list_filter = (
        ("status", ChoicesDropdownFilter),
        ("kind", ChoicesDropdownFilter),
        ("partner_type", ChoicesDropdownFilter),
        ("created_at", RangeDateFilter),
        "assigned_to",
    )
    list_filter_submit = True
    search_fields = ("name", "email", "company", "message", "interest", "product", "country", "company_website")
    date_hierarchy = "created_at"
    list_per_page = 50
    actions = ["mark_contacted", "mark_spam", "export_csv"]
    readonly_fields = (
        "kind", "name", "email", "company", "phone", "interest", "product", "message",
        "partner_type", "company_website", "country",
        "source_page", "created_at", "updated_at", "contacted_at", "ip_address", "user_agent",
    )
    fieldsets = (
        ("Submission", {"fields": ("kind", "created_at", "name", "email", "company", "phone", "interest", "product", "message", "source_page")}),
        ("Partner details", {"fields": ("partner_type", "company_website", "country")}),
        ("Follow-up", {"fields": ("status", "assigned_to", "internal_notes", "contacted_at")}),
        ("Technical", {"classes": ("collapse",), "fields": ("ip_address", "user_agent", "updated_at")}),
    )

    def has_add_permission(self, request):
        return False  # leads only come from the website

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "assigned_to":
            from django.contrib.auth import get_user_model

            kwargs["queryset"] = get_user_model().objects.filter(is_staff=True, is_active=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if obj.status != Lead.Status.NEW and obj.contacted_at is None:
            obj.contacted_at = timezone.now()
        super().save_model(request, obj, form, change)

    def get_fieldsets(self, request, obj=None):
        sets = super().get_fieldsets(request, obj)
        if obj is not None and obj.kind != Lead.Kind.PARTNER:
            sets = tuple(s for s in sets if s[0] != "Partner details")
        return sets

    @display(description="Type", label={"Project inquiry": "primary", "Demo request": "info", "Partner application": "success"})
    def kind_label(self, obj):
        return obj.get_kind_display()

    @display(description="Name", ordering="name")
    def who(self, obj):
        return obj.name or "—"

    @display(description="Email", ordering="email")
    def email_link(self, obj):
        return format_html('<a href="mailto:{}">{}</a>', obj.email, obj.email)

    @display(description="Topic")
    def topic(self, obj):
        text = obj.product or obj.interest or obj.get_partner_type_display() or ""
        return text[:60]

    @display(
        description="Status",
        ordering="status",
        label={Lead.Status(k).label: v for k, v in STATUS_COLORS.items()},
    )
    def status_label(self, obj):
        return obj.get_status_display()

    @action(description="Mark as contacted")
    def mark_contacted(self, request, queryset):
        updated = queryset.filter(status=Lead.Status.NEW).update(
            status=Lead.Status.CONTACTED, contacted_at=timezone.now()
        )
        self.message_user(request, f"{updated} lead(s) marked as contacted.", messages.SUCCESS)

    @action(description="Mark as spam")
    def mark_spam(self, request, queryset):
        updated = queryset.update(status=Lead.Status.SPAM)
        self.message_user(request, f"{updated} lead(s) marked as spam.", messages.SUCCESS)

    @action(description="Export selected to CSV", permissions=["export"])
    def export_csv(self, request, queryset):
        if not self.has_export_permission(request):
            raise PermissionDenied
        security_log.info("leads exported user=%s count=%s", request.user.get_username(), queryset.count())
        stamp = timezone.localtime().strftime("%Y%m%d-%H%M")
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="leads-{stamp}.csv"'
        response.write("﻿")  # Excel-friendly UTF-8
        writer = csv.writer(response)
        columns = ["created_at", "kind", "status", "name", "email", "company", "phone", "interest", "product",
                   "partner_type", "company_website", "country", "message", "source_page"]
        writer.writerow(columns)
        for lead in queryset.iterator():
            row = []
            for c in columns:
                value = getattr(lead, c)
                if c == "created_at":
                    value = timezone.localtime(value).strftime("%Y-%m-%d %H:%M")
                row.append(_csv_safe(value))
            writer.writerow(row)
        return response

    def has_export_permission(self, request):
        return request.user.has_perm("leads.export_lead")


@admin.register(SiteSettings)
class SiteSettingsAdmin(ModelAdmin):
    fieldsets = (
        ("Website forms", {"fields": ("accept_submissions", "notify_emails")}),
        ("Data retention", {"fields": ("retention_days",)}),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        from django.shortcuts import redirect
        from django.urls import reverse

        obj = SiteSettings.load()
        return redirect(reverse("admin:leads_sitesettings_change", args=[obj.pk]))
