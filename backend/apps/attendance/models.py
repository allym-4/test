from django.db import models
from apps.users.models import User
from apps.classes.models import ClassOccurrence


class AttendanceRecord(models.Model):
    class AttendanceStatus(models.TextChoices):
        PRESENT = 'present', 'Present'
        LATE = 'late', 'Late'
        ABSENT = 'absent', 'Absent'
        NO_SHOW = 'no_show', 'No-show'
        CANCELLED = 'cancelled', 'Cancelled'

    occurrence = models.ForeignKey(ClassOccurrence, on_delete=models.CASCADE, related_name='attendance')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance_records')
    status = models.CharField(max_length=15, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT)
    no_show_fee_charged = models.BooleanField(default=False)
    no_show_fee_waived = models.BooleanField(default=False)
    note = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='attendance_recorded'
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('occurrence', 'student')]
        ordering = ['-occurrence__date']

    def __str__(self):
        return f'{self.student.display_name} · {self.occurrence} · {self.status}'


class MakeupCredit(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        USED = 'used', 'Used'
        EXPIRED = 'expired', 'Expired'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='makeup_credits')
    reason = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    issued_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='credits_issued'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Credit for {self.student.display_name} ({self.status})'
