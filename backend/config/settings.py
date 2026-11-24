"""Django settings for the Digiinn360 site backend.

Every secret and every host-specific value comes from the environment (see
``.env.example``). Nothing sensitive is committed. Production is the default:
``DJANGO_DEBUG`` must be switched on explicitly for local development.
"""
from __future__ import annotations

from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from .env import env, env_bool, env_int, env_list, load_env

BASE_DIR = Path(__file__).resolve().parent.parent
load_env(BASE_DIR / ".env")

DEBUG = env_bool("DJANGO_DEBUG", False)

SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-only-not-a-secret-never-use-in-production"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY is not set.")
elif not DEBUG and len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be at least 50 characters.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["127.0.0.1", "localhost"] if DEBUG else [])
if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS is not set.")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

# Admin lives under an unadvertised path. 2FA + lockout are the real controls.
ADMIN_PATH = env("DJANGO_ADMIN_PATH", "digibe").strip("/") or "digibe"
ADMIN_REQUIRE_2FA = env_bool("ADMIN_REQUIRE_2FA", True)
# Optional allow-list (comma separated IPs or CIDRs). Empty = reachable from anywhere.
ADMIN_ALLOWED_IPS = env_list("ADMIN_ALLOWED_IPS")

# The built Vite site. Production: <app root>/site. Local: ../dist.
_frontend = env("FRONTEND_DIR")
if _frontend:
    FRONTEND_DIR = Path(_frontend)
elif (BASE_DIR / "site").is_dir():
    FRONTEND_DIR = BASE_DIR / "site"
else:
    FRONTEND_DIR = BASE_DIR.parent / "dist"

# Public address of the site, used in links inside notification emails.
SITE_URL = env("SITE_URL", "https://www.digiinn360.com")

# Where requests really come from. Leave REMOTE_ADDR unless a proxy/CDN
# (e.g. Cloudflare -> HTTP_CF_CONNECTING_IP) sits in front of Apache.
CLIENT_IP_HEADER = env("CLIENT_IP_HEADER", "REMOTE_ADDR")
# Proxy headers are only believed from these addresses ("cloudflare" = Cloudflare's ranges).
TRUSTED_PROXY_CIDRS = env_list("TRUSTED_PROXY_CIDRS")
if CLIENT_IP_HEADER != "REMOTE_ADDR" and not TRUSTED_PROXY_CIDRS:
    raise ImproperlyConfigured("CLIENT_IP_HEADER needs TRUSTED_PROXY_CIDRS (e.g. 'cloudflare').")

INSTALLED_APPS = [
    "unfold.apps.BasicAppConfig",  # NOT "unfold": that swaps in its own admin site (no 2FA)
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "core.apps.SecureAdminConfig",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_otp",
    "django_otp.plugins.otp_totp",
    "django_otp.plugins.otp_static",
    "axes",
    "core",
    "leads",
]

MIDDLEWARE = [
    "core.middleware.ProxyHeadersMiddleware",
    # Outermost so headers also land on files WhiteNoise serves.
    "core.middleware.SecurityHeadersMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "core.middleware.AdminIPAllowListMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database -----------------------------------------------------------------
DB_ENGINE = env("DB_ENGINE", "sqlite" if DEBUG else "mysql").lower()
if DB_ENGINE == "mysql":
    if env("DB_DRIVER", "pymysql").lower() == "pymysql":
        import pymysql

        pymysql.version_info = (2, 2, 1, "final", 0)
        pymysql.install_as_MySQLdb()
    for _required in ("DB_NAME", "DB_USER", "DB_PASSWORD"):
        if not env(_required):
            raise ImproperlyConfigured(f"{_required} is not set.")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": env("DB_NAME"),
            "USER": env("DB_USER"),
            "PASSWORD": env("DB_PASSWORD"),
            "HOST": env("DB_HOST", "localhost"),
            "PORT": env("DB_PORT", "3306"),
            "CONN_MAX_AGE": 60,
            "CONN_HEALTH_CHECKS": True,
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB",
            },
        }
    }
