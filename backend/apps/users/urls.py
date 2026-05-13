from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MeView.as_view(), name='user-me'),
    path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('<int:user_pk>/notes/', views.StaffNoteListView.as_view(), name='staff-notes'),
]
