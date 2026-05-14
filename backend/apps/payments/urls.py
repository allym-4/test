from django.urls import path
from . import views

urlpatterns = [
    path('', views.PaymentListView.as_view(), name='payment-list'),
    path('<int:pk>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('plans/', views.PaymentPlanListView.as_view(), name='plan-list'),
    path('plans/<int:pk>/', views.PaymentPlanDetailView.as_view(), name='plan-detail'),
    path('instalments/', views.InstalmentListView.as_view(), name='instalment-list'),
    path('plans/instalments/<int:pk>/', views.InstalmentDetailView.as_view(), name='instalment-detail'),
    path('balance/<int:student_pk>/', views.student_balance, name='student-balance'),
]
