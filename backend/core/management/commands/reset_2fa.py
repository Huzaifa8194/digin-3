import logging

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django_otp.plugins.otp_static.models import StaticDevice
from django_otp.plugins.otp_totp.models import TOTPDevice

security_log = logging.getLogger("digiinn.security")


class Command(BaseCommand):
    help = "Remove a user's authenticator and backup codes (lost phone). They set it up again at next login."

    def add_arguments(self, parser):
        parser.add_argument("username")

    def handle(self, *args, **options):
        User = get_user_model()
        try:
            user = User.objects.get(username=options["username"])
        except User.DoesNotExist as exc:
            raise CommandError("No such user.") from exc
        TOTPDevice.objects.filter(user=user).delete()
        StaticDevice.objects.filter(user=user).delete()
        security_log.warning("2fa reset from command line target=%s", user.get_username())
        from core.alerts import send_security_alert

        send_security_alert("Two-step login reset", f"Two-step login for '{user.get_username()}' was reset from the server command line.")
        self.stdout.write(f"Two-step login reset for {user.get_username()}. Ask them to log in now and set it up again.")
