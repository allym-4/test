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
        PENDING_DISPLACEMENT = 'pending_displacement', 'Pending Displacement'

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

    # Displacement tracking
    displacement_casual_booking = models.ForeignKey(
        'classes.CasualBooking', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='pending_enrolments'
    )
    displacement_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('student', 'class_session')]
        ordering = ['-enrolled_date']

    def __str__(self):
        return f'{self.student.display_name} → {self.class_session}'


class ClassChangeRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='change_requests')
    current_enrolment = models.ForeignKey(
        Enrolment, on_delete=models.CASCADE, related_name='change_requests'
    )
    requested_session = models.ForeignKey(
        ClassSession, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='incoming_change_requests'
    )
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.display_name} — change request ({self.status})'


class TrialFeedback(models.Model):
    enrolment = models.OneToOneField(Enrolment, on_delete=models.CASCADE, related_name='trial_feedback')
    enrolled = models.BooleanField(default=False)  # True = they clicked "Yes - enrol now"
    class_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    instructor_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    facilities_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    structure_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Feedback: {self.enrolment}'
