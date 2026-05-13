from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        INSTRUCTOR = 'instructor', 'Instructor'
        ADMIN = 'admin', 'Admin'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    pronouns = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', null=True, blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    internal_notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.role})'

    @property
    def display_name(self):
        return self.get_full_name() or self.username


class StaffNote(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='staff_notes')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='notes_authored')
    tag = models.CharField(max_length=50, blank=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Note on {self.student} by {self.created_by} ({self.tag})'
