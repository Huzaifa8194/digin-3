# Keep the Digiinn360 website safe

A short checklist for after the website is online.

No website can promise it will never be attacked. What works is many layers
of protection, so one mistake does not open the door, and anything strange is
noticed quickly. The website already protects itself (see the last section).
The steps below protect your **hosting account and email**, which the website
cannot do on its own. Do them in this order. Tick each box when done.

---

## 1. Right after installing (about 30 minutes)

- [ ] **Change the old website's passwords.** The old website kept its
      passwords written inside its files. Change the password of the Gmail
      account it used, delete the old database user in cPanel >
      **MySQL Databases**, and delete the old website's folder once the new
      site works.
- [ ] **Delete old database backups** (files ending in `.sql`, for example in a
      `db_backup` folder) from the server and from any shared drives. They hold
      job applicants' personal details.
- [ ] **Protect your cPanel login:** use a long password that you use nowhere
      else, and turn on cPanel > **Two-Factor Authentication**.
- [ ] **Remove FTP accounts you don't use:** cPanel > **FTP Accounts**.
- [ ] **Stop fake emails from your domain:** cPanel > **Email Deliverability**.
      If it shows a problem next to your domain, click **Repair** for SPF and
      DKIM. Ask your hosting company to add a DMARC record too. This stops
      criminals sending emails that look like they come from you.

## 2. Put Cloudflare in front (free, about 1 hour)

Cloudflare sits between visitors and your hosting. It blocks attacks and bad
bots before they reach the website. You may want your IT person for this part.

1. Create a free account at cloudflare.com, add your domain, and change the
   nameservers where you bought the domain (Cloudflare shows you how).
2. In Cloudflare, **SSL/TLS** > choose **Full (strict)**, and turn on
   **Always Use HTTPS**.
3. **Security > WAF > Managed rules:** turn on the free rules.
4. **Security > WAF > Rate limiting rules:** add one rule: if the address
   starts with `/digibe/login` or equals `/api/leads/`, and one visitor makes
   more than 10 requests in a minute, **Block** them for 10 minutes.
5. In cPanel File Manager, edit `digiinn360-website/.env` and remove the `#`
   from the start of the three Cloudflare lines near the end. Save, then click
   **Restart** in **Setup Python App**. (Without this the website cannot see
   visitors' real addresses behind Cloudflare.)
6. If the site is ever under heavy attack: Cloudflare **Overview** >
   **Under Attack Mode**. Turn it off again afterwards.

## 3. Ask your hosting company (one email)

Send them these two questions:

- [ ] "Is **ModSecurity with the OWASP rules** (or **Imunify360**) turned on for
      our account? If not, please turn it on."
- [ ] "Do you keep **daily backups** away from the server, and for how long?"

## 4. Once a month (about 15 minutes)

- [ ] Admin panel > **Security**: look at failed logins and lockouts. Anything
      you don't recognise? Tell your developer.
- [ ] Admin panel > **Users**: remove people who have left. Everyone should
      have their own account. Only one or two people should be *superusers*.
- [ ] cPanel > **Backup**: download a backup and keep a copy off the server.
      Once a year, ask your host to test restoring it.
- [ ] Ask your developer to check for updates and send a new zip if needed.
- [ ] Optional: a free uptime monitor (for example UptimeRobot) on
      `https://yourdomain.com/api/health/`, so you hear first if the site is down.
- [ ] Before **24 November 2027**: ask your developer for a new zip. (A
      security contact file on the website has an end date.)

Security alert emails (for example when an account is locked out) go to the
superusers' email addresses, once email alerts are set up (see START-HERE).

## Extra protection you can switch on

Edit `digiinn360-website/.env` in File Manager, then **Restart** the app.

| Add this line to `.env` | What it does |
|---|---|
| `ADMIN_ALLOWED_IPS=203.0.113.10` | Only your office internet address can open the admin panel. Everyone else gets "not found". Ask your IT person for the address |
| `POW_MAX_NUMBER=200000` | Makes the anti-spam check 4 times harder during a spam wave. Slow phones wait a little longer |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS=true` | Only if **every** subdomain (mail, webmail, cpanel…) already works with https:// |

You can also pause all forms from the admin panel: **Website settings** >
untick *Accept submissions*.

---

## Already built into the website

For your IT person. Mapped to the OWASP Top 10 (2025):

- **Access control:** the admin needs a password **and** a phone code (backup
  codes for lost phones). Staff can't make themselves superusers. Optional
  office-only access. The admin address is not linked anywhere.
- **Brute force and bots:** lockout after 5 wrong passwords (30 minutes);
  self-hosted proof-of-work CAPTCHA (ALTCHA) on the admin login and on every
  form, with no Google or third-party tracking; hidden trap field; minimum
  fill time; per-address limits (5 per 10 minutes, 20 per day); link-spam
  detection.
- **Configuration:** debug off; secrets only in `.env` (readable by the
  account owner only); HTTPS forced with HSTS; secure, HttpOnly, SameSite
  cookies with the `__Host-` prefix; strict Content-Security-Policy with
  hashed inline scripts; clickjacking, MIME-sniffing and permission headers;
  no file uploads at all.
- **Supply chain:** every Python package pinned to an exact version and
  checksum (`requirements.txt` with hashes); no known vulnerabilities at
  release (pip-audit, npm audit).
- **Injection and XSS:** Django ORM only (no raw SQL); all output escaped;
  control and invisible characters stripped from input; CSV export neutralises
  spreadsheet formulas; email headers cannot be injected.
- **Logging and alerts:** a record of every admin change, failed-login and
  sign-in history, `logs/security.log`, and alert emails for lockouts and
  two-step login resets.
- **Errors:** plain error pages that reveal nothing; oversized or malformed
  requests are rejected.
- **Vulnerability reports:** `/.well-known/security.txt` asks researchers to
  write to procurement@digiinn360.com.
