from django.conf import settings
from django.contrib import admin
from django.urls import path, re_path
from django.views.generic import RedirectView

from leads import api

urlpatterns = [
    path(f"{settings.ADMIN_PATH}/", admin.site.urls),
    path("api/form-session/", api.form_session, name="api-form-session"),
    path("api/leads/", api.create_lead, name="api-create-lead"),
    path("api/health/", api.health, name="api-health"),
    # The SysBastion V1.4 page moved from /sysbastion-2/ to /sysbastion/.
    re_path(r"^sysbastion-2(?:/.*)?$", RedirectView.as_view(url="/sysbastion/", permanent=True)),
    # Agentic Mobile App Penetration Testing became AppSiege; its page lives at /appsiege/.
    re_path(r"^(?:mobile-pentest|app-siege)(?:/.*)?$", RedirectView.as_view(url="/appsiege/", permanent=True)),
]

handler404 = "core.views.page_not_found"
handler500 = "core.views.server_error"
