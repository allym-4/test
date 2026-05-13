from django.db import models
from apps.users.models import User
from apps.classes.models import ClassSession


class HomeworkAssignment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CLOSED = 'closed', 'Closed'

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    class_session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name='homework')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='homework_assigned')
    assigned_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ['-assigned_date']

    def __str__(self):
        return f'{self.title} · {self.class_session}'

    @property
    def submission_count(self):
        return self.submissions.count()

    @property
    def enrolled_count(self):
        return self.class_session.enrolled_count


class HomeworkChecklistItem(models.Model):
    assignment = models.ForeignKey(HomeworkAssignment, on_delete=models.CASCADE, related_name='checklist_items')
    text = models.CharField(max_length=300)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.assignment.title} · {self.text}'


class HomeworkSubmission(models.Model):
    assignment = models.ForeignKey(HomeworkAssignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='homework_submissions')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='homework_reviewed'
    )
    instructor_notes = models.TextField(blank=True)

    class Meta:
        unique_together = [('assignment', 'student')]
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.student.display_name} · {self.assignment.title}'


class HomeworkSubmissionItem(models.Model):
    submission = models.ForeignKey(HomeworkSubmission, on_delete=models.CASCADE, related_name='items')
    checklist_item = models.ForeignKey(HomeworkChecklistItem, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    video_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = [('submission', 'checklist_item')]

    def __str__(self):
        return f'{self.submission} · {self.checklist_item.text} · {"✓" if self.completed else "✗"}'
