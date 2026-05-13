from django.urls import path
from . import views

urlpatterns = [
    path('studios/', views.StudioListView.as_view(), name='studio-list'),
    path('sessions/', views.ClassSessionListView.as_view(), name='session-list'),
    path('sessions/<int:pk>/', views.ClassSessionDetailView.as_view(), name='session-detail'),
    path('occurrences/', views.ClassOccurrenceListView.as_view(), name='occurrence-list'),
    path('occurrences/<int:pk>/', views.ClassOccurrenceDetailView.as_view(), name='occurrence-detail'),
    path('seasons/', views.SeasonListView.as_view(), name='season-list'),
    path('seasons/<int:pk>/', views.SeasonDetailView.as_view(), name='season-detail'),
    path('lockers/', views.LockerListView.as_view(), name='locker-list'),
    path('lockers/<int:pk>/', views.LockerDetailView.as_view(), name='locker-detail'),
]
