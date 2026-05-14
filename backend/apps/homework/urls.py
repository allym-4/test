from django.urls import path
from . import views

urlpatterns = [
    path('', views.HomeworkAssignmentListView.as_view(), name='homework-list'),
    path('<int:pk>/', views.HomeworkAssignmentDetailView.as_view(), name='homework-detail'),
    path('<int:assignment_pk>/checklist/', views.ChecklistItemBulkView.as_view(), name='checklist-bulk'),
    path('submissions/', views.HomeworkSubmissionListView.as_view(), name='submission-list'),
    path('submissions/<int:pk>/', views.HomeworkSubmissionDetailView.as_view(), name='submission-detail'),
    path('submissions/<int:submission_pk>/items/', views.SubmissionItemListView.as_view(), name='submission-item-list'),
]
