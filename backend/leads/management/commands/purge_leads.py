from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from leads.models import Lead, SiteSettings


class Command(BaseCommand):
    help = "Delete closed and spam leads older than the retention period set in the admin."

    def handle(self, *args, **options):
        days = SiteSettings.load().retention_days
        cutoff = timezone.now() - timedelta(days=days)
        deleted, _ = Lead.objects.filter(
            created_at__lt=cutoff, status__in=[Lead.Status.CLOSED, Lead.Status.SPAM]
        ).delete()
        self.stdout.write(f"Deleted {deleted} lead(s) older than {days} days.")
