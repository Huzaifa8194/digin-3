# Put the Digiinn360 website online

A step-by-step guide for cPanel hosting. No coding needed.

This zip holds the whole Digiinn360 website:

- **the website** that visitors see (all the pages), and
- **the admin panel** where your team reads the messages sent from the
  website's forms.

They are one app, and you install them together, once. Nothing needs to be
built or compiled. During the install you also create the **main admin
account** (called the *superuser*), the account you will use to log in.

It takes about 20 minutes. Follow the steps in order.

---

## What you need

- [ ] Your **cPanel** login (your hosting company sent it to you).
- [ ] The file **digiinn360-website.zip**.
- [ ] A phone with an **authenticator app**: Google Authenticator, Microsoft
      Authenticator, Authy or 1Password. The admin panel asks for a code from it
      every time you log in.
- [ ] Your website must already open with **https://** (a padlock in the
      browser). To check: cPanel > **SSL/TLS Status**. Your domain should show a
      green padlock. If not, click **Run AutoSSL** and wait a few minutes.

## Words used in this guide

| Word | What it means |
|---|---|
| cPanel | The control panel of your web hosting. You open it in your browser. |
| File Manager | The part of cPanel where you upload and open files. |
| Terminal | The part of cPanel where you type a command. You only need it in Step 5. |
| Python app | The part of cPanel that runs this website. |
| Database | Where the website keeps the messages people send and the admin accounts. |
| `.env` | A small settings file the installer creates. It holds passwords. Keep it private. |
| Superuser | The main admin account, with full access to the admin panel. |

---

## Part 1: Prepare

### Step 1. Back up the old website

In cPanel, open **Backup** and click **Download a Full Account Backup**. Keep
the file until the new website works. If anything goes wrong, your host can
put the old site back from it.

### Step 2. Create the database

In cPanel, open **MySQL Database Wizard**.

1. **New Database:** type `site` and click **Next Step**.
2. **Username:** type `site`. Click **Password Generator**, copy the password
   it shows, tick the box saying you copied it, and click **Use Password**.
   Then click **Create User**.
3. Tick **ALL PRIVILEGES** and click **Next Step**.

Now write down these three things. You need them in Step 5:

| What | Example |
|---|---|
| Database name | `cpuser_site` |
| Database user | `cpuser_site` |
| Password | the one you copied |

> **Note:** cPanel puts your account name and an underscore in front of the
> names, so `site` becomes something like `cpuser_site`. Always use the full
> name that cPanel shows you.

---

## Part 2: Upload the website

### Step 3. Upload and extract the zip

In cPanel, open **File Manager**.

1. You start in your **home folder**: the one that *contains* the
   `public_html` folder. Stay here. Do not open `public_html`.
2. Click **Upload** at the top, choose `digiinn360-website.zip`, and wait until
   it shows 100%. Then go back to File Manager.
3. Right-click `digiinn360-website.zip`, choose **Extract**, then
   **Extract Files**. A new folder called `digiinn360-website` appears.
4. Open the `public_html` folder. If it has files from the old website (for
   example `index.html`, `static` or `media`), select them, choose **Move**, and
   move them to a new folder such as `/old-site-backup`. Leave `.htaccess`,
   `.well-known` and `cgi-bin` where they are.

---

## Part 3: Turn it on

### Step 4. Create the Python app

In cPanel, open **Setup Python App**.

If the old website is listed there with your domain, click its bin icon to
delete that entry. (This only removes the entry. The old files stay.)

Click **Create Application** and fill in:

| Field | What to enter |
|---|---|
| Python version | **3.12** if it is in the list. Otherwise the highest number, at least 3.10 |
| Application root | `digiinn360-website` |
| Application URL | choose your domain, and leave the box after it empty |
| Application startup file | `passenger_wsgi.py` |
| Application Entry point | `application` |

Click **Create** and wait.

