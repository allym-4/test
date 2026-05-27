from rest_framework import serializers
from .models import HomeworkAssignment, HomeworkChecklistItem, HomeworkSubmission, HomeworkSubmissionItem
from apps.users.serializers import UserMinimalSerializer
from apps.classes.serializers import ClassSessionSerializer


class HomeworkChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeworkChecklistItem
        fields = ('id', 'assignment', 'text', 'order')
        read_only_fields = ('id',)


class HomeworkAssignmentSerializer(serializers.ModelSerializer):
    checklist_items = HomeworkChecklistItemSerializer(many=True, read_only=True)
    assigned_by_detail = UserMinimalSerializer(source='assigned_by', read_only=True)
    class_session_detail = ClassSessionSerializer(source='class_session', read_only=True)
    submission_count = serializers.ReadOnlyField()
    enrolled_count = serializers.ReadOnlyField()
    reviewed_count = serializers.SerializerMethodField()

    class Meta:
        model = HomeworkAssignment
        fields = (
            'id', 'title', 'description', 'class_session', 'class_session_detail',
            'assigned_by', 'assigned_by_detail', 'assigned_date', 'due_date', 'status',
            'submission_count', 'enrolled_count', 'reviewed_count', 'checklist_items',
        )
        read_only_fields = ('id', 'assigned_by', 'assigned_date')

    def get_reviewed_count(self, obj):
        return obj.submissions.filter(reviewed_at__isnull=False).count()


class HomeworkSubmissionItemSerializer(serializers.ModelSerializer):
    checklist_item_text = serializers.StringRelatedField(source='checklist_item')

    class Meta:
        model = HomeworkSubmissionItem
        fields = ('id', 'submission', 'checklist_item', 'checklist_item_text', 'completed', 'video_url', 'notes')
        read_only_fields = ('id',)


class HomeworkAssignmentDetailSerializer(serializers.ModelSerializer):
    class_session_name = serializers.SerializerMethodField()

    class Meta:
        model = HomeworkAssignment
        fields = ('id', 'title', 'due_date', 'status', 'class_session_name')

    def get_class_session_name(self, obj):
        if obj.class_session:
            return str(obj.class_session)
        return ''


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    assignment_detail = HomeworkAssignmentDetailSerializer(source='assignment', read_only=True)
    reviewed_by_name = serializers.StringRelatedField(source='reviewed_by')
    reviewed = serializers.SerializerMethodField()
    items = HomeworkSubmissionItemSerializer(many=True, read_only=True)

    class Meta:
        model = HomeworkSubmission
        fields = (
            'id', 'assignment', 'assignment_title', 'assignment_detail', 'student', 'student_detail', 'student_name',
            'submitted_at', 'reviewed', 'reviewed_at', 'reviewed_by', 'reviewed_by_name',
            'instructor_notes', 'items',
        )
        read_only_fields = ('id', 'student', 'submitted_at')

    def get_reviewed(self, obj):
        return obj.reviewed_at is not None
