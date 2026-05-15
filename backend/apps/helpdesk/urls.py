from django.urls import path
from . import views

urlpatterns = [
    path('', views.TicketListView.as_view(), name='ticket-list'),
    path('<int:pk>/', views.TicketDetailView.as_view(), name='ticket-detail'),
    path('<int:ticket_pk>/messages/', views.TicketMessageListView.as_view(), name='ticket-messages'),
    path('conversations/', views.ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<int:pk>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:conv_pk>/messages/', views.DirectMessageListView.as_view(), name='dm-list'),
    path('my-conversation/', views.MyConversationView.as_view(), name='my-conversation'),
    path('my-tickets/', views.MyTicketListView.as_view(), name='my-ticket-list'),
    path('my-tickets/<int:ticket_pk>/messages/', views.MyTicketMessageView.as_view(), name='my-ticket-messages'),
    path('submit/', views.StudentTicketCreateView.as_view(), name='student-ticket-create'),
]
