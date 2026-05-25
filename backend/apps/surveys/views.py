from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Survey, SurveyQuestion, SurveyResponse, SurveyAnswer, SeasonFeedback
from .serializers import SurveySerializer, SurveyQuestionSerializer, SurveyResponseSerializer
from apps.users.permissions import IsAdminOrInstructor, IsAdminUser


class SurveyListView(generics.ListCreateAPIView):
    serializer_class = SurveySerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = Survey.objects.prefetch_related('questions', 'responses')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SurveyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SurveySerializer
    permission_classes = [IsAdminOrInstructor]
    queryset = Survey.objects.prefetch_related('questions', 'responses')


class SurveyQuestionListView(generics.ListCreateAPIView):
    serializer_class = SurveyQuestionSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = SurveyQuestion.objects.all()
        survey_id = self.request.query_params.get('survey')
        if survey_id:
            qs = qs.filter(survey_id=survey_id)
        return qs


class SurveyQuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SurveyQuestionSerializer
    permission_classes = [IsAdminOrInstructor]
    queryset = SurveyQuestion.objects.all()


class SurveyResponseListView(generics.ListCreateAPIView):
    serializer_class = SurveyResponseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('admin', 'instructor'):
            qs = SurveyResponse.objects.select_related('student', 'survey').prefetch_related('answers')
            survey_id = self.request.query_params.get('survey')
            if survey_id:
                qs = qs.filter(survey_id=survey_id)
            return qs
        return SurveyResponse.objects.filter(student=user).select_related('survey').prefetch_related('answers')

    def create(self, request, *args, **kwargs):
        survey_id = request.data.get('survey')
        answers_data = request.data.get('answers', [])

        try:
            survey = Survey.objects.get(pk=survey_id)
        except Survey.DoesNotExist:
            from rest_framework.response import Response
            return Response({'detail': 'Survey not found'}, status=404)

        with transaction.atomic():
            response_obj = SurveyResponse.objects.create(
                survey=survey,
                student=request.user,
            )
            for answer in answers_data:
                question_id = answer.get('question')
                answer_text = answer.get('answer_text', '')
                try:
                    question = SurveyQuestion.objects.get(pk=question_id, survey=survey)
                except SurveyQuestion.DoesNotExist:
                    continue
                SurveyAnswer.objects.create(
                    response=response_obj,
                    question=question,
                    answer_text=answer_text,
                )

        serializer = self.get_serializer(response_obj)
        return Response(serializer.data, status=201)


class SurveySendView(APIView):
    """Mark a survey as sent and notify all active students."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return Response({'detail': 'Survey not found.'}, status=404)

        survey.status = 'active'
        survey.sent_at = timezone.now()
        survey.save(update_fields=['status', 'sent_at'])

        from apps.users.models import User, Notification
        from apps.enrolments.models import Enrolment

        base_qs = User.objects.filter(role='student', is_active=True)
        audience = survey.target_audience

        if audience == 'trial':
            trial_ids = Enrolment.objects.filter(
                enrolment_type='trial', status='active'
            ).values_list('student_id', flat=True)
            students = base_qs.filter(id__in=trial_ids)
        elif audience == 'active_enrolment':
            enrolled_ids = Enrolment.objects.filter(
                status='active'
            ).values_list('student_id', flat=True)
            students = base_qs.filter(id__in=enrolled_ids)
        elif audience == 'lapsed':
            from django.utils import timezone
            from datetime import timedelta
            from apps.attendance.models import AttendanceRecord
            cutoff = timezone.now() - timedelta(days=42)
            recent_ids = AttendanceRecord.objects.filter(
                status='present', occurrence__date__gte=cutoff.date()
            ).values_list('student_id', flat=True)
            students = base_qs.exclude(id__in=recent_ids)
        else:
            students = base_qs

        notifications = [
            Notification(
                recipient=student,
                title='New survey — please complete',
                body=f'{survey.name}: {survey.description[:100]}' if survey.description else survey.name,
                notification_type='info',
                action_label='Complete Survey',
                action_url='/portal/forms',
            )
            for student in students
        ]
        Notification.objects.bulk_create(notifications, ignore_conflicts=True)

        return Response(SurveySerializer(survey).data)


class SurveyMineView(APIView):
    """Return active surveys the logged-in student hasn't completed yet."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        responded_ids = SurveyResponse.objects.filter(student=request.user).values_list('survey_id', flat=True)
        pending = Survey.objects.filter(status='active').exclude(id__in=responded_ids).prefetch_related('questions')
        return Response(SurveySerializer(pending, many=True).data)


