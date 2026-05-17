from django.db import models
from apps.users.models import User
from apps.classes.models import ClassSession


class Enrolment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        WAITLISTED = 'waitlisted', 'Waitlisted'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
        SUSPENDED = 'suspended', 'Suspended'
        EXEMPTION_REQUESTED = 'exemption_requested', 'Exemption Requested'

    class EnrolmentType(models.TextChoices):
        COURSE = 'course', 'Course'
        CASUAL = 'casual', 'Casual'
        TRIAL = 'trial', 'Trial'
        CATCHUP = 'catchup', 'Catchup'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrolments')
    class_session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name='enrolments')
    enrolment_type = models.CharField(max_length=10, choices=EnrolmentType.choices, default=EnrolmentType.COURSE)
    status = models.CharField(max_length=22, choices=Status.choices, default=Status.ACTIVE)
    enrolled_date = models.DateField(auto_now_add=True)
    cancelled_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_first_visit = models.BooleanField(default=False)
    intro_email_sent = models.BooleanField(default=False)
    waiver_signed = models.BooleanField(default=False)
    flag_dismissed = models.BooleanField(default=False)

    # Waitlist offer tracking
    waitlist_offered_at = models.DateTimeField(null=True, blank=True)
    waitlist_expires_at = models.DateTimeField(null=True, blank=True)
    waitlist_urgent = models.BooleanField(default=False)  # True = everyone notified simultaneously

    class Meta:
        unique_together = [('student', 'class_session')]
        ordering = ['-enrolled_date']

    def __str__(self):
        return f'{self.student.display_name} → {self.class_session}'
