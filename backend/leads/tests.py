import json
import time
from unittest import mock

from django.core import mail, signing
from django.core.cache import cache
from django.test import Client, TestCase, override_settings

from .api import FORM_TOKEN_SALT
from .models import Lead, SiteSettings


def old_token(seconds_ago=10):
    return signing.dumps({"t": int(time.time()) - seconds_ago}, salt=FORM_TOKEN_SALT)


def solve(puzzle):
    from altcha import solve_challenge_v1

    sol = solve_challenge_v1(puzzle["challenge"], puzzle["salt"], puzzle["algorithm"], puzzle["maxNumber"])
    return json.dumps({k: puzzle[k] for k in ("algorithm", "challenge", "salt", "signature")} | {"number": sol.number})


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", POW_MAX_NUMBER=2000, EMAIL_ENABLED=True)
class LeadApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        session = self.client.get("/api/form-session/").json()
        self.csrf = session["csrfToken"]

    def fresh_altcha(self):
        return solve(self.client.get("/api/form-session/").json()["pow"])

    def post(self, data, **extra):
        if "altcha" not in data:
            data = {**data, "altcha": self.fresh_altcha()}
        body = {"kind": "inquiry", "name": "Ali", "email": "ali@example.com", "message": "Need a pentest",
                "interest": "Software development", "page": "/contact/", "formToken": old_token(), **data}
        return self.client.post("/api/leads/", json.dumps(body), content_type="application/json",
                                HTTP_X_CSRFTOKEN=self.csrf, **extra)

    def test_valid_inquiry_is_stored_and_notified(self):
        res = self.post({})
        self.assertEqual(res.status_code, 201, res.content)
        lead = Lead.objects.get()
        self.assertEqual(lead.email, "ali@example.com")
        self.assertEqual(lead.status, Lead.Status.NEW)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].reply_to, ["ali@example.com"])

    def test_csrf_required(self):
        client = Client(enforce_csrf_checks=True)
        res = client.post("/api/leads/", json.dumps({"kind": "inquiry"}), content_type="application/json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "csrf")
        self.assertFalse(Lead.objects.exists())

    def test_json_only(self):
        res = self.client.post("/api/leads/", {"kind": "inquiry"}, HTTP_X_CSRFTOKEN=self.csrf)
        self.assertEqual(res.status_code, 415)

    def test_validation_errors(self):
        res = self.post({"email": "not-an-email", "name": "", "message": ""})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(set(res.json()["errors"]), {"email", "name", "message"})

    def test_honeypot_silently_dropped(self):
        res = self.post({"website": "http://spam"})
        self.assertEqual(res.status_code, 201)
        self.assertFalse(Lead.objects.exists())

    def test_too_fast_or_forged_token_dropped(self):
        self.assertEqual(self.post({"formToken": old_token(0)}).status_code, 201)
        self.assertEqual(self.post({"formToken": "forged"}).status_code, 201)
        self.assertFalse(Lead.objects.exists())

    def test_rate_limit(self):
        for _ in range(5):
            self.assertEqual(self.post({}).status_code, 201)
        self.assertEqual(self.post({}).status_code, 429)
        self.assertEqual(Lead.objects.count(), 5)

    def test_kill_switch(self):
        s = SiteSettings.load()
        s.accept_submissions = False
        s.save()
        self.assertEqual(self.post({}).status_code, 503)

    def test_control_characters_and_bidi_removed(self):
        self.assertEqual(self.post({"name": "Ali" + chr(0)}).status_code, 400)  # null bytes rejected
        res = self.post({"name": "Al" + chr(0x202E) + "i" + chr(0x200B), "page": "//evil.example/x"})
        self.assertEqual(res.status_code, 201, res.content)
        lead = Lead.objects.get()
        self.assertEqual(lead.name, "Ali")
        self.assertEqual(lead.source_page, "")

    def test_link_heavy_message_marked_spam_without_email(self):
        self.post({"message": "http://a http://b http://c http://d"})
        self.assertEqual(Lead.objects.get().status, Lead.Status.SPAM)
        self.assertEqual(len(mail.outbox), 0)

    def test_demo_request_needs_only_email(self):
        res = self.post({"kind": "demo", "name": "", "message": "", "product": "SysBastion V1.4"})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Lead.objects.get().kind, "demo")

    def test_oversized_body_rejected(self):
        res = self.post({"message": "x" * 20000})
        self.assertEqual(res.status_code, 413)

    def test_mail_failure_does_not_break_submission(self):
        with mock.patch("leads.notify.EmailMessage.send", side_effect=OSError("smtp down")):
            self.assertEqual(self.post({}).status_code, 201)

    def test_missing_captcha_rejected(self):
        res = self.post({"altcha": ""})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["code"], "captcha")
        self.assertFalse(Lead.objects.exists())

    def test_captcha_solution_is_single_use(self):
        altcha = self.fresh_altcha()
        self.assertEqual(self.post({"altcha": altcha}).status_code, 201)
        self.assertEqual(self.post({"altcha": altcha}).status_code, 400)
        self.assertEqual(Lead.objects.count(), 1)

    def test_wrong_answer_rejected(self):
        puzzle = self.client.get("/api/form-session/").json()["pow"]
        right = json.loads(solve(puzzle))
        wrong = json.dumps({**right, "number": right["number"] + 1})
        self.assertEqual(self.post({"altcha": wrong}).status_code, 400)

    def test_login_puzzle_not_accepted_for_forms(self):
        from core.pow import new_challenge

        self.assertEqual(self.post({"altcha": solve(new_challenge("login"))}).status_code, 400)

    def test_csv_formula_escaping(self):
        from .admin import _csv_safe

        self.assertEqual(_csv_safe("=HYPERLINK(1)"), "'=HYPERLINK(1)")
        self.assertEqual(_csv_safe("normal"), "normal")


