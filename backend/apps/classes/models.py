from django.db import models
from apps.users.models import User


class Studio(models.Model):
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True)

    def __str__(self):
        return self.name


class ClassSession(models.Model):
    """A recurring class slot — e.g. Level 2 Mon 6:30pm at The Box."""

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, 'Monday'
        TUESDAY = 1, 'Tuesday'
        WEDNESDAY = 2, 'Wednesday'
        THURSDAY = 3, 'Thursday'
        FRIDAY = 4, 'Friday'
        SATURDAY = 5, 'Saturday'
        SUNDAY = 6, 'Sunday'

    class SessionType(models.TextChoices):
        COURSE = 'course', 'Course'
        CASUAL = 'casual', 'Casual'

    name = models.CharField(max_length=100)
    level = models.CharField(max_length=50, blank=True)
    instructor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='class_sessions')
    studio = models.ForeignKey(Studio, on_delete=models.SET_NULL, null=True)
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    start_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=90)
    capacity = models.PositiveIntegerField(default=12)
    session_type = models.CharField(max_length=10, choices=SessionType.choices, default=SessionType.COURSE)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f'{self.name} — {self.get_day_of_week_display()} {self.start_time:%H:%M} · {self.studio}'

    @property
    def enrolled_count(self):
        return self.enrolments.filter(status='active').count()


class ClassOccurrence(models.Model):
    """A specific dated instance of a ClassSession."""

    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name='occurrences')
    date = models.DateField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.SCHEDULED)
    substitute_instructor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='substitute_occurrences'
    )
    notes = models.TextField(blank=True)
    register_saved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date']
        unique_together = [('session', 'date')]

    def __str__(self):
        return f'{self.session.name} — {self.date}'


class Season(models.Model):
    class Status(models.TextChoices):
        UPCOMING = 'upcoming', 'Upcoming'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'

    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.UPCOMING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name
