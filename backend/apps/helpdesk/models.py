from django.db import models
from apps.users.models import User


class Ticket(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        PENDING = 'pending', 'Pending'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    class Priority(models.TextChoices):
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'

    class Category(models.TextChoices):
        BOOKING = 'Booking', 'Booking'
        BILLING = 'Billing', 'Billing'
        MEMBERSHIP = 'Membership', 'Membership'
        TECHNICAL = 'Technical', 'Technical'
        GENERAL = 'General', 'General'

    subject = models.CharField(max_length=255)
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.status.upper()}] {self.subject}'


class TicketMessage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='helpdesk_messages')
    body = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Message on #{self.ticket_id} by {self.sender}'


class Conversation(models.Model):
    class Source(models.TextChoices):
        DIRECT = 'direct', 'Direct'
        INSTAGRAM = 'instagram', 'Instagram'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations', null=True, blank=True)
    instructor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='instructor_conversations')
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.DIRECT)
    instagram_sender_id = models.CharField(max_length=100, blank=True, db_index=True)
    admin_unread = models.BooleanField(default=False)
    instructor_unread = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'Conversation with {self.student}'


class DirectMessage(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='direct_messages')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'DM from {self.sender} in convo #{self.conversation_id}'


class FAQ(models.Model):
    question = models.TextField()
    answer = models.TextField()
    icon = models.CharField(max_length=10, blank=True, default='❓')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.question[:80]
