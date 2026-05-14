from django.db import transaction
from rest_framework import generics, permissions
from .models import Survey, SurveyQuestion, SurveyResponse, SurveyAnswer
from .serializers import SurveySerializer, SurveyQuestionSerializer, SurveyResponseSerializer
from apps.users.permissions import IsAdminOrInstructor


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

        from rest_framework.response import Response
        serializer = self.get_serializer(response_obj)
        return Response(serializer.data, status=201)
