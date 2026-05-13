from django.urls import path
from . import views

urlpatterns = [
    path('studios/', views.StudioListView.as_view(), name='studio-list'),
    path('sessions/', views.ClassSessionListView.as_view(), name='session-list'),
    path('sessions/<int:pk>/', views.ClassSessionDetailView.as_view(), name='session-detail'),
    path('occurrences/', views.ClassOccurrenceListView.as_view(), name='occurrence-list'),
    path('occurrences/<int:pk>/', views.ClassOccurrenceDetailView.as_view(), name='occurrence-detail'),
]
