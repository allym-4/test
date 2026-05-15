from django.urls import path
from . import views

urlpatterns = [
    path('', views.SurveyListView.as_view()),
    path('<int:pk>/', views.SurveyDetailView.as_view()),
    path('<int:pk>/send/', views.SurveySendView.as_view()),
    path('questions/', views.SurveyQuestionListView.as_view()),
    path('responses/', views.SurveyResponseListView.as_view()),
]
