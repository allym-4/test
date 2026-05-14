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

    class EnrolmentType(models.TextChoices):
        COURSE = 'course', 'Course'
        CASUAL = 'casual', 'Casual'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrolments')
    class_session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name='enrolments')
    enrolment_type = models.CharField(max_length=10, choices=EnrolmentType.choices, default=EnrolmentType.COURSE)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    enrolled_date = models.DateField(auto_now_add=True)
    cancelled_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = [('student', 'class_session')]
        ordering = ['-enrolled_date']

    def __str__(self):
        return f'{self.student.display_name} → {self.class_session}'
