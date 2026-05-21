from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, StaffNote


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Duality', {'fields': ('role', 'pronouns', 'phone', 'date_of_birth', 'profile_photo',
                                'emergency_contact_name', 'emergency_contact_phone', 'internal_notes')}),
        ('Instructor Profile', {'fields': ('instructor_tagline', 'bio', 'instructor_instagram'), 'classes': ('collapse',)}),
    )
    list_display = ('username', 'get_full_name', 'email', 'role', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('username', 'first_name', 'last_name', 'email')


@admin.register(StaffNote)
class StaffNoteAdmin(admin.ModelAdmin):
    list_display = ('student', 'tag', 'created_by', 'created_at')
    list_filter = ('tag',)
    search_fields = ('student__first_name', 'student__last_name', 'body')
