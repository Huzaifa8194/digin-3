"""Entry point for cPanel "Setup Python App" (Phusion Passenger).

In cPanel set:  Application startup file = passenger_wsgi.py
                Application Entry point  = application
"""
import os
import sys

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
if APP_ROOT not in sys.path:
    sys.path.insert(0, APP_ROOT)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from config.wsgi import application  # noqa: E402,F401
