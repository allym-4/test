from django.urls import path
from . import views

urlpatterns = [
    path('', views.AttendanceListView.as_view(), name='attendance-list'),
    path('<int:pk>/', views.AttendanceDetailView.as_view(), name='attendance-detail'),
    path('occurrence/<int:occurrence_pk>/bulk/', views.bulk_save_register, name='attendance-bulk'),
    path('checkin/', views.kiosk_checkin, name='attendance-checkin'),
    path('mark-away/', views.StudentMarkAwayView.as_view(), name='attendance-mark-away'),
    path('cancel-away/', views.StudentCancelAwayView.as_view(), name='attendance-cancel-away'),
    path('stats/', views.AttendanceStatsView.as_view(), name='attendance-stats'),
    path('makeup-credits/', views.MakeupCreditListView.as_view(), name='makeup-credits'),
    path('makeup-credits/<int:pk>/', views.MakeupCreditDetailView.as_view(), name='makeup-credit-detail'),
]
