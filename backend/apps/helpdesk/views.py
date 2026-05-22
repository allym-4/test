from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import Ticket, TicketMessage, Conversation, DirectMessage, FAQ, StaffNote
from .serializers import (
    TicketSerializer, TicketListSerializer, TicketMessageSerializer,
    ConversationSerializer, ConversationListSerializer, DirectMessageSerializer,
    FAQSerializer, StaffNoteSerializer,
)
from apps.users.permissions import IsAdminOrInstructor, IsAdminUser


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
        qs = Conversation.objects.select_related('student', 'instructor').prefetch_related('messages__sender')
        # Instructors only see conversations assigned to them
        if self.request.user.role == 'instructor':
            qs = qs.filter(instructor=self.request.user)
        return qs

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student')
        if student_id and request.user.role == 'instructor':
            conv, _ = Conversation.objects.get_or_create(
                student_id=student_id,
                instructor=request.user,
            )
            return Response(ConversationSerializer(conv, context={'request': request}).data, status=201)
        return super().create(request, *args, **kwargs)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class ConversationDetailView(generics.RetrieveUpdateAPIView):
    queryset = Conversation.objects.select_related('student', 'instructor').prefetch_related('messages__sender')
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
        # Mark as unread for the other party
        if self.request.user == conv.instructor:
            conv.admin_unread = True
        else:
            conv.instructor_unread = True
            conv.admin_unread = False
        conv.save(update_fields=['updated_at', 'admin_unread', 'instructor_unread'])


class MyConversationView(APIView):
    """Student gets (or creates) their conversation — optionally with a specific instructor."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_conv(self, request):
        instructor_id = request.query_params.get('instructor_id') or request.data.get('instructor_id')
        if instructor_id:
            from apps.users.models import User as UserModel
            try:
                instructor = UserModel.objects.get(pk=instructor_id, role='instructor')
            except UserModel.DoesNotExist:
                return None, None
            conv, _ = Conversation.objects.get_or_create(student=request.user, instructor=instructor)
        else:
            conv, _ = Conversation.objects.get_or_create(student=request.user, instructor=None)
        return conv, instructor_id

    def get(self, request):
        conv, _ = self._get_conv(request)
        if conv is None:
            return Response({'detail': 'Instructor not found'}, status=404)
        conv = Conversation.objects.prefetch_related('messages__sender').get(pk=conv.pk)
        return Response(ConversationSerializer(conv).data)

    def post(self, request):
        conv, instructor_id = self._get_conv(request)
        if conv is None:
            return Response({'detail': 'Instructor not found'}, status=404)
        body = request.data.get('body', '').strip()
        if not body:
            return Response({'detail': 'body required'}, status=400)
        msg = DirectMessage.objects.create(conversation=conv, sender=request.user, body=body)
        if instructor_id:
            conv.instructor_unread = True
        else:
            conv.admin_unread = True
        conv.save(update_fields=['updated_at', 'admin_unread', 'instructor_unread'])
        return Response(DirectMessageSerializer(msg).data, status=201)


class MyTicketListView(generics.ListAPIView):
    """Student lists their own tickets."""
    serializer_class = TicketListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Ticket.objects.filter(student=self.request.user)
            .select_related('student', 'assigned_to')
            .prefetch_related('messages')
            .order_by('-created_at')
        )


class MyTicketMessageView(generics.ListCreateAPIView):
    """Student reads and replies to messages on their own ticket."""
    serializer_class = TicketMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            TicketMessage.objects
            .filter(ticket_id=self.kwargs['ticket_pk'], ticket__student=self.request.user)
            .select_related('sender')
        )

    def perform_create(self, serializer):
        ticket = Ticket.objects.get(pk=self.kwargs['ticket_pk'], student=self.request.user)
        serializer.save(sender=self.request.user, ticket=ticket)


class FAQListView(generics.ListCreateAPIView):
    serializer_class = FAQSerializer

    def get_queryset(self):
        qs = FAQ.objects.all()
        if not (self.request.user.is_authenticated and self.request.user.role == 'admin'):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminUser()]


class FAQDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminUser()]


class StaffNoteListView(generics.ListCreateAPIView):
    serializer_class = StaffNoteSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = StaffNote.objects.select_related('author', 'resolved_by')
        resolved = self.request.query_params.get('resolved')
        if resolved == 'false':
            qs = qs.filter(is_resolved=False)
        elif resolved == 'true':
            qs = qs.filter(is_resolved=True)
        limit = self.request.query_params.get('limit')
        if limit:
            qs = qs[:int(limit)]
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class StaffNoteDetailView(generics.RetrieveUpdateAPIView):
    queryset = StaffNote.objects.select_related('author', 'resolved_by')
    serializer_class = StaffNoteSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_update(self, serializer):
        instance = self.get_object()
        data = self.request.data
        if data.get('is_resolved') and not instance.is_resolved:
            serializer.save(is_resolved=True, resolved_by=self.request.user, resolved_at=timezone.now())
        else:
            serializer.save()
