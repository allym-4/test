from rest_framework import serializers
from .models import Ticket, TicketMessage
from apps.users.serializers import UserMinimalSerializer


class TicketMessageSerializer(serializers.ModelSerializer):
    sender_detail = UserMinimalSerializer(source='sender', read_only=True)

    class Meta:
        model = TicketMessage
        fields = ('id', 'ticket', 'sender', 'sender_detail', 'body', 'is_internal', 'created_at')
        read_only_fields = ('id', 'sender', 'created_at')


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