class SurveyExportCsvView(APIView):
    """Return survey responses as a downloadable CSV file."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request, pk):
        import csv
        from django.http import HttpResponse

        try:
            survey = Survey.objects.prefetch_related('questions', 'responses__answers').get(pk=pk)
        except Survey.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        questions = list(survey.questions.order_by('order'))
        responses = survey.responses.select_related('student').prefetch_related('answers').all()

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="survey-{pk}-responses.csv"'

        writer = csv.writer(response)
        header = ['Student', 'Submitted At'] + [q.question_text for q in questions]
        writer.writerow(header)

        for r in responses:
            answer_map = {a.question_id: a.answer_text for a in r.answers.all()}
            row = [
                str(r.student),
                r.submitted_at.strftime('%Y-%m-%d %H:%M'),
            ] + [answer_map.get(q.id, '') for q in questions]
            writer.writerow(row)

        return response


# ── Seasonal Check-in / Feedback ────────────────────────────────────────────

class SeasonalCheckinView(APIView):
    """GET: return the current user's pending SeasonFeedback for the active season."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.classes.models import Season
        try:
            season = Season.objects.get(status='active')
        except Season.DoesNotExist:
            return Response(None, status=200)
        except Season.MultipleObjectsReturned:
            season = Season.objects.filter(status='active').order_by('-start_date').first()

        feedback = SeasonFeedback.objects.filter(
            student=request.user,
            season=season,
            responded_at__isnull=True,
        ).first()

        if not feedback:
            return Response(None, status=200)

        return Response({
            'id': feedback.id,
            'season_name': season.name,
            'sent_at': feedback.sent_at,
        })


class SeasonalCheckinRespondView(APIView):
    """POST: student submits their seasonal feedback response."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            feedback = SeasonFeedback.objects.select_related('season').get(
                pk=pk, student=request.user
            )
        except SeasonFeedback.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        if feedback.responded_at:
            return Response({'detail': 'Already responded.'}, status=400)

        rating = request.data.get('rating')
        message = request.data.get('message', '')

        if rating is not None:
            try:
                rating = int(rating)
            except (ValueError, TypeError):
                return Response({'detail': 'Rating must be an integer 1–5.'}, status=400)
            if rating < 1 or rating > 5:
                return Response({'detail': 'Rating must be between 1 and 5.'}, status=400)
            feedback.rating = rating

        feedback.message = message
        feedback.responded_at = timezone.now()
        feedback.save(update_fields=['rating', 'message', 'responded_at'])

        return Response({
            'id': feedback.id,
            'season_name': feedback.season.name,
            'sent_at': feedback.sent_at,
            'rating': feedback.rating,
            'message': feedback.message,
            'responded_at': feedback.responded_at,
        })


class SeasonalCheckinAdminView(APIView):
    """GET: admin view of all SeasonFeedback for the active season."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.classes.models import Season
        try:
            season = Season.objects.get(status='active')
        except Season.DoesNotExist:
            return Response([])
        except Season.MultipleObjectsReturned:
            season = Season.objects.filter(status='active').order_by('-start_date').first()

        feedbacks = SeasonFeedback.objects.filter(season=season).select_related('student')
        data = [
            {
                'id': fb.id,
                'student_id': fb.student_id,
                'student_name': fb.student.display_name,
                'sent_at': fb.sent_at,
                'rating': fb.rating,
                'message': fb.message,
                'responded_at': fb.responded_at,
            }
            for fb in feedbacks
        ]
        return Response(data)
