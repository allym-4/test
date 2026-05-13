from django.contrib import admin
from .models import Studio, ClassSession, ClassOccurrence


@admin.register(Studio)
class StudioAdmin(admin.ModelAdmin):
    list_display = ('name', 'address')


@admin.register(ClassSession)
class ClassSessionAdmin(admin.ModelAdmin):
    list_display = ('name', 'level', 'get_day_of_week_display', 'start_time', 'studio', 'instructor',
                    'capacity', 'session_type', 'is_active')
    list_filter = ('day_of_week', 'session_type', 'is_active', 'studio')
    search_fields = ('name', 'level')


@admin.register(ClassOccurrence)
class ClassOccurrenceAdmin(admin.ModelAdmin):
    list_display = ('session', 'date', 'status', 'register_saved', 'substitute_instructor')
    list_filter = ('status', 'register_saved', 'session__studio')
    search_fields = ('session__name',)
    date_hierarchy = 'date'
