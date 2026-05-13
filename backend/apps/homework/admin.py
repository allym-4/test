from django.contrib import admin
from .models import HomeworkAssignment, HomeworkChecklistItem, HomeworkSubmission, HomeworkSubmissionItem


class ChecklistItemInline(admin.TabularInline):
    model = HomeworkChecklistItem
    extra = 1


class SubmissionItemInline(admin.TabularInline):
    model = HomeworkSubmissionItem
    extra = 0


@admin.register(HomeworkAssignment)
class HomeworkAssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'class_session', 'assigned_by', 'assigned_date', 'status')
    list_filter = ('status', 'class_session__studio')
    search_fields = ('title', 'class_session__name')
    date_hierarchy = 'assigned_date'
    inlines = [ChecklistItemInline]


@admin.register(HomeworkSubmission)
class HomeworkSubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'assignment', 'submitted_at', 'reviewed_by', 'reviewed_at')
    list_filter = ('assignment__class_session',)
    search_fields = ('student__first_name', 'student__last_name', 'assignment__title')
    date_hierarchy = 'submitted_at'
    inlines = [SubmissionItemInline]
