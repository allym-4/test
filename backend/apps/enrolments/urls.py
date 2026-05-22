from django.urls import path
from . import views

urlpatterns = [
    path('pricing/', views.enrolment_pricing, name='enrolment-pricing'),
    path('flagged/', views.FlaggedEnrolmentsView.as_view(), name='enrolment-flagged'),
    path('flagged/<int:pk>/dismiss/', views.FlaggedEnrolmentsView.as_view(), name='enrolment-flag-dismiss'),
    path('trial-feedback/pending/', views.PendingTrialFeedbackView.as_view(), name='trial-feedback-pending'),
    path('change-requests/', views.ClassChangeRequestListCreateView.as_view(), name='change-request-list'),
    path('change-requests/<int:pk>/', views.ClassChangeRequestDetailView.as_view(), name='change-request-detail'),
    path('change-requests/<int:pk>/approve/', views.ClassChangeRequestApproveView.as_view(), name='change-request-approve'),
    path('change-requests/<int:pk>/reject/', views.ClassChangeRequestRejectView.as_view(), name='change-request-reject'),
    path('change-requests/<int:pk>/request-info/', views.ClassChangeRequestInfoView.as_view(), name='change-request-request-info'),
    path('waitlist-reorder/', views.WaitlistReorderView.as_view(), name='waitlist-reorder'),
    path('<int:pk>/promote-waitlist/', views.AdminPromoteSeasonWaitlistView.as_view(), name='promote-waitlist'),
    path('', views.EnrolmentListView.as_view(), name='enrolment-list'),
    path('<int:pk>/', views.EnrolmentDetailView.as_view(), name='enrolment-detail'),
    path('<int:pk>/convert-trial/', views.ConvertTrialView.as_view(), name='enrolment-convert-trial'),
    path('<int:pk>/claim-spot/', views.ClaimWaitlistSpotView.as_view(), name='enrolment-claim-spot'),
    path('<int:pk>/trial-feedback/', views.SubmitTrialFeedbackView.as_view(), name='trial-feedback-submit'),
    path('<int:pk>/enrol-after-trial/', views.StudentTrialEnrolView.as_view(), name='student-trial-enrol'),
    path('calendar.ics', views.CalendarIcsView.as_view(), name='enrolment-calendar-ics'),
]