class AuditFixApiTests(LeadApiTests):
    def test_deeply_nested_json_is_400_not_500(self):
        body = "[" * 8000 + "]" * 8000
        res = self.client.post("/api/leads/", body, content_type="application/json", HTTP_X_CSRFTOKEN=self.csrf)
        self.assertEqual(res.status_code, 400)

    def test_rate_limit_window_survives_quiet_hour(self):
        from unittest import mock as _mock

        from .api import _rate_limited

        start = time.time()
        with override_settings(LEADS_RATE_LIMITS=((2, 86400),)):
            with _mock.patch("leads.api.time.time", return_value=start):
                self.assertFalse(_rate_limited("1.2.3.4"))
                self.assertFalse(_rate_limited("1.2.3.4"))
            with _mock.patch("leads.api.time.time", return_value=start + 7200):
                self.assertTrue(_rate_limited("1.2.3.4"))


class PartnerApplicationTests(LeadApiTests):
    def partner(self, **extra):
        return self.post({"kind": "partner", "name": "Sara", "company": "Netguard Ltd", "email": "sara@netguard.example",
                          "partner_type": "msp", "company_website": "netguard.example", "country": "UAE",
                          "product": "SysBastion, DarkIntel360", "message": "We run SOC services for 40 clients.", **extra})

    def test_partner_application_stored(self):
        res = self.partner()
        self.assertEqual(res.status_code, 201, res.content)
        lead = Lead.objects.get()
        self.assertEqual(lead.kind, "partner")
        self.assertEqual(lead.partner_type, "msp")
        self.assertEqual(lead.company_website, "https://netguard.example")
        self.assertIn("Managed service provider", mail.outbox[0].body)

    def test_partner_requires_company_and_type(self):
        res = self.partner(company="", partner_type="")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(set(res.json()["errors"]), {"company", "partner_type"})

    def test_partner_type_must_be_known(self):
        res = self.partner(partner_type="owner")
        self.assertEqual(res.status_code, 400)

    def test_bad_website_rejected(self):
        res = self.partner(company_website="javascript:alert(1)")
        self.assertEqual(res.status_code, 400)
        self.assertIn("company_website", res.json()["errors"])


@override_settings(ADMIN_REQUIRE_2FA=False, POW_ENABLED=False)
class LeadAdminPagesTests(TestCase):
    def test_partner_and_inquiry_admin_pages_render(self):
        from django.conf import settings as dj
        from django.contrib.auth import get_user_model

        boss = get_user_model().objects.create_superuser("boss", "b@example.com", "a-long-password-123")
        self.client.force_login(boss)
        partner = Lead.objects.create(kind="partner", name="Sara", email="s@x.example", company="Net", partner_type="msp")
        inquiry = Lead.objects.create(kind="inquiry", name="Ali", email="a@x.example", message="hi")
        base = f"/{dj.ADMIN_PATH}/leads/lead/"
        self.assertContains(self.client.get(base + "?partner_type__exact=msp"), "Sara")
        self.assertContains(self.client.get(f"{base}{partner.pk}/change/"), "Partner details")
        self.assertNotContains(self.client.get(f"{base}{inquiry.pk}/change/"), "Partner details")
        self.assertEqual(self.client.get(f"/{dj.ADMIN_PATH}/").status_code, 200)
