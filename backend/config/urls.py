from django.conf import settings
from django.contrib import admin
from django.urls import path

from leads import api

urlpatterns = [
    path(f"{settings.ADMIN_PATH}/", admin.site.urls),
    path("api/form-session/", api.form_session, name="api-form-session"),
    path("api/leads/", api.create_lead, name="api-create-lead"),
    path("api/health/", api.health, name="api-health"),
]

handler404 = "core.views.page_not_found"
handler500 = "core.views.server_error"
