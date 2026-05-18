from django.urls import path
from . import views

urlpatterns = [
    path('pricing/', views.enrolment_pricing, name='enrolment-pricing'),
    path('flagged/', views.FlaggedEnrolmentsView.as_view(), name='enrolment-flagged'),
    path('flagged/<int:pk>/dismiss/', views.FlaggedEnrolmentsView.as_view(), name='enrolment-flag-dismiss'),
    path('trial-feedback/pending/', views.PendingTrialFeedbackView.as_view(), name='trial-feedback-pending'),
    path('', views.EnrolmentListView.as_view(), name='enrolment-list'),
    path('<int:pk>/', views.EnrolmentDetailView.as_view(), name='enrolment-detail'),
    path('<int:pk>/convert-trial/', views.ConvertTrialView.as_view(), name='enrolment-convert-trial'),
    path('<int:pk>/claim-spot/', views.ClaimWaitlistSpotView.as_view(), name='enrolment-claim-spot'),
    path('<int:pk>/trial-feedback/', views.SubmitTrialFeedbackView.as_view(), name='trial-feedback-submit'),
    path('calendar.ics', views.CalendarIcsView.as_view(), name='enrolment-calendar-ics'),
]
