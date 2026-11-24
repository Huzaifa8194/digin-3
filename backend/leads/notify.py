from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.urls import reverse

from .models import Lead, SiteSettings

log = logging.getLogger("digiinn")


def _one_line(value: str, limit: int = 80) -> str:
    return " ".join((value or "").split())[:limit]


def notify_new_lead(lead: Lead) -> None:
    """Email the team. Failures are logged, never shown to the visitor."""
    if not getattr(settings, "EMAIL_ENABLED", True):
        return
    recipients = SiteSettings.load().recipients()
    if not recipients:
        return
    topic = lead.product or lead.interest or lead.get_partner_type_display() or lead.get_kind_display()
    subject = f"[Website] {lead.get_kind_display()}: {_one_line(topic)}"
    admin_path = reverse("admin:leads_lead_change", args=[lead.pk])
    body = "\n".join(
        [
            f"New {lead.get_kind_display().lower()} from the website.",
            "",
            f"Name:     {lead.name or '-'}",
            f"Email:    {lead.email}",
            f"Company:  {lead.company or '-'}",
            f"Phone:    {lead.phone or '-'}",
            f"Topic:    {topic}",
            *(
                [
                    f"Partner:  {lead.get_partner_type_display()}",
                    f"Website:  {lead.company_website or '-'}",
                    f"Country:  {lead.country or '-'}",
                ]
                if lead.kind == Lead.Kind.PARTNER
                else []
            ),
            f"Page:     {lead.source_page or '-'}",
            "",
            lead.message or "(no message)",
            "",
            f"Open in admin: {settings.SITE_URL.rstrip('/')}{admin_path}",
        ]
    )
    try:
        EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients,
            reply_to=[lead.email],
        ).send(fail_silently=False)
    except Exception:  # noqa: BLE001
        log.exception("could not send lead notification id=%s", lead.pk)
