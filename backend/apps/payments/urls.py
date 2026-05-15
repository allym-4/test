from django.urls import path
from . import views, stripe_views

urlpatterns = [
    path('stripe/config/', stripe_views.StripeConfigView.as_view(), name='stripe-config'),
    path('stripe/payment-intent/', stripe_views.StripePaymentIntentView.as_view(), name='stripe-payment-intent'),
    path('stripe/setup-intent/', stripe_views.StripeSetupIntentView.as_view(), name='stripe-setup-intent'),
    path('stripe/payment-methods/', stripe_views.StripePaymentMethodsView.as_view(), name='stripe-payment-methods'),
    path('stripe/charge-saved/', stripe_views.StripeChargeSavedCardView.as_view(), name='stripe-charge-saved'),
    path('stripe/webhook/', stripe_views.StripeWebhookView.as_view(), name='stripe-webhook'),

    path('stats/', views.PaymentStatsView.as_view(), name='payment-stats'),
    path('dashboard/', views.DashboardStatsView.as_view(), name='payment-dashboard'),
    path('', views.PaymentListView.as_view(), name='payment-list'),
    path('<int:pk>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('plans/', views.PaymentPlanListView.as_view(), name='plan-list'),
    path('plans/<int:pk>/', views.PaymentPlanDetailView.as_view(), name='plan-detail'),
    path('plans/<int:pk>/remind/', views.remind_plan, name='plan-remind'),
    path('instalments/', views.InstalmentListView.as_view(), name='instalment-list'),
    path('plans/instalments/<int:pk>/', views.InstalmentDetailView.as_view(), name='instalment-detail'),
    path('balance/<int:student_pk>/', views.student_balance, name='student-balance'),

    path('packages/', views.PackageListView.as_view(), name='package-list'),
    path('packages/<int:pk>/', views.PackageDetailView.as_view(), name='package-detail'),
    path('student-packages/', views.StudentPackageListView.as_view(), name='student-package-list'),
    path('student-packages/<int:pk>/', views.StudentPackageDetailView.as_view(), name='student-package-detail'),
    path('membership-types/', views.MembershipTypeListView.as_view(), name='membership-type-list'),
    path('membership-types/<int:pk>/', views.MembershipTypeDetailView.as_view(), name='membership-type-detail'),
    path('gift-cards/', views.GiftCardListView.as_view(), name='gift-card-list'),
    path('gift-cards/<int:pk>/', views.GiftCardDetailView.as_view(), name='gift-card-detail'),
    path('gift-cards/redeem/', views.redeem_gift_card, name='gift-card-redeem'),
    path('promo-codes/', views.PromoCodeListView.as_view(), name='promo-code-list'),
    path('promo-codes/<int:pk>/', views.PromoCodeDetailView.as_view(), name='promo-code-detail'),
]
