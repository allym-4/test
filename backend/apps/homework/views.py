from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import HomeworkAssignment, HomeworkChecklistItem, HomeworkSubmission, HomeworkSubmissionItem
from .serializers import (
    HomeworkAssignmentSerializer, HomeworkChecklistItemSerializer,
    HomeworkSubmissionSerializer, HomeworkSubmissionItemSerializer
)
from apps.users.permissions import IsAdminOrInstructor


class HomeworkAssignmentListView(generics.ListCreateAPIView):
    serializer_class = HomeworkAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = HomeworkAssignment.objects.select_related(
            'class_session__studio', 'assigned_by'
        ).prefetch_related('checklist_items')
        if self.request.user.role == 'instructor':
            qs = qs.filter(class_session__instructor=self.request.user)
        elif self.request.user.role == 'student':
            qs = qs.filter(
                class_session__enrolments__student=self.request.user,
                class_session__enrolments__status='active',
                status='active',
            )
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(class_session_id=session_id)
        hw_status = self.request.query_params.get('status')
        if hw_status:
            qs = qs.filter(status=hw_status)
        return qs

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class HomeworkAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = HomeworkAssignment.objects.prefetch_related('checklist_items', 'submissions')
    serializer_class = HomeworkAssignmentSerializer
    permission_classes = [IsAdminOrInstructor]


class HomeworkSubmissionListView(generics.ListCreateAPIView):
    serializer_class = HomeworkSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = HomeworkSubmission.objects.select_related('student', 'assignment', 'reviewed_by')
        assignment_id = self.request.query_params.get('assignment')
        if assignment_id:
            qs = qs.filter(assignment_id=assignment_id)
        if self.request.user.role == 'student':
            qs = qs.filter(student=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class HomeworkSubmissionDetailView(generics.RetrieveUpdateAPIView):
    queryset = HomeworkSubmission.objects.prefetch_related('items')
    serializer_class = HomeworkSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        if self.request.user.role in ('admin', 'instructor') and 'instructor_notes' in self.request.data:
            serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())
        else:
            serializer.save()
