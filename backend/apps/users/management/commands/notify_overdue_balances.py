from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Send configurable overdue balance reminder notifications/emails'

    def handle(self, *args, **options):
        from django.db.models import Sum
        from django.core.mail import send_mail
        from django.conf import settings as django_settings
        from apps.users.models import User, Notification, StudioSettings
        from apps.payments.models import Payment

        studio = StudioSettings.get()
        schedule = studio.overdue_reminder_schedule or []

        if not schedule:
            self.stdout.write('No overdue reminder schedule configured — skipping.')
            return

        today = timezone.now().date()
        students = User.objects.filter(role='student', is_active=True)
        notified = 0

        for student in students:
            total_paid = Payment.objects.filter(
                student=student,
                payment_type__in=['payment', 'refund', 'credit'],
            ).aggregate(total=Sum('amount'))['total'] or 0

            total_owed = Payment.objects.filter(
                student=student,
                payment_type__in=['charge', 'no_show_fee'],
            ).aggregate(total=Sum('amount'))['total'] or 0

            balance = float(total_paid) - float(total_owed)
            if balance >= 0:
                continue

            past_reminders = Notification.objects.filter(
                recipient=student,
                title='Outstanding balance reminder',
            ).order_by('created_at')

            count = past_reminders.count()
            if count >= len(schedule):
                continue

            step = schedule[count]
            days_to_wait = int(step.get('days', 7))
            send_email_flag = bool(step.get('send_email', False))

            if count == 0:
                last_charge = Payment.objects.filter(
                    student=student,
                    payment_type__in=['charge', 'no_show_fee'],
                ).order_by('-created_at').first()
                if not last_charge:
                    continue
                days_elapsed = (today - last_charge.created_at.date()).days
            else:
                last_reminder = past_reminders.last()
                days_elapsed = (today - last_reminder.created_at.date()).days

            if days_elapsed < days_to_wait:
                continue

            reminder_num = count + 1
            body_text = (
                f'Reminder {reminder_num}: you have an outstanding balance of ${abs(balance):.2f}. '
                f'Please contact the studio to arrange payment.'
            )

            Notification.objects.create(
                recipient=student,
                title='Outstanding balance reminder',
                body=body_text,
                notification_type='billing',
            )

            if send_email_flag and student.email:
                try:
                    send_mail(
                        subject='Outstanding balance — Duality Pole Studio',
                        message=(
                            f'Hi {student.first_name or student.display_name},\n\n'
                            f'{body_text}\n\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=django_settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass

            notified += 1

        self.stdout.write(f'Sent {notified} overdue balance reminder(s).')
