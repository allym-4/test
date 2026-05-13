from django.urls import path
from . import views

urlpatterns = [
    path('', views.TicketListView.as_view(), name='ticket-list'),
    path('<int:pk>/', views.TicketDetailView.as_view(), name='ticket-detail'),
    path('<int:ticket_pk>/messages/', views.TicketMessageListView.as_view(), name='ticket-messages'),
]