Then, on the same page, scroll down to **Configuration files**. Type
`requirements.txt` in the box, click **Add**, then click **Run Pip Install**.
This installs what the website needs and takes a minute or two. Wait until it
says it has finished.

### Step 5. Run the installer and create your admin account

**a.** At the top of the Python app page there is a line that starts with
`source` and ends with `cd /home/.../digiinn360-website`. Click it to copy it.

**b.** Go back to the cPanel home page and open **Terminal**. (If it shows a
warning, click **I understand and want to proceed**.)

**c.** Paste the line (right-click > **Paste**, or Ctrl+Shift+V) and press **Enter**.

**d.** Type this and press **Enter**:

```
python install.py
```

The installer asks you some questions. Type each answer and press **Enter**:

| It asks | You type |
|---|---|
| Website domain | your domain, for example `digiinn360.com` (without https://) |
| MySQL database name | the database name from Step 2 |
| MySQL user name | the database user from Step 2 |
| MySQL password | the password from Step 2 |
| Username | a name for your admin account, for example `ali` |
| Email address | your work email |
| Password | a password for the admin account, at least 12 characters |
| Password (again) | the same password again |

> **Note:** when you type a password, **nothing appears on the screen**. That
> is normal. Type it (or paste it with right-click) and press Enter.

The last four questions create your **superuser** (main admin account). Keep
its username and password somewhere safe, such as a password manager.

When it finishes you see **Done.** and the address of your admin panel.

> **Tip:** if a line says **ERROR**, read the sentence after it. Most often a
> database detail was typed wrong. See "If something goes wrong" at the end.

Your cPanel has no **Terminal**? Skip this step and use
"If your cPanel has no Terminal" further down instead.

### Step 6. Restart the app

Go back to **Setup Python App** and click **Restart** next to your app.

---

## Part 4: Check that everything works

### Step 7. Test the website and the admin panel

1. **The website:** open your domain in the browser. The new Digiinn360
   website appears.
2. **The admin panel:** open `yourdomain.com/digibe/` (with your own domain in
   front). Log in with the username and password from Step 5.
3. **The first time only**, it shows a QR code:
   - Open your authenticator app, tap **+** (add), and scan the QR code.
   - Type the 6-digit code the app shows and confirm.
   - It then shows **10 backup codes**. Print them or save them in a password
     manager. Each one lets you log in once if you lose your phone.
4. **The forms:** on the website, open **Contact** and send a test message.
   In the admin panel, click **Leads**. Your message is there.

**You are done. The website is live.**

Next, please go through **SECURITY.md** (or SECURITY.pdf). It lists a few
settings to switch on, such as two-step login for cPanel itself and backups.

---

## If your cPanel has no Terminal

Use this instead of Step 5.

1. In **File Manager**, open the `digiinn360-website` folder. Click
   **Settings** (top right), tick **Show Hidden Files**, and click **Save**.
2. Right-click `.env.example`, choose **Copy**, and copy it to
   `/digiinn360-website/.env` (same folder, new name `.env`).
3. Right-click the new `.env` file and choose **Edit**. Fill in these four
   lines after the `=` sign, with no spaces:
   ```
   SITE_DOMAIN=yourdomain.com
   DB_NAME=cpuser_site
   DB_USER=cpuser_site
   DB_PASSWORD=the password from Step 2
   ```
   For your admin account, add these two lines at the end:
   ```
   ADMIN_USERNAME=ali
   ADMIN_EMAIL=you@yourdomain.com
   ```
   Click **Save Changes**.
4. Go to **Setup Python App** and open your app. Under **Execute python
   script**, type `install.py` and click **Run Script**.
5. Back in File Manager, click **Reload**. A file called
   `FIRST-ADMIN-PASSWORD.txt` is now in the `digiinn360-website` folder. Open
   it: it has your superuser name and a one-time password.
6. Do Step 6 (Restart) and Step 7. After you log in, change the password (your
   name, top right > **Change password**), then delete `FIRST-ADMIN-PASSWORD.txt`.

---

## Email alerts for new messages (recommended)

The website can email you each time someone sends a message. Alerts go to
**procurement@digiinn360.com** unless you change it. To turn them on:

1. In cPanel, open **Email Accounts** and create a mailbox, for example
   `no-reply@yourdomain.com`. Click **Connect Devices** next to it and note the
   **Outgoing Server** name and **SMTP Port** (usually 465).
2. In File Manager, open `digiinn360-website`, right-click `.env`, choose
   **Edit**, and fill in these lines:
   ```
   EMAIL_HOST=mail.yourdomain.com
   EMAIL_PORT=465
   EMAIL_HOST_USER=no-reply@yourdomain.com
   EMAIL_HOST_PASSWORD=the mailbox password
   DEFAULT_FROM_EMAIL=Digiinn360 Website <no-reply@yourdomain.com>
   ```
   Click **Save Changes**.
3. **Restart** the Python app.

To change who receives the alerts, go to the admin panel > **Website settings**.

---

## Using the admin panel

Address: `yourdomain.com/digibe/`

| To do this | Go to |
|---|---|
| Read project inquiries, demo requests and partner applications | **Leads**. Filter by type, status or date, or export to a spreadsheet (CSV) |
| Choose who gets the email alerts | **Website settings** |
| Pause the forms during a spam wave | **Website settings** > untick *Accept submissions*. Visitors are shown your email address instead |
| Add a colleague | **Users** > **Add user**. Tick *Staff status* and give only the permissions they need. They set up their own phone the first time they log in |
| Add another full admin (superuser) | **Users** > **Add user**, then tick *Staff status* and *Superuser status*. Keep this to one or two people |
| See failed logins and every change made in the admin | **Security** |

---

## Updating the website later

When you receive a new `digiinn360-website.zip`:

1. In **File Manager**, open `digiinn360-website` and delete the folder called
   `site` inside it. (It holds the old pages. Deleting it makes sure removed
   pages disappear.)
2. Go back to your home folder, upload the new zip, right-click it >
   **Extract**, and allow it to overwrite files. Your settings and admin
   accounts are kept.
3. In **Terminal**, paste the `source` line again (Step 5 a to c) and run
   `python install.py`. It asks no questions this time.
4. **Restart** the Python app.

---

## If something goes wrong

Some fixes need a command. Type it in **Terminal**, after pasting the `source`
line first (Step 5 a to c).

| Problem | What to do |
|---|---|
| The old website still shows | Old files are still in `public_html` (Step 3, point 4). Or your browser remembers the old page: press Ctrl+F5 |
| "Bad Request (400)" | Open `.env` and add your domain to the `DJANGO_ALLOWED_HOSTS=` line, with and without `www.`, separated by a comma. Then **Restart** |
| "Too many redirects" | The domain needs a working SSL certificate (see "What you need"). If you use Cloudflare, remove the `#` from the three Cloudflare lines at the end of `.env`, then **Restart** |
| The installer says it cannot connect to MySQL | A database detail is wrong. Open `.env` and check `DB_NAME`, `DB_USER` and `DB_PASSWORD` (full names, with your account name in front). In **MySQL Databases**, check the user is added to the database with all privileges. Then run the installer again |
| An error page, or the site does not start | Click **Restart**. If it is still broken, send the files `logs/app.log` and `stderr.log` (in `digiinn360-website`) to your developer |
| Locked out after wrong passwords | Wait 30 minutes. Or run `python manage.py axes_reset` |
| Lost the phone with the authenticator app | Log in with one of your backup codes. No codes left? Another admin opens **Users**, ticks your name and chooses **Reset two-step login**. Or run `python manage.py reset_2fa USERNAME` |
| Forgot the admin password | Run `python manage.py changepassword USERNAME` |
| Need another superuser from Terminal | Run `python manage.py createsuperuser` |

---

**Keep private:** the `.env` file holds the database password and the
website's secret key. Never share it, email it, or put it in `public_html`.
