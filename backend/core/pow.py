"""Proof-of-work CAPTCHA (ALTCHA, https://altcha.org), self-hosted.

The server hands out a signed puzzle; the visitor's browser finds the number
that solves it (a fraction of a second of CPU, done in the background while
they type). Every bot message costs the sender the same CPU, and a solved
puzzle can be used only once. No third-party service, cookies or tracking.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
from typing import Any

from altcha import ChallengeOptionsV1, create_challenge_v1, verify_solution_v1
from django.conf import settings
from django.core.cache import cache


def _hmac_key() -> str:
    return hashlib.sha256(b"altcha-pow:" + settings.SECRET_KEY.encode()).hexdigest()


def new_challenge(purpose: str) -> dict[str, Any]:
    challenge = create_challenge_v1(
        ChallengeOptionsV1(
            algorithm="SHA-256",
            max_number=settings.POW_MAX_NUMBER,
            hmac_key=_hmac_key(),
            expires=dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=settings.POW_TTL_SECONDS),
            params={"p": purpose},
        )
    )
    return challenge.to_dict()


def verify(payload: Any, purpose: str) -> bool:
    """True once per valid, unexpired solution issued for ``purpose``."""
    if not settings.POW_ENABLED:
        return True
    if isinstance(payload, dict):
        data = payload
    elif isinstance(payload, str) and 0 < len(payload) < 4096:
        try:
            data = json.loads(payload)
        except ValueError:
            return False
    else:
        return False
    if not isinstance(data, dict) or not isinstance(data.get("salt"), str):
        return False
    if f"p={purpose}&" not in data["salt"] and not data["salt"].endswith(f"p={purpose}"):
        return False
    try:
        ok, _err = verify_solution_v1(data, _hmac_key(), check_expires=True)
    except Exception:  # noqa: BLE001 - malformed input is simply a failure
        return False
    if not ok:
        return False
    # One use only: remember the signature until the puzzle would expire anyway.
    return cache.add(f"pow:used:{data['signature']}", 1, timeout=settings.POW_TTL_SECONDS + 60)
