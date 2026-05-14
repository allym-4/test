from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Ticket, TicketMessage, Conversation, DirectMessage
from .serializers import (
    TicketSerializer, TicketListSerializer, TicketMessageSerializer,
    ConversationSerializer, ConversationListSerializer, DirectMessageSerializer,
)
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


class StudentTicketCreateView(generics.CreateAPIView):
    """Students can submit a support ticket with an optional first message."""
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        ticket = serializer.save(student=self.request.user)
        body = self.request.data.get('body', '').strip()
        if body:
            TicketMessage.objects.create(ticket=ticket, sender=self.request.user, body=body)


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


class ConversationListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrInstructor]

    def get_serializer_class(self):
        return ConversationListSerializer if self.request.method == 'GET' else ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.select_related('student').prefetch_related('messages__sender')


class ConversationDetailView(generics.RetrieveAPIView):
    queryset = Conversation.objects.select_related('student').prefetch_related('messages__sender')
    serializer_class = ConversationSerializer
    permission_classes = [IsAdminOrInstructor]


class DirectMessageListView(generics.ListCreateAPIView):
    serializer_class = DirectMessageSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        return DirectMessage.objects.filter(conversation_id=self.kwargs['conv_pk']).select_related('sender')

    def perform_create(self, serializer):
        conv = Conversation.objects.get(pk=self.kwargs['conv_pk'])
        serializer.save(sender=self.request.user, conversation=conv)
        conv.save(update_fields=['updated_at'])


class MyConversationView(APIView):
    """Student gets (or creates) their own conversation with the studio."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conv, _ = Conversation.objects.prefetch_related('messages__sender').get_or_create(
            student=request.user
        )
        return Response(ConversationSerializer(conv).data)

    def post(self, request):
        conv, _ = Conversation.objects.get_or_create(student=request.user)
        body = request.data.get('body', '').strip()
        if not body:
            return Response({'detail': 'body required'}, status=400)
        msg = DirectMessage.objects.create(conversation=conv, sender=request.user, body=body)
        conv.save(update_fields=['updated_at'])
        return Response(DirectMessageSerializer(msg).data, status=201)
