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


class SubmissionItemListView(generics.ListCreateAPIView):
    serializer_class = HomeworkSubmissionItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return HomeworkSubmissionItem.objects.filter(submission_id=self.kwargs['submission_pk'])

    def perform_create(self, serializer):
        submission = HomeworkSubmission.objects.get(pk=self.kwargs['submission_pk'])
        serializer.save(submission=submission)


class ChecklistItemBulkView(generics.CreateAPIView):
    """Create multiple checklist items for an assignment."""
    serializer_class = HomeworkChecklistItemSerializer
    permission_classes = [IsAdminOrInstructor]

    def create(self, request, assignment_pk):
        assignment = HomeworkAssignment.objects.get(pk=assignment_pk)
        items_data = request.data if isinstance(request.data, list) else [request.data]
        created = []
        for i, item in enumerate(items_data):
            obj = HomeworkChecklistItem.objects.create(
                assignment=assignment,
                text=item.get('text', ''),
                order=item.get('order', i),
            )
            created.append(HomeworkChecklistItemSerializer(obj).data)
        return Response(created, status=status.HTTP_201_CREATED)


from rest_framework.views import APIView

class HomeworkRemindView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            assignment = HomeworkAssignment.objects.select_related('class_session').get(pk=pk)
        except HomeworkAssignment.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        from apps.users.models import Notification
        from apps.enrolments.models import Enrolment
        students = Enrolment.objects.filter(
            class_session=assignment.class_session, status='active'
        ).values_list('student_id', flat=True)
        notifs = [
            Notification(
                recipient_id=sid,
                title='Homework reminder',
                body=f'Don\'t forget to complete "{assignment.title}" for {assignment.class_session.name}.',
                notification_type='info',
            )
            for sid in students
        ]
        Notification.objects.bulk_create(notifs, ignore_conflicts=True)
        return Response({'sent': len(notifs)})
