from django.db import models
from apps.users.models import User


class SeasonFeedback(models.Model):
    student = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='season_feedbacks')
    season = models.ForeignKey('classes.Season', on_delete=models.CASCADE, related_name='feedbacks')
    sent_at = models.DateTimeField(auto_now_add=True)
    rating = models.IntegerField(null=True, blank=True)  # 1–5
    message = models.TextField(blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('student', 'season')]
        ordering = ['-sent_at']

    def __str__(self):
        return f'{self.student} — feedback for {self.season}'


class Survey(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'

    class Audience(models.TextChoices):
        ALL = 'all', 'All Students'
        TRIAL = 'trial', 'Trial Students'
        ACTIVE_ENROLMENT = 'active_enrolment', 'Currently Enrolled'
        LAPSED = 'lapsed', 'Lapsed Students'

    class Trigger(models.TextChoices):
        MANUAL = 'manual', 'Manual Send'
        AFTER_FIRST_CLASS = 'after_first_class', 'After First Class'
        AFTER_SEASON_ENDS = 'after_season_ends', 'After Season Ends'
        SCHEDULED = 'scheduled', 'Scheduled Date'

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    target_audience = models.CharField(max_length=30, choices=Audience.choices, default=Audience.ALL)
    trigger = models.CharField(max_length=30, choices=Trigger.choices, default=Trigger.MANUAL)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_surveys')
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class SurveyQuestion(models.Model):
    class QuestionType(models.TextChoices):
        TEXT = 'text', 'Free Text'
        RATING = 'rating', 'Star Rating'
        MULTIPLE_CHOICE = 'multiple_choice', 'Multiple Choice'
        CHECKBOX = 'checkbox', 'Checkboxes'
        YES_NO = 'yes_no', 'Yes / No'
        SCALE = 'scale', 'Scale (1–10)'

    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.TEXT)
    options = models.JSONField(default=list, blank=True)
    required = models.BooleanField(default=False)
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
