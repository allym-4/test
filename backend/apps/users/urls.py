from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MeView.as_view(), name='user-me'),
    path('import/', views.BulkImportView.as_view(), name='user-bulk-import'),
    path('settings/', views.StudioSettingsView.as_view(), name='studio-settings'),
    path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('<int:user_pk>/notes/', views.StaffNoteListView.as_view(), name='staff-notes'),
]

leads_urlpatterns = [
    path('', views.LeadListView.as_view(), name='lead-list'),
    path('<int:pk>/', views.LeadDetailView.as_view(), name='lead-detail'),
]
