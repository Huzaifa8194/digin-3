# Digiinn360 website: security checklist

No website can be guaranteed "never hacked". The goal is defence in depth:
many independent layers, so a single mistake or new attack does not open the
door, and anything unusual gets noticed quickly. The website code already
covers its part (list at the end). The steps below are for the **hosting and
accounts**, which code cannot control. Do them in this order.

## 1. Right after installing (30 minutes)

- [ ] **Change the old site's passwords.** The previous site stored its
      database password, Django secret key and the Gmail password in plain text
      in `settings.py`. Change the Gmail password, change or delete the old
      MySQL user, and delete the old app folder once the new site is live.
- [ ] **Delete old database dumps** (`db_backup/*.sql`) from the server and any
      shared drives. They contain job applicants' personal data.
- [ ] **cPanel login:** long unique password, and turn on cPanel
      **Security → Two-Factor Authentication**.
- [ ] **Remove unused FTP accounts** (cPanel → FTP Accounts). Use SFTP only.
- [ ] **Email anti-spoofing:** cPanel → **Email Deliverability** → fix SPF and
      DKIM for the domain, then add a DMARC record
      (`v=DMARC1; p=quarantine; rua=mailto:info@yourdomain`). This stops
      criminals sending phishing emails "from" your domain.

## 2. Put Cloudflare in front (free plan, 1 hour)

Cloudflare filters attacks before they reach the server: DDoS protection, a
web application firewall (WAF) and bot blocking.

1. Add the domain at cloudflare.com and switch the nameservers at your registrar.
2. **SSL/TLS → Full (strict)**, and turn on **Always Use HTTPS**.
3. **Security → WAF → Managed rules**: turn on the free managed ruleset.
4. **Security → WAF → Rate limiting rules**: add one rule:
   URI path starts with `/digibe/login` or equals `/api/leads/`,
   more than 10 requests per minute from one IP → Block for 10 minutes.
5. In the app's `.env`, uncomment the three Cloudflare lines at the end, run
   `python install.py`, and press Restart. Without this, the site cannot see
   visitors' real IP addresses behind Cloudflare.
6. Under heavy attack: **Overview → Under Attack Mode** (turn off afterwards).

## 3. Ask your hosting company (one email)

- [ ] Is **ModSecurity with the OWASP Core Rule Set** (or **Imunify360**)
      enabled for our account? Please enable it. (cPanel → ModSecurity shows
      the switch on some hosts.)
- [ ] Are **daily backups** kept off the server, and for how long?

## 4. Keep it safe (monthly, 15 minutes)

- [ ] Admin → **Security → Failed logins / Lockouts**: anything unexpected?
- [ ] Admin → **Users**: remove people who left. Everyone has their own
      account; only give *superuser* to one or two people.
- [ ] Download a **backup** (cPanel → Backup) and keep one copy off the server.
      Test a restore once a year.
- [ ] Ask the developer to run the dependency checks (`pip-audit`,
      `npm audit`) and send a new package if anything is outdated.
- [ ] Optional: a free uptime monitor (e.g. UptimeRobot) on
      `https://yourdomain/api/health/`, so you hear about outages first.
- [ ] Before **24 Nov 2027**: renew the date in `/.well-known/security.txt`
      (the developer rebuilds the package).

Security alert emails (lockouts, 2FA resets) go to superusers' email
addresses, once email is set up in `.env` (see START-HERE.md).

## Extra hardening you can switch on in `.env`

| Setting | Effect |
|---|---|
| `ADMIN_ALLOWED_IPS=203.0.113.10` | Admin only reachable from the office IP(s). Everyone else gets "not found". |
| `POW_MAX_NUMBER=200000` | Makes the anti-bot puzzle 4× harder during a spam wave (slower phones wait a little longer). |
| Admin → Website settings → *Accept submissions* off | Pauses the forms; visitors are offered email instead. |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS=true` | Only once **every** subdomain (mail, webmail, cpanel…) works on HTTPS. |

## Already built into the website

Mapped to the OWASP Top 10 (2025):

- **Access control:** admin needs password **and** authenticator code (backup
  codes for lost phones). Staff can't make themselves superusers. Optional
  IP allow-list. Admin address is not linked anywhere.
- **Brute force and bots:** lockout after 5 wrong passwords (30 min);
  self-hosted proof-of-work CAPTCHA (ALTCHA) on the admin login and on every
  form, with no Google/third-party tracking; honeypot field; minimum fill time;
  per-IP rate limits (5 per 10 min, 20 per day); link-spam detection.
- **Misconfiguration:** debug off; secrets only in `.env` (readable by the
  account owner only); HTTPS forced with HSTS; secure, HttpOnly, SameSite
  cookies with `__Host-` prefix; strict Content-Security-Policy with hashed
  inline scripts; clickjacking, MIME-sniffing and permission headers; no file
  uploads at all.
- **Supply chain:** every Python package pinned to an exact version and
  checksum (`requirements.txt` with hashes); no known vulnerabilities at
  release (pip-audit, npm audit).
- **Injection / XSS:** Django ORM only (no raw SQL); all output escaped;
  control and invisible characters stripped from input; CSV export neutralises
  spreadsheet formulas; email headers cannot be injected.
- **Logging and alerting:** audit trail of every admin change, failed-login and
  sign-in history, `logs/security.log`, and alert emails for lockouts and 2FA
  resets.
- **Errors:** generic error pages; oversized or malformed requests rejected
  cleanly.
- **Vulnerability reports:** `/.well-known/security.txt` tells researchers to
  write to info@digiinn360.com.
