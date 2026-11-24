"""Minimal environment loader.

cPanel's "Setup Python App" screen can set environment variables directly. As a
fallback (and for local development) values can also live in a ``.env`` file in
the application root, which sits outside ``public_html`` and is never served.
Real environment variables always win over the file.
"""
from __future__ import annotations

import os
from pathlib import Path


def load_env(path: Path) -> None:
    if not path.is_file():
        return
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export "):]
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key] = value  # a key written twice: the last line wins
    for key, value in values.items():
        os.environ.setdefault(key, value)


def env(name: str, default: str = "") -> str:
    """A blank value (``KEY=`` left empty in .env) means "use the default"."""
    value = os.environ.get(name, "").strip()
    return value or default


def env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.environ.get(name, "").strip()
    try:
        return int(value) if value else default
    except ValueError:
        return default


def env_list(name: str, default: list[str] | None = None) -> list[str]:
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]
