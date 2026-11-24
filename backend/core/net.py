"""Client IP resolution shared by the form rate limiter and django-axes.

Proxy headers (CF-Connecting-IP, X-Forwarded-For, X-Forwarded-Proto) are only
believed when the request really arrives from a trusted proxy listed in
``TRUSTED_PROXY_CIDRS``; ``ProxyHeadersMiddleware`` strips them otherwise, so
a visitor talking to the server directly cannot fake their IP or HTTPS.
"""
from __future__ import annotations

import ipaddress
from functools import lru_cache

from django.conf import settings
from django.http import HttpRequest

# Cloudflare's published edge ranges (https://www.cloudflare.com/ips/).
CLOUDFLARE_RANGES = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18",
    "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17",
    "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32",
    "2a06:98c0::/29", "2c0f:f248::/32",
]


def _valid_ip(value: str) -> str | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        return None


@lru_cache(maxsize=1)
def trusted_proxy_networks() -> tuple:
    nets = []
    for item in getattr(settings, "TRUSTED_PROXY_CIDRS", []):
        ranges = CLOUDFLARE_RANGES if item.lower() == "cloudflare" else [item]
        for cidr in ranges:
            try:
                nets.append(ipaddress.ip_network(cidr, strict=False))
            except ValueError:
                continue
    return tuple(nets)


def from_trusted_proxy(request: HttpRequest) -> bool:
    ip = _valid_ip(request.META.get("REMOTE_ADDR", ""))
    if not ip:
        return False
    address = ipaddress.ip_address(ip)
    return any(address in net for net in trusted_proxy_networks())


def get_client_ip(request: HttpRequest) -> str:
    """The visitor's IP (full address)."""
    header = getattr(settings, "CLIENT_IP_HEADER", "REMOTE_ADDR") or "REMOTE_ADDR"
    raw = request.META.get(header, "") if header != "REMOTE_ADDR" else ""
    if header == "HTTP_X_FORWARDED_FOR" and raw:
        raw = raw.split(",")[-1]
    return _valid_ip(raw) or _valid_ip(request.META.get("REMOTE_ADDR", "")) or "0.0.0.0"


def client_bucket(request: HttpRequest) -> str:
    """Key for rate limits / lockouts. IPv6 is grouped by /64, since one
    connection usually controls a whole /64."""
    ip = get_client_ip(request)
    address = ipaddress.ip_address(ip)
    if address.version == 6:
        return str(ipaddress.ip_network(f"{ip}/64", strict=False).network_address)
    return ip


def axes_client_ip(request: HttpRequest) -> str:
    return client_bucket(request)


def ip_in_networks(ip: str, networks: list[str]) -> bool:
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for net in networks:
        try:
            if address in ipaddress.ip_network(net, strict=False):
                return True
        except ValueError:
            continue
    return False
