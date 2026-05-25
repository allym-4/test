"""
Week-4 level restriction review reminder.

Sends an in-app notification to all admin/staff users when the active season
reaches week 4, listing students who have a max_booking_level or blocked_sessions
set — a prompt to review whether those restrictions still apply.

Run from run_daily_tasks or as a standalone cron:
    python manage.py send_level_restriction_review
"""
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Send week-4 level-restriction review reminder to admins'

    def handle(self, *args, **options):
        from apps.classes.models import Season
        from apps.users.models import User, Notification

        today = timezone.localdate()

        active_season = Season.objects.filter(status='active').order_by('-start_date').first()
        if not active_season or not active_season.start_date:
            self.stdout.write('No active season found — skipping.')
            return

        week_number = (today - active_season.start_date).days // 7 + 1
        if week_number != 4:
            self.stdout.write(f'Week {week_number} of season — review reminder only fires in week 4.')
            return

        # Avoid duplicate notifications in the same week
        already_sent = Notification.objects.filter(
            notification_type='info',
            title__startswith='Level restriction review',
            created_at__date__gte=active_season.start_date + datetime.timedelta(weeks=3),
        ).exists()
        if already_sent:
            self.stdout.write('Review reminder already sent this week — skipping.')
            return

        restricted_students = User.objects.filter(
            role='student',
            is_active=True,
        ).filter(
            models_Q_max_or_blocked()
        ).distinct().order_by('first_name', 'last_name')

        if not restricted_students.exists():
            self.stdout.write('No students with level restrictions — skipping notification.')
            return

        names = ', '.join(
            s.get_full_name() or s.username for s in restricted_students[:10]
        )
        more = restricted_students.count() - 10
        if more > 0:
            names += f' and {more} more'

        body = (
            f"It's week 4 of {active_season.name} — a good time to check in on students "
            f"with level restrictions and see if any updates are needed.\n\n"
            f"Students with active restrictions ({restricted_students.count()}): {names}.\n\n"
            f"Visit each student's profile to update or remove their max booking level."
        )

        admins = User.objects.filter(role__in=('admin', 'staff'), is_active=True)
        notifications = [
            Notification(
                recipient=admin,
                title=f'Level restriction review — {active_season.name} week 4',
                body=body,
                notification_type='info',
                action_label='View Students',
                action_url='/admin/students?level_restricted=true',
            )
            for admin in admins
        ]
        Notification.objects.bulk_create(notifications)
        self.stdout.write(
            f'Sent level restriction review reminder to {len(notifications)} admin(s). '
            f'{restricted_students.count()} student(s) listed.'
        )


def models_Q_max_or_blocked():
    from django.db.models import Q
    return Q(max_booking_level__gt='') | Q(blocked_sessions__isnull=False)
