from django.urls import path
from . import views

urlpatterns = [
    path('pricing/', views.enrolment_pricing, name='enrolment-pricing'),
    path('', views.EnrolmentListView.as_view(), name='enrolment-list'),
    path('<int:pk>/', views.EnrolmentDetailView.as_view(), name='enrolment-detail'),
    path('<int:pk>/convert-trial/', views.ConvertTrialView.as_view(), name='enrolment-convert-trial'),
]
