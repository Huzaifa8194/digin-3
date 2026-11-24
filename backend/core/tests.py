import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice

ADMIN = f"/{settings.ADMIN_PATH}/"


@override_settings(POW_ENABLED=False)
class AdminTwoFactorTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser("boss", "b@example.com", "a-long-password-123")

    def login(self, password="a-long-password-123"):
        return self.client.post(f"{ADMIN}login/", {"username": "boss", "password": password, "next": ADMIN})

    def code(self, device):
        return f"{totp(device.bin_key, device.step, device.t0, device.digits):06d}"

    def test_password_alone_does_not_open_admin(self):
        self.login()
        res = self.client.get(ADMIN)
        self.assertEqual(res.status_code, 302)
        res = self.client.get(res["Location"])
        self.assertRedirects(res, f"{ADMIN}2fa/?next={ADMIN.replace('/', '%2F')}", fetch_redirect_response=False)

    def test_enrolment_then_access(self):
        self.login()
        res = self.client.get(f"{ADMIN}2fa/")
        self.assertContains(res, "<svg")
        device = TOTPDevice.objects.get(user=self.user, confirmed=False)
        res = self.client.post(f"{ADMIN}2fa/", {"token": self.code(device), "next": ADMIN})
        self.assertContains(res, "backup codes", status_code=200)
        self.assertEqual(self.client.get(ADMIN).status_code, 200)
        self.assertTrue(TOTPDevice.objects.get(pk=device.pk).confirmed)

    def test_wrong_code_rejected_and_session_ends_after_limit(self):
        self.login()
        self.client.get(f"{ADMIN}2fa/")
        for _ in range(10):
            self.client.post(f"{ADMIN}2fa/", {"token": "000000"})
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_open_redirect_blocked(self):
        self.login()
        self.client.get(f"{ADMIN}2fa/")
        device = TOTPDevice.objects.get(user=self.user)
        res = self.client.post(f"{ADMIN}2fa/", {"token": self.code(device), "next": "https://evil.example/"})
        self.assertNotContains(res, "evil.example")

    def test_lockout_after_failed_passwords(self):
        for _ in range(5):
            self.login("wrong-password")
        res = self.login()
        self.assertEqual(res.status_code, 429)


class AdminSiteWiringTests(TestCase):
    def test_admin_site_enforces_2fa(self):
        from django.contrib import admin

        from core.admin_site import SecureAdminSite

        site = getattr(admin.site, "_wrapped", admin.site)
        self.assertIsInstance(site, SecureAdminSite)


class HeadersTests(TestCase):
    def test_security_headers_on_api(self):
        res = self.client.get("/api/form-session/")
        self.assertIn("default-src 'self'", res["Content-Security-Policy"])
        self.assertEqual(res["X-Frame-Options"], "DENY")
        self.assertEqual(res["Cache-Control"], "no-store")
        self.assertIn("camera=()", res["Permissions-Policy"])

    def test_admin_ip_allow_list(self):
        with override_settings(ADMIN_ALLOWED_IPS=["10.0.0.0/8"]):
            self.assertEqual(self.client.get(f"{ADMIN}login/").status_code, 404)
        with override_settings(ADMIN_ALLOWED_IPS=["127.0.0.1"]):
            self.assertEqual(self.client.get(f"{ADMIN}login/").status_code, 200)

    def test_api_404_is_json(self):
        res = self.client.get("/api/nope/")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["ok"], False)

    def test_inline_script_hashes_match_built_pages(self):
        from core.csp import inline_script_hashes

        if not settings.FRONTEND_DIR.is_dir():
            self.skipTest("site not built")
        for h in inline_script_hashes():
            self.assertRegex(h, re.compile(r"^'sha256-[A-Za-z0-9+/=]+'$"))


