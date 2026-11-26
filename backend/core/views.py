from __future__ import annotations

from django.conf import settings
from django.http import HttpResponse, JsonResponse

_FALLBACK_404 = "<!doctype html><title>Page not found</title><h1>Page not found</h1><p><a href='/'>Home</a></p>"
_ERROR_500 = (
    "<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<title>Something went wrong | Digiinn360</title><body style='font:16px/1.5 system-ui,Arial,sans-serif;padding:8vw'>"
    "<h1>Something went wrong on our side.</h1><p>Please try again in a minute, or write to "
    "<a href='mailto:procurement@digiinn360.com'>procurement@digiinn360.com</a>.</p><p><a href='/'>Back to the home page</a></p></body></html>"
)


def page_not_found(request, exception=None):
    if request.path.startswith("/api/"):
        return JsonResponse({"ok": False, "error": "Not found."}, status=404)
    page = settings.FRONTEND_DIR / "404.html"
    try:
        body = page.read_text(encoding="utf-8")
    except OSError:
        body = _FALLBACK_404
    return HttpResponse(body, status=404, content_type="text/html; charset=utf-8")


def server_error(request):
    if request.path.startswith("/api/"):
        return JsonResponse({"ok": False, "error": "Server error. Please email us instead."}, status=500)
    return HttpResponse(_ERROR_500, status=500, content_type="text/html; charset=utf-8")


def csrf_failure(request, reason=""):
    if request.path.startswith("/api/"):
        return JsonResponse({"ok": False, "error": "Your session expired. Please try again.", "code": "csrf"}, status=403)
    return HttpResponse(
        "<!doctype html><title>Session expired</title><p>Your session expired or the request came from another site. "
        "Go back, reload the page and try again.</p>",
        status=403,
        content_type="text/html; charset=utf-8",
    )
