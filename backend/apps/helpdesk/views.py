from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Ticket, TicketMessage
from .serializers import TicketSerializer, TicketListSerializer, TicketMessageSerializer
from apps.users.permissions import IsAdminOrInstructor


class TicketListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrInstructor]

    def get_serializer_class(self):
        return TicketListSerializer if self.request.method == 'GET' else TicketSerializer

    def get_queryset(self):
        qs = Ticket.objects.select_related('student', 'assigned_to').prefetch_related('messages')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        serializer.save()


class TicketDetailView(generics.RetrieveUpdateAPIView):
    queryset = Ticket.objects.select_related('student', 'assigned_to').prefetch_related('messages__sender')
    permission_classes = [IsAdminOrInstructor]

    def get_serializer_class(self):
        return TicketSerializer


class TicketMessageListView(generics.ListCreateAPIView):
    serializer_class = TicketMessageSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        return TicketMessage.objects.filter(ticket_id=self.kwargs['ticket_pk']).select_related('sender')

    def perform_create(self, serializer):
        ticket = Ticket.objects.get(pk=self.kwargs['ticket_pk'])
        serializer.save(sender=self.request.user, ticket=ticket)
        if ticket.status == 'open':
            ticket.status = 'pending'
            ticket.save(update_fields=['status'])
