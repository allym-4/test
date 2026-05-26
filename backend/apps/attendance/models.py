from django.db import models
from apps.users.models import User
from apps.classes.models import ClassOccurrence, Season


class AttendanceRecord(models.Model):
    class AttendanceStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
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
    class NoteTag(models.TextChoices):
        GENERAL = 'general', 'General'
        INJURY = 'injury', 'Injury'
        VIBES = 'vibes', 'Vibes'

    note = models.TextField(blank=True)
    note_tag = models.CharField(max_length=20, choices=NoteTag.choices, blank=True, default='')
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
    season = models.ForeignKey(Season, on_delete=models.SET_NULL, null=True, blank=True, related_name='makeup_credits')
    source_occurrence = models.ForeignKey(
        'classes.ClassOccurrence', on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_credits'
    )
    reason = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    issued_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='credits_issued'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Credit for {self.student.display_name} ({self.status})'


class ClassPass(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='class_passes')
    num_classes = models.PositiveIntegerField(default=4)
    classes_used = models.PositiveIntegerField(default=0)
    price_paid = models.DecimalField(max_digits=8, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def classes_remaining(self):
        return self.num_classes - self.classes_used

    @property
    def is_active(self):
        from datetime import date
        if self.classes_remaining <= 0:
            return False
        if self.expires_at and self.expires_at < date.today():
            return False
        return True

    def __str__(self):
        return f'{self.student.display_name} · {self.classes_remaining}/{self.num_classes} remaining'
