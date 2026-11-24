"""Admin dashboard data, sidebar and environment badge (Unfold callbacks)."""
from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db.models import Count
from django.urls import reverse_lazy
from django.utils import timezone


def environment_badge(request):
    if settings.DEBUG:
        return ["Development", "warning"]
    return ["Live", "success"]


def _perm(name):
    return lambda request: request.user.has_perm(name)


def sidebar_navigation(request):
    return [
        {
            "title": "Website",
            "items": [
                {"title": "Dashboard", "icon": "dashboard", "link": reverse_lazy("admin:index")},
                {"title": "Leads", "icon": "inbox", "link": reverse_lazy("admin:leads_lead_changelist"),
                 "permission": _perm("leads.view_lead"), "badge": "core.dashboard.new_leads_badge"},
                {"title": "Website settings", "icon": "tune", "link": reverse_lazy("admin:leads_sitesettings_changelist"),
                 "permission": _perm("leads.view_sitesettings")},
                {"title": "Open the website", "icon": "open_in_new", "link": "/"},
            ],
        },
        {
            "title": "Team & access",
            "collapsible": True,
            "items": [
                {"title": "Users", "icon": "person", "link": reverse_lazy("admin:auth_user_changelist"),
                 "permission": _perm("auth.view_user")},
                {"title": "Groups", "icon": "group", "link": reverse_lazy("admin:auth_group_changelist"),
                 "permission": _perm("auth.view_group")},
                {"title": "My backup codes", "icon": "key", "link": reverse_lazy("admin:otp_backup_codes")},
            ],
        },
        {
            "title": "Security",
            "collapsible": True,
            "items": [
                {"title": "Audit trail", "icon": "history", "link": reverse_lazy("admin:admin_logentry_changelist"),
                 "permission": _perm("admin.view_logentry")},
                {"title": "Lockouts", "icon": "lock", "link": reverse_lazy("admin:axes_accessattempt_changelist"),
                 "permission": _perm("axes.view_accessattempt")},
                {"title": "Failed logins", "icon": "gpp_maybe", "link": reverse_lazy("admin:axes_accessfailurelog_changelist"),
                 "permission": _perm("axes.view_accessfailurelog")},
                {"title": "Sign-in history", "icon": "login", "link": reverse_lazy("admin:axes_accesslog_changelist"),
                 "permission": _perm("axes.view_accesslog")},
                {"title": "Authenticators", "icon": "phonelink_lock", "link": reverse_lazy("admin:otp_totp_totpdevice_changelist"),
                 "permission": _perm("otp_totp.view_totpdevice")},
            ],
        },
    ]


def new_leads_badge(request):
    from leads.models import Lead

    count = Lead.objects.filter(status=Lead.Status.NEW).count()
    return str(count) if count else ""


def dashboard_callback(request, context):
    from axes.models import AccessFailureLog
    from leads.models import Lead

    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    real = Lead.objects.exclude(status=Lead.Status.SPAM)
    can_view = request.user.has_perm("leads.view_lead")

    kpis = [
        {"title": "New, not yet handled", "value": real.filter(status=Lead.Status.NEW).count(),
         "link": f"{reverse_lazy('admin:leads_lead_changelist')}?status__exact=new"},
        {"title": "Leads in the last 7 days", "value": real.filter(created_at__gte=week_ago).count()},
        {"title": "Leads in the last 30 days", "value": real.filter(created_at__gte=month_ago).count()},
        {"title": "Failed admin logins (7 days)", "value": AccessFailureLog.objects.filter(attempt_time__gte=week_ago).count()},
    ]
    by_topic = (
        real.filter(created_at__gte=month_ago)
        .values("interest", "product")
        .annotate(total=Count("id"))
        .order_by("-total")[:8]
    )
    recent = real.select_related("assigned_to")[:10] if can_view else []

    context.update(
        {
            "kpis": kpis,
            "can_view_leads": can_view,
            "topics_table": {
                "headers": ["Service / product", "Leads"],
                "rows": [[row["product"] or row["interest"] or "—", row["total"]] for row in by_topic],
            },
            "recent_table": {
                "headers": ["Received", "Name", "Email", "Topic", "Status"],
                "rows": [
                    [
                        timezone.localtime(lead.created_at).strftime("%d %b %Y, %H:%M"),
                        lead.name or "—",
                        lead.email,
                        (lead.product or lead.interest or "")[:50],
                        lead.get_status_display(),
                    ]
                    for lead in recent
                ],
            },
        }
    )
    return context
