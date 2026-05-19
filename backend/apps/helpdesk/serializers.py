from rest_framework import serializers
from .models import Ticket, TicketMessage, Conversation, DirectMessage, FAQ
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
        read_only_fields = ('id', 'sender', 'created_at')


class ConversationSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    messages = DirectMessageSerializer(many=True, read_only=True)
    last_message_at = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = Conversation
        fields = ('id', 'student', 'student_detail', 'messages', 'message_count', 'last_message_at', 'admin_unread', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_last_message_at(self, obj):
        last = obj.messages.last()
        return last.created_at if last else obj.updated_at


class ConversationListSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    last_message_at = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(source='messages.count', read_only=True)
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'student', 'student_detail', 'message_count', 'last_message_at', 'last_message_preview', 'created_at', 'updated_at')

    def get_last_message_at(self, obj):
        last = obj.messages.last()
        return last.created_at if last else obj.updated_at

    def get_last_message_preview(self, obj):
        last = obj.messages.last()
        return last.body[:80] if last else ''


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ('id', 'question', 'answer', 'icon', 'order', 'is_active')
