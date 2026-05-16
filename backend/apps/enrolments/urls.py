from django.urls import path
from . import views

urlpatterns = [
    path('', views.EnrolmentListView.as_view(), name='enrolment-list'),
    path('<int:pk>/', views.EnrolmentDetailView.as_view(), name='enrolment-detail'),
    path('<int:pk>/convert-trial/', views.ConvertTrialView.as_view(), name='enrolment-convert-trial'),
    path('<int:pk>/claim-spot/', views.ClaimWaitlistSpotView.as_view(), name='enrolment-claim-spot'),
    path('calendar.ics', views.CalendarIcsView.as_view(), name='enrolment-calendar-ics'),
]
