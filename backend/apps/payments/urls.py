from django.urls import path
from . import views, stripe_views

urlpatterns = [
    path('stripe/config/', stripe_views.StripeConfigView.as_view(), name='stripe-config'),
    path('stripe/payment-intent/', stripe_views.StripePaymentIntentView.as_view(), name='stripe-payment-intent'),
    path('stripe/setup-intent/', stripe_views.StripeSetupIntentView.as_view(), name='stripe-setup-intent'),
    path('stripe/payment-methods/', stripe_views.StripePaymentMethodsView.as_view(), name='stripe-payment-methods'),
    path('stripe/webhook/', stripe_views.StripeWebhookView.as_view(), name='stripe-webhook'),

    path('', views.PaymentListView.as_view(), name='payment-list'),
    path('<int:pk>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('plans/', views.PaymentPlanListView.as_view(), name='plan-list'),
    path('plans/<int:pk>/', views.PaymentPlanDetailView.as_view(), name='plan-detail'),
    path('instalments/', views.InstalmentListView.as_view(), name='instalment-list'),
    path('plans/instalments/<int:pk>/', views.InstalmentDetailView.as_view(), name='instalment-detail'),
    path('balance/<int:student_pk>/', views.student_balance, name='student-balance'),
]
