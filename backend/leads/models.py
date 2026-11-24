from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone


class Lead(models.Model):
    class Kind(models.TextChoices):
        INQUIRY = "inquiry", "Project inquiry"
        DEMO = "demo", "Demo request"

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        WON = "won", "Won"
        CLOSED = "closed", "Closed / no fit"
        SPAM = "spam", "Spam"

    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.INQUIRY, db_index=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW, db_index=True)

    name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(max_length=254, db_index=True)
    company = models.CharField(max_length=160, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    interest = models.CharField("Service / topic", max_length=160, blank=True)
    product = models.CharField(max_length=80, blank=True)
    message = models.TextField(blank=True)
    source_page = models.CharField(max_length=200, blank=True)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_leads"
    )
    internal_notes = models.TextField(blank=True, help_text="Only visible to the team.")
    contacted_at = models.DateTimeField(null=True, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        permissions = [("export_lead", "Can export leads to CSV")]

    def __str__(self) -> str:
        who = self.name or self.email
        return f"{self.get_kind_display()} from {who}"


class SiteSettings(models.Model):
    """Single row of settings the team can change without a redeploy."""

    accept_submissions = models.BooleanField(
        default=True,
        help_text="Switch off to pause the website forms (e.g. during a spam wave). Visitors are then offered email instead.",
    )
    notify_emails = models.TextField(
        blank=True,
        help_text="Who gets an email for each new inquiry. One address per line.",
    )
    retention_days = models.PositiveIntegerField(
        default=730,
        help_text="Closed and spam leads older than this are deleted by the 'purge_leads' command.",
    )

    class Meta:
        verbose_name = "Website settings"
        verbose_name_plural = "Website settings"

    def __str__(self) -> str:
        return "Website settings"

    def clean(self):
        from django.core.exceptions import ValidationError
        from django.core.validators import validate_email

        bad = []
        for address in self.recipients():
            try:
                validate_email(address)
            except ValidationError:
                bad.append(address)
        if bad:
            raise ValidationError({"notify_emails": f"Not a valid email address: {', '.join(bad)}"})

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # the single row is never removed
        return (0, {})

    @classmethod
    def load(cls) -> "SiteSettings":
        obj, _ = cls.objects.get_or_create(
            pk=1, defaults={"notify_emails": "\n".join(settings.LEADS_NOTIFY_EMAILS)}
        )
        return obj

    def recipients(self) -> list[str]:
        return [line.strip() for line in self.notify_emails.replace(",", "\n").splitlines() if line.strip()]
