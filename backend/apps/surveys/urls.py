from django.urls import path
from . import views

urlpatterns = [
    path('', views.SurveyListView.as_view()),
    path('mine/', views.SurveyMineView.as_view()),
    path('<int:pk>/', views.SurveyDetailView.as_view()),
    path('<int:pk>/send/', views.SurveySendView.as_view()),
    path('<int:pk>/export-csv/', views.SurveyExportCsvView.as_view()),
    path('questions/', views.SurveyQuestionListView.as_view()),
    path('questions/<int:pk>/', views.SurveyQuestionDetailView.as_view()),
    path('responses/', views.SurveyResponseListView.as_view()),
    # Seasonal check-in
    path('seasonal-checkin/', views.SeasonalCheckinView.as_view()),
    path('seasonal-checkin/admin/', views.SeasonalCheckinAdminView.as_view()),
    path('seasonal-checkin/<int:pk>/respond/', views.SeasonalCheckinRespondView.as_view()),
]
