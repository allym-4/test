from django.urls import path
from . import views

urlpatterns = [
    path('', views.AttendanceListView.as_view(), name='attendance-list'),
    path('<int:pk>/', views.AttendanceDetailView.as_view(), name='attendance-detail'),
    path('occurrence/<int:occurrence_pk>/bulk/', views.bulk_save_register, name='attendance-bulk'),
]
