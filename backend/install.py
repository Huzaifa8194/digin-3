#!/usr/bin/env python
"""One-step setup / update for the Digiinn360 website.

Run it from the application folder after installing the requirements:

    python install.py

It is safe to run again after every update. It will:
  1. create .env from .env.example if it does not exist yet,
  2. fill in a random secret key the first time,
  3. ask for any missing values (domain, database) when run in a terminal,
  4. create / update the database tables,
  5. collect the admin panel's static files,
  6. offer to create the first admin account,
  7. run Django's production security check.
"""
from __future__ import annotations

import os
import re
import secrets
import shutil
import string
import sys
from getpass import getpass
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"
EXAMPLE = ROOT / ".env.example"
INTERACTIVE = sys.stdin is not None and sys.stdin.isatty()


def say(text: str = "") -> None:
    print(text, flush=True)


def read_env() -> dict[str, str]:
    values: dict[str, str] = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, _, value = line.partition("=")
                values[key.strip()] = value.strip()
    return values


def set_env(key: str, value: str) -> None:
    text = ENV_FILE.read_text(encoding="utf-8") if ENV_FILE.exists() else ""
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    line = f"{key}={value}"
    if pattern.search(text):
        text = pattern.sub(lambda _m: line, text, count=1)
    else:
        text = text.rstrip("\n") + "\n" + line + "\n"
    ENV_FILE.write_text(text, encoding="utf-8")


def ask(label: str, secret: bool = False) -> str:
    while True:
        value = (getpass if secret else input)(f"  {label}: ").strip()
        if value:
            return value


def step_env() -> None:
    say("[1/6] Settings file (.env)")
    if not ENV_FILE.exists():
        shutil.copyfile(EXAMPLE, ENV_FILE)
        say("      created .env from .env.example")
    try:
        os.chmod(ENV_FILE, 0o600)  # only the account owner can read it
    except OSError:
        pass

    values = read_env()
    if len(values.get("DJANGO_SECRET_KEY", "")) < 50:
        alphabet = string.ascii_letters + string.digits + "!@%^*-_+="
        set_env("DJANGO_SECRET_KEY", "".join(secrets.choice(alphabet) for _ in range(64)))
        say("      generated a new secret key")

    values = read_env()
    missing = [k for k in ("SITE_DOMAIN", "DB_NAME", "DB_USER", "DB_PASSWORD") if not values.get(k)]
    if missing and INTERACTIVE:
        say("      a few details are needed (they are saved in .env):")
        if "SITE_DOMAIN" in missing:
            set_env("SITE_DOMAIN", ask("Website domain, e.g. digiinn360.com").removeprefix("https://").removeprefix("http://").strip("/"))
        if "DB_NAME" in missing:
            set_env("DB_NAME", ask("MySQL database name (from cPanel, e.g. cpuser_site)"))
        if "DB_USER" in missing:
            set_env("DB_USER", ask("MySQL user name"))
        if "DB_PASSWORD" in missing:
            set_env("DB_PASSWORD", ask("MySQL password", secret=True))
    elif missing:
        say("      ERROR: please fill these in .env first: " + ", ".join(missing))
        sys.exit(1)

    values = read_env()
    domain = values["SITE_DOMAIN"].lower()
    bare = domain.removeprefix("www.")
    if not values.get("DJANGO_ALLOWED_HOSTS"):
        set_env("DJANGO_ALLOWED_HOSTS", f"{bare},www.{bare}")
    if not values.get("DJANGO_CSRF_TRUSTED_ORIGINS"):
        set_env("DJANGO_CSRF_TRUSTED_ORIGINS", f"https://{bare},https://www.{bare}")
    if not values.get("SITE_URL"):
        set_env("SITE_URL", f"https://{domain}")
    say("      ok")


def django_setup():
    sys.path.insert(0, str(ROOT))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django

    django.setup()
    from django.core.management import call_command

    return call_command


def step_admin(call_command) -> None:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    say("[5/6] Admin account")
    if User.objects.filter(is_superuser=True).exists():
        say("      an admin account already exists, skipping")
        return
    if INTERACTIVE:
        say("      create the first admin account (password: at least 12 characters)")
        call_command("createsuperuser")
        return
    username = os.environ.get("ADMIN_USERNAME") or read_env().get("ADMIN_USERNAME") or "admin"
    email = os.environ.get("ADMIN_EMAIL") or read_env().get("ADMIN_EMAIL") or ""
    password = secrets.token_urlsafe(18)
    User.objects.create_superuser(username=username, email=email, password=password)
    note = ROOT / "FIRST-ADMIN-PASSWORD.txt"
    note.write_text(
        f"Admin username: {username}\nOne-time password: {password}\n\n"
        "Log in, set up two-step login, change this password (account menu, top right),\n"
        "then DELETE this file.\n",
        encoding="utf-8",
    )
    try:
        os.chmod(note, 0o600)
    except OSError:
        pass
    say(f"      created admin user '{username}'. Its one-time password is in {note.name}")
    say("      (in the app folder). Log in, change the password, then delete that file.")


def lock_down_folders() -> None:
    """Private folders: only the hosting account may read them."""
    for folder in ("logs", "var", "var/cache"):
        path = ROOT / folder
        path.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(path, 0o700)
        except OSError:
            pass


def main() -> None:
    say("Digiinn360 website setup\n")
    step_env()
    call_command = django_setup()
    lock_down_folders()
    say("[2/6] Checking the database connection")
    from django.db import connection

    try:
        connection.ensure_connection()
    except Exception as exc:  # noqa: BLE001
        say(f"      ERROR: cannot connect to MySQL: {exc}")
        say("      Check DB_NAME / DB_USER / DB_PASSWORD in .env and that the user is added to the database in cPanel.")
        sys.exit(1)
    say("      ok")
    say("[3/6] Creating / updating database tables")
    call_command("migrate", interactive=False, verbosity=1)
    from leads.models import SiteSettings

    SiteSettings.load()
    say("[4/6] Collecting admin static files")
    call_command("collectstatic", interactive=False, verbosity=0, clear=True)
    say("      ok")
    step_admin(call_command)
    say("[6/6] Security self-check")
    try:
        call_command("check", deploy=True, fail_level="ERROR")
        say("      ok")
    except SystemExit:
        say("      the check above reported problems; please review them")
    (ROOT / "tmp").mkdir(exist_ok=True)
    (ROOT / "tmp" / "restart.txt").touch()
    from django.conf import settings

    say("\nDone. The app was told to restart (tmp/restart.txt). If the site does not update,")
    say("press RESTART on the cPanel 'Setup Python App' page.")
    say(f"Admin panel: {settings.SITE_URL.rstrip('/')}/{settings.ADMIN_PATH}/")


if __name__ == "__main__":
    main()
