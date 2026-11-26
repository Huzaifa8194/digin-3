# Digiinn360 website: install on cPanel

This zip holds the whole Digiinn360 website, already built, plus a small admin
panel for the messages people send. It installs like the previous site:
cPanel **Setup Python App** with a **MySQL database**. No coding, no build step.

Time needed: about 20 minutes. You only ever edit one file (`.env`), and only
if a step below tells you to.

---

## Before you start

- Your cPanel login, with **Setup Python App** and **MySQL Databases** in it.
- HTTPS on the domain: cPanel > **SSL/TLS Status** shows a valid certificate.
  The site sends every visitor to HTTPS, so this must work first.
- A phone with an authenticator app (Google Authenticator, Microsoft
  Authenticator, Authy or 1Password) for logging in to the admin.

---

## Install

**1. Back up the old site**

cPanel > **Backup** > download a full backup. Keep it until the new site is live.

**2. Create the database**

cPanel > **MySQL Database Wizard**:
1. Give the database a name, for example `site`.
2. Create a user with a strong password (use the generator).
3. Tick **ALL PRIVILEGES** and finish.

Write down the **full** names cPanel shows (they start with your account name,
for example `cpuser_site`) and the password.

**3. Upload the website**

cPanel > **File Manager**:
1. Open your **home folder**: the one that *contains* `public_html`.
2. **Upload** `digiinn360-website.zip`, then right-click it > **Extract**.
   A folder called `digiinn360-website` appears.
3. Open `public_html`. If it has old website files (for example `index.html`
   or a `static` folder), move them to a new folder outside `public_html`,
   such as `old-site-backup`. Leave `.htaccess`, `.well-known` and `cgi-bin`.

**4. Create the Python app**

cPanel > **Setup Python App**. If the old site is listed there for this
domain, delete that entry first (its files are kept). Then **Create Application**:

| Field | Enter |
|---|---|
| Python version | 3.12 if offered, otherwise the newest 3.10 or higher |
| Application root | `digiinn360-website` |
| Application URL | your domain (leave the path empty) |
| Application startup file | `passenger_wsgi.py` |
| Application Entry point | `application` |

Click **Create**. On the app's page, under **Configuration files**, type
`requirements.txt`, click **Add**, then **Run Pip Install**. Wait for it to finish.

**5. Run the installer**

At the top of the app's page there is a command starting with `source` (it
ends with `cd /home/.../digiinn360-website`). Copy it.

Open cPanel > **Terminal**, paste the command, press Enter, then type:

```
python install.py
```

It asks for your domain and the three database details from step 2, sets up
the database, and asks you to create the first admin account (username,
email, and a password of at least 12 characters).

No Terminal in your cPanel? See "If your cPanel has no Terminal" below.

**6. Restart**

Back on **Setup Python App**, click **Restart** on the app.

**7. Check it works**

1. Open your domain: the new website appears.
2. Open `yourdomain.com/digibe/` and log in. The first time, scan the QR code
   with your phone's authenticator app, type the 6-digit code, and **save the
   10 backup codes** it shows (password manager or print them).
3. Send a test message from the Contact page. It appears in the admin under **Leads**.

Done. Next, work through **SECURITY.md** (cPanel two-factor login, backups, Cloudflare).

---

## If your cPanel has no Terminal

1. In File Manager, open `digiinn360-website` and turn on
   **Settings > Show Hidden Files**.
2. Copy `.env.example` to a new file named `.env`, then edit `.env` and fill
   in `SITE_DOMAIN`, `DB_NAME`, `DB_USER` and `DB_PASSWORD`.
   You can also add the lines `ADMIN_USERNAME=yourname` and `ADMIN_EMAIL=you@yourdomain.com`.
3. On the **Setup Python App** page, under **Execute python script**, enter
   `install.py` and click **Run Script**.
4. A file `FIRST-ADMIN-PASSWORD.txt` appears in `digiinn360-website` with a
   one-time admin password. Log in, change it (account menu, top right), then
   delete that file. Continue with step 6 above.

---

## Email alerts for new messages (recommended, 5 minutes)

1. cPanel > **Email Accounts** > create a mailbox such as `no-reply@yourdomain.com`.
   Its **Connect Devices** page shows the outgoing server and port.
2. Open `digiinn360-website/.env` in File Manager and fill in:
   ```
   EMAIL_HOST=mail.yourdomain.com
   EMAIL_PORT=465
   EMAIL_HOST_USER=no-reply@yourdomain.com
   EMAIL_HOST_PASSWORD=the mailbox password
   DEFAULT_FROM_EMAIL=Digiinn360 Website <no-reply@yourdomain.com>
   ```
3. **Restart** the app. Change who receives the alerts in the admin under
   **Website settings** (info@digiinn360.com by default).

---

## Using the admin (`yourdomain.com/digibe/`)

| You want to… | Go to |
|---|---|
| Read project inquiries, demo requests and partner applications | **Leads** (filter by type, status or date; export to CSV) |
| Choose who gets email alerts | **Website settings** |
| Pause the forms during a spam wave | **Website settings** > untick *Accept submissions* (visitors are offered email instead) |
| Add a colleague | **Users** > add user, tick *Staff status*, give only the permissions they need. They set up their own phone at first login |
| See failed logins, lockouts and every admin change | **Security** |

---

## Updating the website later

1. In File Manager, open `digiinn360-website` and **delete the `site` folder**
   inside it (the old copy of the pages, so removed pages stop showing).
2. Upload the new `digiinn360-website.zip` to your home folder and **Extract**
   it, allowing it to overwrite. Your `.env` is not in the zip, so your settings stay.
3. In Terminal, paste the `source` command from step 5, then run `python install.py`.
4. **Restart** the app.

---

## If something goes wrong

Commands below are typed in cPanel > **Terminal**, after pasting the `source`
command from step 5.

| Problem | Fix |
|---|---|
| The old website still shows | Old files are still in `public_html` (step 3.3), or your browser kept the old page: press Ctrl+F5 |
| "Bad Request (400)" | In `.env`, add your domain to the `DJANGO_ALLOWED_HOSTS=` line (comma separated, with and without `www.`), then **Restart** |
| "Too many redirects" | The domain needs a working SSL certificate. If it goes through Cloudflare, uncomment the three Cloudflare lines at the end of `.env`, then **Restart** |
| The installer says it cannot connect to MySQL | Check `DB_NAME`, `DB_USER` and `DB_PASSWORD` in `.env` (the full names with your account prefix) and that the user was added to the database with all privileges |
| Error page, or the site does not start | Look in `digiinn360-website/logs/app.log` and `stderr.log` |
| Locked out after wrong passwords | Wait 30 minutes, or run `python manage.py axes_reset` |
| Lost the phone with the authenticator | Log in with a backup code. None left: another admin uses **Users > Reset two-step login**, or run `python manage.py reset_2fa USERNAME` |
| Forgot the admin password | Run `python manage.py changepassword USERNAME` |

---

**Keep private:** `.env` holds the database password and the site's secret key.
Never share it, email it, or copy it into `public_html`.
