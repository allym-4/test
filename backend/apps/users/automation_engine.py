"""
Custom automation rule execution engine.

Call run_custom_automations(trigger_type, student, context) from any signal
or view that represents one of the supported trigger events. The engine finds
all enabled custom rules matching that trigger, evaluates their conditions,
executes their actions, and logs an AutomationRun.

Supported trigger_type values (mirror TRIGGER_OPTIONS in AdminAutomations.jsx):
  student_created, enrolment_active, enrolment_cancelled,
  attendance_no_show, attendance_present, payment_overdue, form_submitted

Supported action types:
  send_email          — { type, subject, body }
  send_notification   — { type, title, body }
  add_tag             — { type, tag_name }

Supported condition types:
  has_tag    — { type, value: tag_name }
  class_level — { type, value: level_name } — requires context['class_level']
"""

from django.core.mail import send_mail
from django.conf import settings


def _interpolate(text, student):
    """Replace {first_name} / {last_name} / {email} in template strings."""
    return (text or '').replace('{first_name}', student.first_name or '').replace(
        '{last_name}', student.last_name or ''
    ).replace('{email}', student.email or '')


def _check_condition(condition, student, context):
    ctype = condition.get('type')
    value = condition.get('value', '')

    if ctype == 'has_tag':
        from apps.users.models import StudentTag
        return StudentTag.objects.filter(student=student, tag__name=value).exists()

    if ctype == 'class_level':
        return context.get('class_level', '') == value

    return True  # unknown condition type — pass through


def _execute_action(action, student, context):
    atype = action.get('type')

    if atype == 'send_email':
        if not student.email:
            return 'skip: no email'
        subject = _interpolate(action.get('subject', ''), student)
        body = _interpolate(action.get('body', ''), student)
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            fail_silently=True,
        )
        return f'sent email: {subject}'

    if atype == 'send_notification':
        from apps.users.models import Notification
        title = _interpolate(action.get('title', ''), student)
        body = _interpolate(action.get('body', ''), student)
        Notification.objects.create(
            recipient=student,
            title=title,
            body=body,
            notification_type='info',
        )
        return f'sent notification: {title}'

    if atype == 'add_tag':
        from apps.users.models import Tag, StudentTag
        tag_name = action.get('tag_name', '').strip()
        if not tag_name:
            return 'skip: no tag_name'
        tag, _ = Tag.objects.get_or_create(name=tag_name, defaults={'colour': '#888888', 'is_manual': False})
        StudentTag.objects.get_or_create(student=student, tag=tag)
        return f'added tag: {tag_name}'

    return f'unknown action type: {atype}'


def run_custom_automations(trigger_type, student, context=None):
    """
    Fire all enabled custom AutomationRules matching trigger_type.
    Logs each run. Safe to call from signals — catches all exceptions.
    """
    if context is None:
        context = {}

    try:
        from apps.users.models import AutomationRule, AutomationRun
        rules = AutomationRule.objects.filter(
            trigger_type=trigger_type,
            enabled=True,
            is_custom=True,
        )

        for rule in rules:
            try:
                conditions = rule.conditions or []
                if not all(_check_condition(c, student, context) for c in conditions):
                    AutomationRun.objects.create(
                        rule=rule,
                        slug=rule.slug,
                        student=student,
                        trigger_data={'trigger_type': trigger_type, **context},
                        actions_taken=[],
                        status='skipped',
                    )
                    continue

                actions_taken = []
                for action in (rule.actions or []):
                    result = _execute_action(action, student, context)
                    actions_taken.append(result)

                AutomationRun.objects.create(
                    rule=rule,
                    slug=rule.slug,
                    student=student,
                    trigger_data={'trigger_type': trigger_type, **context},
                    actions_taken=actions_taken,
                    status='completed',
                )
            except Exception as exc:
                try:
                    AutomationRun.objects.create(
                        rule=rule,
                        slug=rule.slug,
                        student=student,
                        trigger_data={'trigger_type': trigger_type},
                        actions_taken=[f'error: {exc}'],
                        status='failed',
                    )
                except Exception:
                    pass
    except Exception:
        pass  # never let automation errors bubble up to the caller