elif DB_ENGINE == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / env("SQLITE_NAME", "db.sqlite3"),
        }
    }
else:
    raise ImproperlyConfigured("DB_ENGINE must be 'mysql' or 'sqlite'.")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# File cache: shared between Passenger worker processes, no extra table needed.
VAR_DIR = BASE_DIR / "var"
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": str(VAR_DIR / "cache"),
        "TIMEOUT": 3600,
        "OPTIONS": {"MAX_ENTRIES": 5000},
    }
}

# --- Authentication -----------------------------------------------------------
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LOGIN_URL = f"/{ADMIN_PATH}/login/"
LOGIN_REDIRECT_URL = f"/{ADMIN_PATH}/"

# Brute-force protection (django-axes): lock a username+IP pair after 5 failures.
AXES_FAILURE_LIMIT = env_int("AXES_FAILURE_LIMIT", 5)
AXES_COOLOFF_TIME = env_int("AXES_COOLOFF_MINUTES", 30) / 60  # hours
AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]
AXES_RESET_ON_SUCCESS = True
AXES_CLIENT_IP_CALLABLE = "core.net.axes_client_ip"
AXES_LOCKOUT_TEMPLATE = "admin/locked_out.html"
AXES_VERBOSE = False
AXES_ENABLE_ACCESS_FAILURE_LOG = True

# django-otp
OTP_TOTP_ISSUER = "Digiinn360 Admin"
OTP_TOTP_THROTTLE_FACTOR = 1

# --- Sessions, cookies, transport ---------------------------------------------
SECURE_COOKIES = env_bool("SECURE_COOKIES", not DEBUG)
SESSION_COOKIE_SECURE = SECURE_COOKIES
CSRF_COOKIE_SECURE = SECURE_COOKIES
SESSION_COOKIE_NAME = "__Host-sid" if SECURE_COOKIES else "sid"
CSRF_COOKIE_NAME = "__Host-csrf" if SECURE_COOKIES else "csrftoken"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True  # the site JS receives the token from /api/form-session/
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Strict"
SESSION_COOKIE_AGE = env_int("SESSION_HOURS", 8) * 3600
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
CSRF_FAILURE_VIEW = "core.views.csrf_failure"

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", not DEBUG)
SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]
if env_bool("TRUST_X_FORWARDED_PROTO", False):  # honoured only from TRUSTED_PROXY_CIDRS
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 0 if DEBUG else 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", False)
# HSTS for subdomains / preload stays off on purpose: cPanel subdomains (webmail,
# cpanel, mail) are not always HTTPS-only. Turn on via .env once they are.
SILENCED_SYSTEM_CHECKS = [] if SECURE_HSTS_INCLUDE_SUBDOMAINS else ["security.W005", "security.W021"]
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# Small request bodies: the public API accepts a few KB of JSON at most and
# the admin has no file uploads.
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 2000
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024

# --- Static files ---------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
# The site folder is public. Never let it point at (or above) the app folder,
# which holds .env and the source code.
if FRONTEND_DIR.resolve() == BASE_DIR.resolve() or BASE_DIR.resolve().is_relative_to(FRONTEND_DIR.resolve()):
    raise ImproperlyConfigured("FRONTEND_DIR must be a separate folder inside the app, e.g. <app>/site.")
# Serve the built site from the web root, e.g. /about/ -> about/index.html.
WHITENOISE_ROOT = FRONTEND_DIR if FRONTEND_DIR.is_dir() else None
WHITENOISE_INDEX_FILE = True
# Admin CSS/JS are served straight from the installed packages, so the admin
# works even before collectstatic has run.
WHITENOISE_USE_FINDERS = True
WHITENOISE_MAX_AGE = 0 if DEBUG else 300
WHITENOISE_IMMUTABLE_FILE_TEST = r"^/?(assets|static)/.+[.-][0-9a-zA-Z_-]{8,}\.[a-z0-9]+$"

# --- i18n -----------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Karachi"
USE_I18N = True
USE_TZ = True

