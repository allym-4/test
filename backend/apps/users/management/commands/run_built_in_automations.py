from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


class Command(BaseCommand):
    help = 'Run all built-in daily automations: reengagement, welfare check-in, birthday, PAR-Q reminder, plus custom rules'

    def handle(self, *args, **options):
        self._reengagement()
        self._welfare_checkin()
        self._birthday()
        self._parq_reminder()
        self._custom_rules()
        self._seasonal_checkin()
        self._exemption_expiry_warning()

    def _seasonal_checkin(self):
        from django.core import management
        try:
            management.call_command('send_seasonal_checkin', verbosity=0)
            self.stdout.write('seasonal_checkin: done')
        except Exception as exc:
            self.stdout.write(f'seasonal_checkin: error — {exc}')

    def _interpolate(self, text, student, extra=None):
        ctx = {
            'first_name': student.first_name or '',
            'last_name': student.last_name or '',
            'full_name': student.get_full_name() or '',
            'studio_name': 'Duality Pole Studio',
        }
        if extra:
            ctx.update(extra)
        for k, v in ctx.items():
            text = text.replace(f'{{{{{k}}}}}', str(v))
        return text

    # ── 1. Re-engagement ────────────────────────────────────────────────────
    def _reengagement(self):
        from apps.users.models import AutomationRule, Notification, AutomationRun, User
        from apps.attendance.models import AttendanceRecord

        rule = AutomationRule.objects.filter(slug='reengagement').first()
        if rule and not rule.enabled:
            return

        timing = rule.timing if rule else {}
        days_threshold = timing.get('days_threshold', 21)
        cooldown_days = timing.get('cooldown_days', 14)

        cutoff = timezone.now() - timedelta(days=days_threshold)
        students = User.objects.filter(role='student', is_active=True)
        sent = 0
        for student in students:
            last_att = AttendanceRecord.objects.filter(
                student=student, status='present'
            ).order_by('-occurrence__date').first()

            if last_att and last_att.occurrence.date >= cutoff.date():
                continue  # attended recently

            # Don't re-send if we already sent one in the cooldown window
            already = Notification.objects.filter(
                recipient=student,
                title__icontains="We miss you",
                created_at__gte=timezone.now() - timedelta(days=cooldown_days),
            ).exists()
            if already:
                continue

            Notification.objects.create(
                recipient=student,
                title='We miss you!',
                body=self._interpolate(
                    "It's been a while since we've seen you in class. We'd love to have you back — book your next session anytime.",
                    student,
                ),
                notification_type='info',
                action_label='Book a Class',
                action_url='/portal/book',
            )
            if student.email:
                send_mail(
                    subject=self._interpolate("We miss you at Duality Pole Studio!", student),
                    message=self._interpolate(
                        'Hi {{first_name}},\n\n'
                        "It's been a while since we've seen you in class and we miss you!\n\n"
                        "We'd love to have you back. Log in anytime to book your next session.\n\n"
                        "If there's anything we can do to help — whether it's scheduling, "
                        "injuries, or anything else — just reply to this email.\n\n"
                        'Hope to see you soon!\n'
                        'The Duality Pole Studio team',
                        student,
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[student.email],
                    fail_silently=True,
                )
            if rule:
                AutomationRun.objects.create(
                    rule=rule, slug='reengagement', student=student,
                    trigger_data={'days_since_last_visit': f'{days_threshold}+'},
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

        timing = rule.timing if rule else {}
        cooldown_days = timing.get('cooldown_days', 14)
        min_present_of_4 = timing.get('min_present_of_4', 2)

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
            if present_count >= min_present_of_4:
                continue

            already = Notification.objects.filter(
                recipient=student,
                title__icontains='checking in',
                created_at__gte=timezone.now() - timedelta(days=cooldown_days),
            ).exists()
            if already:
                continue

            Notification.objects.create(
                recipient=student,
                title='Just checking in on you',
                body=self._interpolate(
                    "We've noticed you've missed a few recent classes and wanted to check in. Is everything okay? Feel free to reach out if you need anything.",
                    student,
                ),
                notification_type='info',
                action_label='Message Us',
                action_url='/portal/support',
            )
            if student.email:
                send_mail(
                    subject=self._interpolate('Checking in — Duality Pole Studio', student),
                    message=self._interpolate(
                        'Hi {{first_name}},\n\n'
                        "We've noticed you've missed a few recent classes and just wanted to check in — "
                        "is everything okay?\n\n"
                        "If there's anything we can do to help, whether it's an injury, scheduling "
                        "conflict, or anything else, please don't hesitate to reach out.\n\n"
                        "We're here for you!\n"
                        'The Duality Pole Studio team',
                        student,
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
                body=self._interpolate(
                    "Wishing you a wonderful birthday from all of us at Duality Pole Studio. Hope you have an amazing day!",
                    student,
                ),
                notification_type='info',
            )
            if student.email:
                send_mail(
                    subject=self._interpolate('Happy birthday from Duality Pole Studio! 🎂', student),
                    message=self._interpolate(
                        'Hi {{first_name}},\n\n'
                        'Happy birthday from all of us at Duality Pole Studio! 🎂\n\n'
                        'We hope you have a wonderful day filled with joy.\n\n'
                        'With love,\n'
                        'The Duality Pole Studio team',
                        student,
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

        timing = rule.timing if rule else {}
        advance_hours = timing.get('advance_hours', 48)
        window_hours = timing.get('window_hours', 72)

        now = timezone.now()
        window_start = now + timedelta(hours=advance_hours)
        window_end = now + timedelta(hours=window_hours)

        # Find trial enrolments whose next class occurrence is in the window
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
                    body=self._interpolate(
                        'Your trial class is coming up! Please complete your PAR-Q health questionnaire before attending.',
                        student,
                    ),
                    notification_type='reminder',
                    action_label='Complete Form',
                    action_url='/portal/forms',
                )
                if student.email:
                    send_mail(
                        subject=self._interpolate(
                            'Please complete your health form before your class',
                            student,
                        ),
                        message=self._interpolate(
                            'Hi {{first_name}},\n\n'
                            'Your trial class is coming up soon! Before you attend, '
                            'we ask all new students to complete a brief PAR-Q health questionnaire.\n\n'
                            'Please log in to your account and complete the form under "Forms" '
                            'before your class.\n\n'
                            'See you soon!\n'
                            'Duality Pole Studio',
                            student,
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

    # ── 5. Custom rules ──────────────────────────────────────────────────────
    def _custom_rules(self):
        """
        Execute custom AutomationRules created via the admin UI.
        Trigger types supported: student_created, payment_overdue.
        (Event-based triggers like enrolment_active fire at the point of the event
        via signals — only scheduled/daily triggers are handled here.)
        """
        from apps.users.models import AutomationRule, AutomationRun, User, Notification, Tag, StudentTag
        from apps.payments.models import Payment
        from django.db.models import Sum

        rules = AutomationRule.objects.filter(is_custom=True, enabled=True)
        if not rules.exists():
            return

        processed = 0
        for rule in rules:
            trigger = rule.trigger_type

            if trigger == 'payment_overdue':
                # Find students whose balance is negative (money owed)
                students = User.objects.filter(role='student', is_active=True)
                for student in students:
                    credit_types = ('payment', 'refund', 'credit')
                    debit_types = ('charge', 'no_show_fee')
                    total_paid = Payment.objects.filter(
                        student=student, payment_type__in=credit_types
                    ).aggregate(t=Sum('amount'))['t'] or 0
                    total_charged = Payment.objects.filter(
                        student=student, payment_type__in=debit_types
                    ).aggregate(t=Sum('amount'))['t'] or 0
                    balance = float(total_paid) - float(total_charged)
                    if balance >= 0:
                        continue

                    # Check conditions
                    if not self._check_conditions(rule.conditions, student):
                        continue

                    # Don't re-run within 7 days
                    already = AutomationRun.objects.filter(
                        rule=rule, student=student,
                        created_at__gte=timezone.now() - timedelta(days=7),
                    ).exists()
                    if already:
                        continue

                    self._execute_actions(rule, student, {'balance': balance})
                    processed += 1

            elif trigger == 'student_created':
                # Find students created in the last 24 hours
                cutoff = timezone.now() - timedelta(hours=24)
                students = User.objects.filter(role='student', is_active=True, date_joined__gte=cutoff)
                for student in students:
                    if not self._check_conditions(rule.conditions, student):
                        continue
                    already = AutomationRun.objects.filter(rule=rule, student=student).exists()
                    if already:
                        continue
                    self._execute_actions(rule, student, {})
                    processed += 1

        self.stdout.write(f'custom_rules: {processed} actions taken')

    def _check_conditions(self, conditions, student):
        """Return True if student passes all conditions (AND logic)."""
        from apps.users.models import StudentTag
        for cond in conditions:
            cond_type = cond.get('type')
            value = cond.get('value', '')
            if cond_type == 'has_tag':
                has = StudentTag.objects.filter(student=student, tag__name__iexact=value).exists()
                if not has:
                    return False
            elif cond_type == 'class_level':
                from apps.enrolments.models import Enrolment
                enrolled = Enrolment.objects.filter(
                    student=student, status='active',
                    class_session__name__icontains=value,
                ).exists()
                if not enrolled:
                    return False
        return True

    def _execute_actions(self, rule, student, trigger_data):
        """Execute each action in the rule and record a run."""
        from apps.users.models import AutomationRun, Notification, Tag, StudentTag
        actions_taken = []
        for action in rule.actions:
            action_type = action.get('type')
            if action_type == 'send_notification':
                title = self._interpolate(action.get('title', rule.name), student)
                body = self._interpolate(action.get('body', ''), student)
                Notification.objects.create(
                    recipient=student,
                    title=title,
                    body=body,
                    notification_type='info',
                )
                actions_taken.append(f'Sent notification: {title}')
            elif action_type == 'send_email':
                if student.email:
                    subject = self._interpolate(action.get('subject', rule.name), student)
                    body = self._interpolate(action.get('body', ''), student)
                    send_mail(
                        subject=subject,
                        message=body,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )
                    actions_taken.append(f'Sent email: {subject}')
            elif action_type == 'add_tag':
                tag_name = action.get('tag', '')
                if tag_name:
                    tag, _ = Tag.objects.get_or_create(name=tag_name)
                    StudentTag.objects.get_or_create(student=student, tag=tag)
                    actions_taken.append(f'Added tag: {tag_name}')

        AutomationRun.objects.create(
            rule=rule,
            slug=rule.slug,
            student=student,
            trigger_data=trigger_data,
            actions_taken=actions_taken,
            status='completed',
        )

    def _exemption_expiry_warning(self):
        from apps.payments.models import BalanceExemption
        from apps.users.models import Notification, User
        from django.utils import timezone
        today = timezone.localdate()
        warning_date = today + timedelta(days=2)
        # Find exemptions expiring in exactly 2 days that haven't been warned
        expiring = BalanceExemption.objects.filter(end_date=warning_date, is_active=True)
        sent = 0
        for ex in expiring:
            admins = User.objects.filter(role='admin', is_active=True)
            for admin in admins:
                already = Notification.objects.filter(
                    recipient=admin,
                    title__icontains='exemption expiring',
                    body__icontains=ex.student.display_name,
                    created_at__date=today,
                ).exists()
                if not already:
                    Notification.objects.create(
                        recipient=admin,
                        title='Balance exemption expiring soon',
                        body=f'{ex.student.display_name}\'s balance exemption expires in 2 days ({ex.end_date}). Extend or they will be blocked from booking.',
                        notification_type='alert',
                        action_url=f'/admin/students/{ex.student_id}',
                    )
                    sent += 1
        self.stdout.write(f'exemption_expiry_warning: {sent} sent')
