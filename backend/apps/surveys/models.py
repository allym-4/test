from django.db import models
from apps.users.models import User


class Survey(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_surveys')
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class SurveyQuestion(models.Model):
    class QuestionType(models.TextChoices):
        TEXT = 'text', 'Text'
        RATING = 'rating', 'Rating'
        MULTIPLE_CHOICE = 'multiple_choice', 'Multiple Choice'

    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.TEXT)
    options = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'Q{self.order}: {self.question_text[:60]}'


class SurveyResponse(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='responses')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='survey_responses')
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('survey', 'student')]

    def __str__(self):
        return f'Response by {self.student} for {self.survey}'


class SurveyAnswer(models.Model):
    response = models.ForeignKey(SurveyResponse, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(SurveyQuestion, on_delete=models.CASCADE)
    answer_text = models.TextField()

    class Meta:
        unique_together = [('response', 'question')]

    def __str__(self):
        return f'Answer to Q#{self.question_id} in response #{self.response_id}'
