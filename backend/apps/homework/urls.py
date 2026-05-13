from django.urls import path
from . import views

urlpatterns = [
    path('', views.HomeworkAssignmentListView.as_view(), name='homework-list'),
    path('<int:pk>/', views.HomeworkAssignmentDetailView.as_view(), name='homework-detail'),
    path('submissions/', views.HomeworkSubmissionListView.as_view(), name='submission-list'),
    path('submissions/<int:pk>/', views.HomeworkSubmissionDetailView.as_view(), name='submission-detail'),
]
