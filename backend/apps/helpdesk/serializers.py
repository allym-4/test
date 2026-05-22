from rest_framework import serializers
from .models import Ticket, TicketMessage, Conversation, DirectMessage, FAQ, StaffNote
from apps.users.serializers import UserMinimalSerializer


class TicketMessageSerializer(serializers.ModelSerializer):
    sender_detail = UserMinimalSerializer(source='sender', read_only=True)

    class Meta:
        model = TicketMessage
        fields = ('id', 'ticket', 'sender', 'sender_detail', 'body', 'is_internal', 'created_at')
        read_only_fields = ('id', 'ticket', 'sender', 'created_at')


class TicketSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    assigned_to_detail = UserMinimalSerializer(source='assigned_to', read_only=True)
    messages = TicketMessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = Ticket
        fields = (
            'id', 'subject', 'student', 'student_detail', 'status', 'priority',
            'category', 'assigned_to', 'assigned_to_detail',
            'messages', 'message_count', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class TicketListSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    assigned_to_detail = UserMinimalSerializer(source='assigned_to', read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)
    last_message_at = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'subject', 'student', 'student_detail', 'status', 'priority',
            'category', 'assigned_to', 'assigned_to_detail',
            'message_count', 'last_message_at', 'created_at', 'updated_at',
        )

    def get_last_message_at(self, obj):
        last = obj.messages.last()
        return last.created_at if last else obj.created_at


class DirectMessageSerializer(serializers.ModelSerializer):
    sender_detail = UserMinimalSerializer(source='sender', read_only=True)

    class Meta:
        model = DirectMessage
        fields = ('id', 'conversation', 'sender', 'sender_detail', 'body', 'created_at')
        read_only_fields = ('id', 'conversation', 'sender', 'created_at')


class ConversationSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    instructor_detail = UserMinimalSerializer(source='instructor', read_only=True)
    messages = DirectMessageSerializer(many=True, read_only=True)
    last_message_at = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(source='messages.count', read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            'id', 'student', 'student_detail', 'student_name',
            'instructor', 'instructor_detail',
            'messages', 'message_count', 'last_message_at',
            'admin_unread', 'instructor_unread', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_last_message_at(self, obj):
        last = obj.messages.last()
        return last.created_at if last else obj.updated_at

    def get_student_name(self, obj):
        if obj.student:
            return obj.student.display_name or f'{obj.student.first_name} {obj.student.last_name}'.strip()
        return ''


class ConversationListSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    instructor_detail = UserMinimalSerializer(source='instructor', read_only=True)
    last_message_at = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(source='messages.count', read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            'id', 'student', 'student_detail', 'student_name',
            'instructor', 'instructor_detail',
            'message_count', 'last_message_at', 'last_message_preview', 'last_message',
            'unread_count', 'admin_unread', 'instructor_unread', 'created_at', 'updated_at',
        )

    def get_last_message_at(self, obj):
        last = obj.messages.last()
        return last.created_at if last else obj.updated_at

    def get_last_message_preview(self, obj):
        last = obj.messages.last()
        return last.body[:80] if last else ''

    def get_last_message(self, obj):
        last = obj.messages.last()
        if not last:
            return None
        return {'id': last.id, 'body': last.body, 'created_at': last.created_at}

    def get_student_name(self, obj):
        if obj.student:
            return obj.student.display_name or f'{obj.student.first_name} {obj.student.last_name}'.strip()
        return ''

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user == obj.instructor:
            return 1 if obj.instructor_unread else 0
        return 1 if obj.admin_unread else 0


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ('id', 'question', 'answer', 'icon', 'order', 'is_active')


class StaffNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffNote
        fields = ('id', 'author', 'author_name', 'body', 'category', 'is_resolved', 'resolved_by', 'resolved_by_name', 'resolved_at', 'created_at')
        read_only_fields = ('id', 'author', 'author_name', 'resolved_by', 'resolved_by_name', 'resolved_at', 'created_at')

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.display_name or obj.author.get_full_name() or obj.author.username
        return ''

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return obj.resolved_by.display_name or obj.resolved_by.get_full_name()
        return ''
