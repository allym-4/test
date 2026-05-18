from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.users.urls import leads_urlpatterns
from apps.users.throttles import LoginRateThrottle
from apps.users import views as user_views
from django.http import JsonResponse
from django.core.management import call_command
import os

class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]

def seed_view(request):
    secret = request.GET.get('secret', '')
    if secret != os.environ.get('SEED_SECRET', 'duality-seed-2026'):
        return JsonResponse({'error': 'forbidden'}, status=403)
    try:
        call_command('seed', force=True)
        return JsonResponse({'ok': True, 'message': 'Seed complete'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('_seed/', seed_view),
    path('api/auth/token/', ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', user_views.RegisterView.as_view(), name='register'),
    path('api/users/', include('apps.users.urls')),
    path('api/leads/', include((leads_urlpatterns, 'leads'))),
    path('api/classes/', include('apps.classes.urls')),
    path('api/enrolments/', include('apps.enrolments.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/homework/', include('apps.homework.urls')),
    path('api/helpdesk/', include('apps.helpdesk.urls')),
    path('api/community/', include('apps.community.urls')),
    path('api/surveys/', include('apps.surveys.urls')),
]
