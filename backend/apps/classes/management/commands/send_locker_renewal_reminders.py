from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


class Command(BaseCommand):
    help = 'Week 8 Wednesday: send locker renewal reminders. Students with 4+ classes in next season get a carry-over confirmation; others get a renewal prompt.'

    def handle(self, *args, **options):
        from apps.users.models import AutomationRule, Notification, StudioSettings
        from apps.classes.models import Locker, Season
        from apps.enrolments.models import Enrolment

        rule = AutomationRule.objects.filter(slug='locker_renewal_reminder').first()
        if rule and not rule.enabled:
            self.stdout.write('Locker renewal reminder automation is disabled.')
            return

        settings_obj = StudioSettings.get()
        if settings_obj.locker_carry_over_paused:
            self.stdout.write('Locker carry-over is paused (capacity issue flagged). No emails sent.')
            return

        today = timezone.now().date()

        # Find active season and upcoming season
        active_season = Season.objects.filter(status='active').first()
        next_season = Season.objects.filter(status='upcoming').order_by('start_date').first()

        if not active_season:
            self.stdout.write('No active season found.')
            return

        # Only run during week 8 of active season (last 7 days)
        season_end = active_season.end_date
        week8_start = season_end - timedelta(days=6)
        if not (week8_start <= today <= season_end):
            self.stdout.write(f'Not in week 8 of {active_season.name} (week 8: {week8_start}–{season_end}). No emails sent.')
            return

        # Find all active lockers expiring with this season
        lockers = Locker.objects.filter(
            assigned_to__isnull=False,
            expires_at=season_end,
            status='active',
        ).select_related('assigned_to')

        if not lockers.exists():
            self.stdout.write('No lockers expiring at end of this season.')
            return

        # Build set of students with 4+ enrolments in next season (get free locker)
        free_eligible_student_ids = set()
        if next_season:
            from django.db.models import Count
            qualifying = (
                Enrolment.objects
                .filter(class_session__season=next_season, status='active')
                .values('student_id')
                .annotate(count=Count('id'))
                .filter(count__gte=4)
            )
            free_eligible_student_ids = {q['student_id'] for q in qualifying}

        sent_free = 0
        sent_renewal = 0

        for locker in lockers:
            student = locker.assigned_to
            if not student.email:
                continue

            already_notified = Notification.objects.filter(
                recipient=student,
                title__icontains='locker',
                created_at__date=today,
            ).exists()
            if already_notified:
                continue

            next_season_name = next_season.name if next_season else 'next season'
            expires_str = season_end.strftime('%-d %B %Y')

            if student.id in free_eligible_student_ids:
                # Student gets free locker — send carry-over confirmation
                Notification.objects.create(
                    recipient=student,
                    title='Your locker is covered next season!',
                    body=f'Great news — because you\'re enrolled in 4+ classes for {next_season_name}, your locker (#{locker.number}) is automatically carried over. No action needed!',
                    notification_type='reminder',
                )
                if student.email:
                    send_mail(
                        subject=f'Your locker is covered for {next_season_name} — Duality Pole Studio',
                        message=(
                            f'Hi {student.first_name},\n\n'
                            f'Great news! Because you\'re enrolled in 4 or more classes for {next_season_name}, '
                            f'your locker (#{locker.number}) is automatically carried over — no action or payment needed.\n\n'
                            f'Your locker will be ready to go from the start of {next_season_name}.\n\n'
                            f'See you in class!\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )
                sent_free += 1
            else:
                # Student needs to renew — send renewal prompt
                Notification.objects.create(
                    recipient=student,
                    title='Locker renewal — action needed',
                    body=f'Your locker (#{locker.number}) expires on {expires_str}. To keep it for {next_season_name}, please contact reception to renew ($50/season). Enrol in 4+ classes and it\'s covered automatically!',
                    notification_type='reminder',
                    action_label='Contact Us',
                    action_url='/portal/support',
                )
                if student.email:
                    send_mail(
                        subject=f'Locker renewal for {next_season_name} — Duality Pole Studio',
                        message=(
                            f'Hi {student.first_name},\n\n'
                            f'Your locker (#{locker.number}) expires on {expires_str} at the end of {active_season.name}.\n\n'
                            f'To keep your locker for {next_season_name}, please contact reception to renew ($50 for the season).\n\n'
                            f'Did you know? If you enrol in 4 or more classes for {next_season_name}, your locker is included automatically at no extra cost!\n\n'
                            f'Contact us at intrigued@dualitypole.com or (02) 9160 0223.\n\n'
                            f'See you in class!\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )
                sent_renewal += 1

        self.stdout.write(
            f'Sent {sent_free} carry-over confirmations and {sent_renewal} renewal reminders.'
        )
