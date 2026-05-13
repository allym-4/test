from rest_framework import generics, permissions
from .models import Enrolment
from .serializers import EnrolmentSerializer
from apps.users.permissions import IsAdminOrInstructor


class EnrolmentListView(generics.ListCreateAPIView):
    serializer_class = EnrolmentSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = Enrolment.objects.select_related('student', 'class_session__studio')
        student_id = self.request.query_params.get('student')
        session_id = self.request.query_params.get('session')
        status = self.request.query_params.get('status')
        if student_id:
            qs = qs.filter(student_id=student_id)
        if session_id:
            qs = qs.filter(class_session_id=session_id)
        if status:
            qs = qs.filter(status=status)
        return qs


class EnrolmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Enrolment.objects.select_related('student', 'class_session__studio')
    serializer_class = EnrolmentSerializer
    permission_classes = [IsAdminOrInstructor]
