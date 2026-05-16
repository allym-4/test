from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


class Command(BaseCommand):
    help = 'Run all built-in daily automations: reengagement, welfare check-in, birthday, PAR-Q reminder'

    def handle(self, *args, **options):
        self._reengagement()
        self._welfare_checkin()
        self._birthday()
        self._parq_reminder()

    # ── 1. Re-engagement ────────────────────────────────────────────────────
    def _reengagement(self):
        from apps.users.models import AutomationRule, Notification, AutomationRun, User
        from apps.attendance.models import AttendanceRecord

        rule = AutomationRule.objects.filter(slug='reengagement').first()
        if rule and not rule.enabled:
            return

        cutoff = timezone.now() - timedelta(days=21)
        students = User.objects.filter(role='student', is_active=True)
        sent = 0
        for student in students:
            last_att = AttendanceRecord.objects.filter(
                student=student, status='present'
            ).order_by('-occurrence__date').first()

            if last_att and last_att.occurrence.date >= cutoff.date():
                continue  # attended recently

            # Don't re-send if we already sent one in the last 14 days
            already = Notification.objects.filter(
                recipient=student,
                title__icontains="We miss you",
                created_at__gte=timezone.now() - timedelta(days=14),
            ).exists()
            if already:
                continue

            Notification.objects.create(
                recipient=student,
                title='We miss you!',
                body="It's been a while since we've seen you in class. We'd love to have you back — book your next session anytime.",
                notification_type='info',
                action_label='Book a Class',
                action_url='/portal/book',
            )
            if student.email:
                send_mail(
                    subject="We miss you at Duality Pole Studio!",
                    message=(
                        f'Hi {student.first_name},\n\n'
                        f"It's been a while since we've seen you in class and we miss you!\n\n"
                        f'We\'d love to have you back. Log in anytime to book your next session.\n\n'
                        f'If there\'s anything we can do to help — whether it\'s scheduling, '
                        f'injuries, or anything else — just reply to this email.\n\n'
                        f'Hope to see you soon!\n'
                        f'The Duality Pole Studio team'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[student.email],
                    fail_silently=True,
                )
            if rule:
                AutomationRun.objects.create(
                    rule=rule, slug='reengagement', student=student,
                    trigger_data={'days_since_last_visit': '21+'},
                    actions_taken=['Sent re-engagement email + notification'],
                    status='completed',
                )
            sent += 1
        self.stdout.write(f'reengagement: {sent} sent')

    # ── 2. Welfare check-in ──────────────────────────────────────────────────
    def _welfare_checkin(self):
        from apps.users.models import AutomationRule, Notification, AutomationRun, User
        from apps.attendance.models import AttendanceRecord
        from apps.enrolments.models import Enrolment

        rule = AutomationRule.objects.filter(slug='welfare_checkin').first()
        if rule and not rule.enabled:
            return

        students = User.objects.filter(role='student', is_active=True)
        sent = 0
        for student in students:
            # Only check students with at least 4 scheduled classes
            enrolments = Enrolment.objects.filter(student=student, status='active')
            if not enrolments.exists():
                continue

            recent = AttendanceRecord.objects.filter(
                student=student,
            ).order_by('-occurrence__date')[:4]

            if len(recent) < 4:
                continue

            present_count = sum(1 for r in recent if r.status == 'present')
            if present_count >= 2:  # >= 50%
                continue

            already = Notification.objects.filter(
                recipient=student,
                title__icontains='checking in',
                created_at__gte=timezone.now() - timedelta(days=14),
            ).exists()
            if already:
                continue

            Notification.objects.create(
                recipient=student,
                title='Just checking in on you',
                body="We've noticed you've missed a few recent classes and wanted to check in. Is everything okay? Feel free to reach out if you need anything.",
                notification_type='info',
                action_label='Message Us',
                action_url='/portal/support',
            )
            if student.email:
                send_mail(
                    subject='Checking in — Duality Pole Studio',
                    message=(
                        f'Hi {student.first_name},\n\n'
                        f"We've noticed you've missed a few recent classes and just wanted to check in — "
                        f"is everything okay?\n\n"
                        f'If there\'s anything we can do to help, whether it\'s an injury, scheduling '
                        f'conflict, or anything else, please don\'t hesitate to reach out.\n\n'
                        f'We\'re here for you!\n'
                        f'The Duality Pole Studio team'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[student.email],
                    fail_silently=True,
                )
            if rule:
                AutomationRun.objects.create(
                    rule=rule, slug='welfare_checkin', student=student,
                    trigger_data={'present_of_last_4': present_count},
                    actions_taken=['Sent welfare check-in email + notification'],
                    status='completed',
                )
            sent += 1
        self.stdout.write(f'welfare_checkin: {sent} sent')

    # ── 3. Birthday ──────────────────────────────────────────────────────────
    def _birthday(self):
        from apps.users.models import AutomationRule, Notification, AutomationRun, User

        rule = AutomationRule.objects.filter(slug='birthday').first()
        if rule and not rule.enabled:
            return

        today = timezone.now().date()
        students = User.objects.filter(
            role='student',
            is_active=True,
            date_of_birth__month=today.month,
            date_of_birth__day=today.day,
        )
        sent = 0
        for student in students:
            already = Notification.objects.filter(
                recipient=student,
                title__icontains='Happy birthday',
                created_at__date=today,
            ).exists()
            if already:
                continue

            Notification.objects.create(
                recipient=student,
                title='Happy birthday! 🎂',
                body="Wishing you a wonderful birthday from all of us at Duality Pole Studio. Hope you have an amazing day!",
                notification_type='info',
            )
            if student.email:
                send_mail(
                    subject='Happy birthday from Duality Pole Studio! 🎂',
                    message=(
                        f'Hi {student.first_name},\n\n'
                        f'Happy birthday from all of us at Duality Pole Studio! 🎂\n\n'
                        f'We hope you have a wonderful day filled with joy.\n\n'
                        f'With love,\n'
                        f'The Duality Pole Studio team'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[student.email],
                    fail_silently=True,
                )
            if rule:
                AutomationRun.objects.create(
                    rule=rule, slug='birthday', student=student,
                    trigger_data={'date': str(today)},
                    actions_taken=['Sent birthday email + notification'],
                    status='completed',
                )
            sent += 1
        self.stdout.write(f'birthday: {sent} sent')

    # ── 4. PAR-Q reminder ────────────────────────────────────────────────────
    def _parq_reminder(self):
        from apps.users.models import AutomationRule, Notification, AutomationRun, StudentForm
        from apps.enrolments.models import Enrolment
        from apps.classes.models import ClassOccurrence

        rule = AutomationRule.objects.filter(slug='parq_reminder').first()
        if rule and not rule.enabled:
            return

        now = timezone.now()
        window_start = now + timedelta(hours=24)
        window_end = now + timedelta(hours=72)

        # Find trial enrolments whose next class occurrence is in 24-72 hours
        upcoming = ClassOccurrence.objects.filter(
            date__gte=window_start.date(),
            date__lte=window_end.date(),
        ).select_related('session')

        sent = 0
        seen_students = set()
        for occ in upcoming:
            trial_enrolments = Enrolment.objects.filter(
                class_session=occ.session,
                status='active',
                enrolment_type='trial',
            ).select_related('student')

            for enrolment in trial_enrolments:
                student = enrolment.student
                if student.id in seen_students:
                    continue

                has_parq = StudentForm.objects.filter(
                    student=student,
                    form_type='parq',
                    completed=True,
                ).exists()
                if has_parq:
                    continue

                already = Notification.objects.filter(
                    recipient=student,
                    title__icontains='health form',
                    created_at__gte=now - timedelta(days=3),
                ).exists()
                if already:
                    continue

                seen_students.add(student.id)
                Notification.objects.create(
                    recipient=student,
                    title='Please complete your health form',
                    body=f'Your trial class is coming up! Please complete your PAR-Q health questionnaire before attending.',
                    notification_type='reminder',
                    action_label='Complete Form',
                    action_url='/portal/forms',
                )
                if student.email:
                    send_mail(
                        subject='Please complete your health form before your class',
                        message=(
                            f'Hi {student.first_name},\n\n'
                            f'Your trial class is coming up soon! Before you attend, '
                            f'we ask all new students to complete a brief PAR-Q health questionnaire.\n\n'
                            f'Please log in to your account and complete the form under "Forms" '
                            f'before your class.\n\n'
                            f'See you soon!\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )
                if rule:
                    AutomationRun.objects.create(
                        rule=rule, slug='parq_reminder', student=student,
                        trigger_data={'occurrence_date': str(occ.date)},
                        actions_taken=['Sent PAR-Q reminder email + notification'],
                        status='completed',
                    )
                sent += 1
        self.stdout.write(f'parq_reminder: {sent} sent')
