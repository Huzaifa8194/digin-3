# Digiinn360 website: installation on cPanel

For a one-page version, see START-HERE.md.

This package contains the complete website (already built) and its small admin
system. It installs the same way as the previous Digiinn360 site: **cPanel →
Setup Python App** with a **MySQL database**. No Node.js or build step is needed.

Time needed: about 20 minutes.

---

## Before you start

- cPanel with **Setup Python App** (Python **3.10 or newer**) and **MySQL Databases**.
- HTTPS for the domain. In cPanel open **SSL/TLS Status** and make sure the domain
  has a certificate (AutoSSL). The site redirects all visitors to HTTPS.
- A phone with an authenticator app (Google Authenticator, Microsoft
  Authenticator, 1Password or Authy) for the admin login.
- **Back up the old site first:** cPanel → **Backup** → download a Home Directory
  and MySQL backup.

---

## Step 1: Create the database

cPanel → **MySQL Database Wizard**

1. Database name: `site` (cPanel shows the full name, e.g. `cpuser_site`).
2. Create a user with a strong password (use the password generator).
3. Tick **ALL PRIVILEGES** and finish.

Write down the **full** database name, user name and password.

## Step 2: Upload the files

cPanel → **File Manager**

1. Open your **home folder** (the one that contains `public_html`, not inside it).
2. **Upload** `digiinn360-website.zip`, then right-click it → **Extract**.
   You now have the folder `digiinn360-website`.
3. Open `public_html`. If old website files are there (for example an old
   `index.html` or a `static` folder), move them into a new folder such as
   `old-site-backup` outside `public_html`. Keep `.htaccess`, `.well-known`
   and `cgi-bin`.

## Step 3: Create the Python app

cPanel → **Setup Python App** → **Create Application**

| Field | Value |
|---|---|
| Python version | the newest offered (3.10 or higher) |
| Application root | `digiinn360-website` |
| Application URL | your domain (leave the path empty) |
| Application startup file | `passenger_wsgi.py` |
| Application Entry point | `application` |

Click **Create**.

> The old site is still set up as a Python app on the same domain? Click its
> trash icon on this page first (this removes the app setting, not the files),
> then create the new one.

On the app's page, under **Configuration files**, type `requirements.txt`,
click **Add**, then **Run Pip Install**. Wait until it finishes.

## Step 4: Run the installer

At the top of the app's page cPanel shows a command like
`source /home/USER/virtualenv/digiinn360-website/3.11/bin/activate && cd /home/USER/digiinn360-website`.
Copy it.

Open cPanel → **Terminal**, paste the command, press Enter, then run:

```
python install.py
```

It asks for your domain and the database details from Step 1, creates the
tables and asks you to create the first admin account (username, email,
password of at least 12 characters). It is safe to run again at any time.

<details>
<summary>No Terminal in your cPanel?</summary>

1. In File Manager open `digiinn360-website`, copy `.env.example` to `.env`
   (enable **Settings → Show Hidden Files**) and fill in `SITE_DOMAIN`,
   `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Optionally set `ADMIN_USERNAME=` and
   `ADMIN_EMAIL=` lines.
2. On the Setup Python App page, in **Execute python script**, enter
   `install.py` and click **Run Script**.
3. A file `FIRST-ADMIN-PASSWORD.txt` appears in the app folder with a one-time
   admin password. Log in, change the password (account menu, top right), then
   delete that file.
</details>

## Step 5: Restart and check

1. On the Setup Python App page click **Restart**.
2. Open `https://yourdomain/`: the website should load.
3. Open `https://yourdomain/digibe/` and log in. The first time, scan the QR
   code with your authenticator app, type the 6-digit code, and **save the 10
   backup codes** shown (password manager or print).
4. Send a test inquiry from the Contact page. It appears under **Leads** in the
   admin.

---

## Email alerts for new inquiries (recommended)

1. cPanel → **Email Accounts** → create `no-reply@yourdomain`.
   Click **Connect Devices** to see its outgoing server and port.
2. Edit `digiinn360-website/.env` and fill in:
   ```
   EMAIL_HOST=mail.yourdomain.com
   EMAIL_PORT=465
   EMAIL_HOST_USER=no-reply@yourdomain.com
   EMAIL_HOST_PASSWORD=the mailbox password
   DEFAULT_FROM_EMAIL=Digiinn360 Website <no-reply@yourdomain.com>
   ```
3. Restart the app. Who receives alerts can be changed in the admin under
   **Website settings**.

## Using the admin (`/digibe/`)

- **Leads**: every inquiry and demo request. Set status, assign a person, keep
  notes, export to CSV.
- **Website settings**: alert recipients, and a switch to pause the forms during
  a spam wave (visitors are then offered email instead).
- **Team & access → Users**: add colleagues. Tick *Staff status* and give only
  the permissions they need. Each person sets up their own authenticator on
  first login.
- **Security**: audit trail of admin changes, failed logins, lockouts.

Security built in: passwords plus authenticator codes, lockout after 5 wrong
passwords (30 minutes), an invisible anti-bot check (CAPTCHA) on the login and
the forms, HTTPS-only secure cookies, rate limits, strict browser security
headers, and alert emails for lockouts.

**Next, work through [SECURITY.md](SECURITY.md)** (in the same folder): the
hosting-side steps such as Cloudflare, cPanel 2FA and backups.

## Updating the website later

1. In File Manager, open `digiinn360-website` and **delete its `site` folder**
   (the old copy of the website; pages that were removed must not linger).
   Then upload the new `digiinn360-website.zip` to the home folder and extract
   it over the old folder (overwrite). Your `.env` is not in the zip, so your
   settings stay.
2. Run `python install.py` again in Terminal (Step 4), then **Restart**.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Bad Request (400)" | The domain is missing in `.env` → `DJANGO_ALLOWED_HOSTS`. Add it (comma separated), restart. |
| Error page / site not starting | Read `digiinn360-website/logs/app.log` and `stderr.log` in the app folder. |
| "Too many redirects" | Make sure the domain has an SSL certificate. If the domain goes through Cloudflare, uncomment the three Cloudflare lines at the end of `.env` and restart. |
| "Cannot connect to MySQL" | Check `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `.env` (full names with the cPanel prefix) and that the user was added to the database. |
| Old website still shows | Old files are still in `public_html` (Step 2.3), or the browser cached it: refresh with Ctrl+F5. |
| Admin locked after wrong passwords | Wait 30 minutes, or in Terminal: `python manage.py axes_reset` |
| Lost the phone with the authenticator | Log in with a backup code. No codes left: another admin uses **Users → Reset two-step login**, or in Terminal: `python manage.py reset_2fa USERNAME` |
| Forgot admin password | In Terminal: `python manage.py changepassword USERNAME` |

**Keep private:** the `.env` file holds the database password and secret key.
Never share it or copy it into `public_html`.
