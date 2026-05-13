from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.users.urls import leads_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('apps.users.urls')),
    path('api/leads/', include((leads_urlpatterns, 'leads'))),
    path('api/classes/', include('apps.classes.urls')),
    path('api/enrolments/', include('apps.enrolments.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/homework/', include('apps.homework.urls')),
    path('api/helpdesk/', include('apps.helpdesk.urls')),
]
