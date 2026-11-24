# Digiinn360 website on cPanel: quick guide

## How it works

- The zip contains the **whole website** and a small **admin panel**.
- On cPanel it runs as a **Python app**, the same way the old site did.
- A **MySQL database** keeps the messages people send from the website.
- Visitors see the site at **yourdomain.com**. Your team reads messages at
  **yourdomain.com/digibe/**.

## You need

- Your cPanel login
- HTTPS on the domain (cPanel → **SSL/TLS Status** shows a certificate)
- A phone with an authenticator app (Google or Microsoft Authenticator)

## Install (one time, about 20 minutes)

1. **Back up the old site.** cPanel → **Backup** → download a full backup.

2. **Create the database.** cPanel → **MySQL Database Wizard**.
   Make a database and a user, tick **ALL PRIVILEGES**.
   Write down the database name, user name and password.

3. **Upload the website.** cPanel → **File Manager** → open your home folder
   (the one that *contains* `public_html`) → **Upload** the zip →
   right-click → **Extract**.
   If `public_html` has old website files, move them to a backup folder
   (keep `.htaccess`, `.well-known` and `cgi-bin`).

4. **Create the Python app.** cPanel → **Setup Python App** → **Create Application**:

   | Field | Enter |
   |---|---|
   | Python version | the newest one (3.10 or higher) |
   | Application root | `digiinn360-website` |
   | Application URL | your domain |
   | Startup file | `passenger_wsgi.py` |
   | Entry point | `application` |

   Click **Create**. Then under *Configuration files* add `requirements.txt`
   and click **Run Pip Install**.
   *(If the old site is still listed as a Python app for this domain, delete
   that entry first. Its files are not deleted.)*

5. **Run the installer.** At the top of the app page, copy the command that
   starts with `source`. Open cPanel → **Terminal**, paste it, press Enter, then type:

   ```
   python install.py
   ```

   Answer the questions: your domain, the database details from step 2, and a
   username and password for the admin.

6. **Restart.** Back on **Setup Python App**, click **Restart**.

7. **Check it.**
   - Open your domain: the website appears.
   - Open `yourdomain.com/digibe/`, log in, scan the QR code with your phone,
     enter the 6-digit code, and **save the backup codes**.
   - Send a test message from the Contact page. It shows up under **Leads**.

No Terminal in your cPanel? See *INSTALL.md*, section "No Terminal".

## Daily use

| You want to… | Go to |
|---|---|
| Read messages and partner applications | Admin → **Leads** (filter by type) |
| Choose who gets email alerts | Admin → **Website settings** |
| Stop the forms (spam wave) | Admin → **Website settings** → untick *Accept submissions* |
| Add a colleague | Admin → **Users** (they set up their phone on first login) |
| See failed logins | Admin → **Security** |

## Updating the website later

Delete the `site` folder inside `digiinn360-website` (the old copy of the
pages), upload the new zip, extract it over the old folder, run
`python install.py` in Terminal again, and click **Restart**. Your settings stay.

## If something goes wrong

| Problem | Fix |
|---|---|
| Old website still shows | Old files are still in `public_html`, or press Ctrl+F5 |
| "Bad Request (400)" | In File Manager open `digiinn360-website/.env` and add your domain to the `DJANGO_ALLOWED_HOSTS=` line (comma separated), then **Restart** |
| Locked out after wrong passwords | Wait 30 minutes |
| Lost your phone | Use a backup code, or ask another admin to reset your two-step login |

More detail: **INSTALL.md**. Security steps for the hosting (Cloudflare,
backups, cPanel 2FA): **SECURITY.md**.