# --- Email ----------------------------------------------------------------------
EMAIL_BACKEND = env("EMAIL_BACKEND") or (
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST") or "localhost"
EMAIL_PORT = env_int("EMAIL_PORT", 465)
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", EMAIL_PORT == 465)
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", EMAIL_PORT == 587)
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL") or EMAIL_HOST_USER or "Digiinn360 Website <no-reply@digiinn360.com>"
# Lead alerts are sent only once a mailbox is configured (or in development).
EMAIL_ENABLED = DEBUG or bool(env("EMAIL_HOST")) or "locmem" in EMAIL_BACKEND or "console" in EMAIL_BACKEND
SERVER_EMAIL = DEFAULT_FROM_EMAIL
# Initial recipients for new-lead alerts; editable later in the admin.
LEADS_NOTIFY_EMAILS = env_list("LEADS_NOTIFY_EMAILS", ["info@digiinn360.com"])

# --- Public form API ----------------------------------------------------------------
LEADS_RATE_LIMITS = (
    (env_int("LEADS_RATE_PER_10MIN", 5), 600),
    (env_int("LEADS_RATE_PER_DAY", 20), 86400),
)
LEADS_MIN_FILL_SECONDS = env_int("LEADS_MIN_FILL_SECONDS", 3)

# Proof-of-work CAPTCHA (ALTCHA) on the website forms and the admin login.
# Higher POW_MAX_NUMBER = more work per attempt (100000 is about 0.5-2 s in a
# background thread on a phone; visitors don't wait because it starts on focus).
POW_ENABLED = env_bool("POW_ENABLED", True)
POW_MAX_NUMBER = env_int("POW_MAX_NUMBER", 100000)
POW_TTL_SECONDS = 1800
LEADS_FORM_TOKEN_MAX_AGE = 2 * 3600

# --- Logging ----------------------------------------------------------------------
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
VAR_DIR.mkdir(exist_ok=True)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "{asctime} {levelname} {name} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "plain"},
        "app_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOG_DIR / "app.log"),
            "maxBytes": 2 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "plain",
            "encoding": "utf-8",
        },
        "security_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOG_DIR / "security.log"),
            "maxBytes": 2 * 1024 * 1024,
            "backupCount": 10,
            "formatter": "plain",
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "django": {"handlers": ["console", "app_file"], "level": "WARNING"},
        "django.security": {"handlers": ["security_file", "console"], "level": "WARNING", "propagate": False},
        "axes": {"handlers": ["security_file"], "level": "INFO", "propagate": False},
        "digiinn.security": {"handlers": ["security_file", "console"], "level": "INFO", "propagate": False},
        "digiinn": {"handlers": ["app_file", "console"], "level": "INFO"},
    },
}

# --- Admin look -----------------------------------------------------------------
UNFOLD = {
    "SITE_TITLE": "Digiinn360 Admin",
    "SITE_HEADER": "Digiinn360",
    "SITE_SUBHEADER": "Website administration",
    "SITE_URL": "/",
    "SITE_SYMBOL": "shield_lock",
    "SITE_FAVICONS": [{"rel": "icon", "sizes": "32x32", "type": "image/png", "href": "/brand/favicon.png"}],
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "ENVIRONMENT": "core.dashboard.environment_badge",
    "DASHBOARD_CALLBACK": "core.dashboard.dashboard_callback",
    "LOGIN": {"redirect_after": None, "form": "core.forms.CaptchaLoginForm"},
    "BORDER_RADIUS": "6px",
    "COLORS": {
        "primary": {
            "50": "254 242 242", "100": "254 226 226", "200": "254 202 202", "300": "252 165 165",
            "400": "248 113 113", "500": "239 68 68", "600": "220 38 38", "700": "185 28 28",
            "800": "153 27 27", "900": "127 29 29", "950": "69 10 10",
        },
    },
    "SIDEBAR": {
        "show_search": False,
        "show_all_applications": False,
        "navigation": "core.dashboard.sidebar_navigation",
    },
}