@override_settings(POW_ENABLED=False)
class AuditFixTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser("boss", "b@example.com", "a-long-password-123")

    def _login(self, client):
        client.post(f"{ADMIN}login/", {"username": "boss", "password": "a-long-password-123", "next": ADMIN})

    def test_enrolment_secret_is_per_session(self):
        from django.test import Client

        first, second = Client(), Client()
        self._login(first)
        first.get(f"{ADMIN}2fa/")
        key_seen_by_first = TOTPDevice.objects.get(user=self.user).key
        first.post(f"{ADMIN}2fa/", {"action": "cancel"})
        self._login(second)
        second.get(f"{ADMIN}2fa/")
        devices = TOTPDevice.objects.filter(user=self.user)
        self.assertEqual(devices.count(), 1)
        self.assertNotEqual(devices.get().key, key_seen_by_first)

    def test_spoofed_proxy_headers_ignored(self):
        from django.test import RequestFactory

        from core.middleware import ProxyHeadersMiddleware
        from core.net import get_client_ip

        with override_settings(CLIENT_IP_HEADER="HTTP_CF_CONNECTING_IP", TRUSTED_PROXY_CIDRS=["cloudflare"]):
            from core.net import trusted_proxy_networks

            trusted_proxy_networks.cache_clear()
            seen = {}
            mw = ProxyHeadersMiddleware(lambda r: seen.setdefault("ip", get_client_ip(r)) and None)
            req = RequestFactory().get("/", REMOTE_ADDR="198.51.100.7", HTTP_CF_CONNECTING_IP="10.1.1.1",
                                       HTTP_X_FORWARDED_PROTO="https")
            mw(req)
            self.assertEqual(seen["ip"], "198.51.100.7")
            self.assertNotIn("HTTP_X_FORWARDED_PROTO", req.META)
            seen.clear()
            req = RequestFactory().get("/", REMOTE_ADDR="173.245.48.10", HTTP_CF_CONNECTING_IP="203.0.113.9")
            mw(req)
            self.assertEqual(seen["ip"], "203.0.113.9")
            trusted_proxy_networks.cache_clear()

    def test_ipv6_grouped_by_64(self):
        from django.test import RequestFactory

        from core.net import client_bucket

        a = RequestFactory().get("/", REMOTE_ADDR="2001:db8:1:2::1")
        b = RequestFactory().get("/", REMOTE_ADDR="2001:db8:1:2:ffff::9")
        self.assertEqual(client_bucket(a), client_bucket(b))

    def test_staff_cannot_escalate_or_edit_superuser(self):
        from django.contrib.auth.models import Permission

        staff = get_user_model().objects.create_user("helper", "h@example.com", "another-long-pass-1", is_staff=True)
        staff.user_permissions.add(*Permission.objects.filter(codename__in=["change_user", "view_user"]))
        from django.contrib import admin
        from django.test import RequestFactory

        req = RequestFactory().get("/")
        req.user = staff
        model_admin = admin.site._registry[get_user_model()]
        self.assertFalse(model_admin.has_change_permission(req, self.user))
        self.assertIn("is_superuser", model_admin.get_readonly_fields(req, staff))


@override_settings(POW_MAX_NUMBER=2000)
class AdminLoginCaptchaTests(TestCase):
    def setUp(self):
        get_user_model().objects.create_superuser("boss", "b@example.com", "a-long-password-123")

    def test_login_needs_solved_puzzle(self):
        import html
        import json

        from leads.tests import solve

        res = self.client.post(f"{ADMIN}login/", {"username": "boss", "password": "a-long-password-123"})
        self.assertContains(res, "security check")
        self.assertNotIn("_auth_user_id", self.client.session)

        page = self.client.get(f"{ADMIN}login/").content.decode()
        raw = re.search(r'data-challenge="([^"]+)"', page).group(1)
        altcha = solve(json.loads(html.unescape(raw)))
        self.client.post(f"{ADMIN}login/", {"username": "boss", "password": "a-long-password-123", "altcha": altcha})
        self.assertIn("_auth_user_id", self.client.session)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", EMAIL_ENABLED=True, POW_ENABLED=False)
    def test_lockout_sends_alert(self):
        from django.core import mail
        from django.core.cache import cache

        cache.clear()
        for _ in range(6):
            self.client.post(f"{ADMIN}login/", {"username": "boss", "password": "wrong-password"})
        self.assertTrue(any("locked" in m.subject for m in mail.outbox), [m.subject for m in mail.outbox])


class MovedPageRedirectTests(TestCase):
    def test_old_product_addresses_redirect_permanently(self):
        for old, new in [("/sysbastion-2/", "/sysbastion/"), ("/sysbastion-2/ui-lab/", "/sysbastion/"),
                         ("/mobile-pentest/", "/appsiege/"), ("/mobile-pentest", "/appsiege/"), ("/app-siege/", "/appsiege/")]:
            res = self.client.get(old)
            self.assertEqual(res.status_code, 301, old)
            self.assertEqual(res["Location"], new, old)
