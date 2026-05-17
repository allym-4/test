from rest_framework import serializers
from .models import Survey, SurveyQuestion, SurveyResponse, SurveyAnswer


class SurveyQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyQuestion
        fields = ('id', 'survey', 'question_text', 'question_type', 'options', 'required', 'order')


class SurveyAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyAnswer
        fields = ('id', 'question', 'answer_text')


class SurveyResponseSerializer(serializers.ModelSerializer):
    student_name = serializers.StringRelatedField(source='student')
    answers = SurveyAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = SurveyResponse
        fields = ('id', 'survey', 'student_name', 'submitted_at', 'answers')


class SurveySerializer(serializers.ModelSerializer):
    created_by_name = serializers.StringRelatedField(source='created_by')
    question_count = serializers.SerializerMethodField()
    response_count = serializers.SerializerMethodField()
    questions = SurveyQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Survey
        fields = (
            'id', 'name', 'description', 'status', 'target_audience', 'trigger',
            'created_by_name', 'created_at', 'sent_at',
            'question_count', 'response_count', 'questions',
        )

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_response_count(self, obj):
        return obj.responses.count()
