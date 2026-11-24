"""Content-Security-Policy for the public site and for the admin.

The built pages carry a few small inline ``<script>`` blocks (theme / motion
flags). Rather than allowing every inline script, their SHA-256 hashes are
read from the built HTML once at start-up and listed in the policy.
"""
from __future__ import annotations

import base64
import hashlib
import re
from functools import lru_cache
from pathlib import Path

from django.conf import settings

_INLINE_SCRIPT = re.compile(r"<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>", re.S | re.I)


@lru_cache(maxsize=1)
def inline_script_hashes() -> tuple[str, ...]:
    root: Path = settings.FRONTEND_DIR
    hashes: set[str] = set()
    if not root.is_dir():
        return ()
    for page in root.rglob("*.html"):
        try:
            html = page.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for match in _INLINE_SCRIPT.finditer(html):
            attrs = match.group("attrs").lower()
            body = match.group("body")
            if "src=" in attrs or not body.strip():
                continue
            if "application/ld+json" in attrs or "application/json" in attrs:
                continue  # data blocks are never executed
            digest = hashlib.sha256(body.encode("utf-8")).digest()
            hashes.add("'sha256-" + base64.b64encode(digest).decode() + "'")
    return tuple(sorted(hashes))


def _join(directives: dict[str, list[str]]) -> str:
    return "; ".join(f"{name} {' '.join(values)}".strip() for name, values in directives.items())


@lru_cache(maxsize=2)
def site_policy(secure: bool) -> str:
    directives = {
        "default-src": ["'self'"],
        "script-src": ["'self'", *inline_script_hashes()],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "blob:"],
        "media-src": ["'self'", "blob:"],
        "connect-src": ["'self'"],
        "worker-src": ["'self'", "blob:"],
        "manifest-src": ["'self'"],
        "frame-src": ["'none'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'", "mailto:"],
        "frame-ancestors": ["'none'"],
    }
    if secure:
        directives["upgrade-insecure-requests"] = []
    return _join(directives)


@lru_cache(maxsize=2)
def admin_policy(secure: bool) -> str:
    # The admin UI (Unfold) uses Alpine.js, which needs 'unsafe-eval', and a
    # few inline scripts. It is only reachable after login + 2FA.
    directives = {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "font-src": ["'self'", "data:"],
        "img-src": ["'self'", "data:", "blob:"],
        "connect-src": ["'self'"],
        "frame-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
    }
    if secure:
        directives["upgrade-insecure-requests"] = []
    return _join(directives)
