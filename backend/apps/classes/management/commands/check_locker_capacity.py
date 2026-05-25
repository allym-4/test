from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


TOTAL_LOCKERS = 36


class Command(BaseCommand):
    help = 'Monday of week 8: check if free-locker-eligible students for next season will crowd out paying locker holders. Flags admin and pauses carry-over if so.'

    def handle(self, *args, **options):
        from apps.users.models import Notification, StudioSettings
        from apps.classes.models import Locker, Season
        from apps.enrolments.models import Enrolment
        from django.db.models import Count
        from apps.users.models import User

        settings_obj = StudioSettings.get()
        today = timezone.now().date()

        active_season = Season.objects.filter(status='active').first()
        next_season = Season.objects.filter(status='upcoming').order_by('start_date').first()

        if not active_season or not next_season:
            self.stdout.write('Need both an active and upcoming season to run capacity check.')
            return

        # Only run on Monday of week 8 (last 7 days of active season)
        season_end = active_season.end_date
        week8_monday = season_end - timedelta(days=6)
        # Allow running any day this week (idempotent — will skip if already paused)
        if not (week8_monday <= today <= season_end):
            self.stdout.write(f'Not in week 8 of {active_season.name}. Skipping capacity check.')
            return

        # Count students with 4+ enrolments in next season (free locker eligible)
        qualifying_qs = (
            Enrolment.objects
            .filter(class_session__season=next_season, status='active')
            .values('student_id')
            .annotate(count=Count('id'))
            .filter(count__gte=4)
        )
        free_eligible_ids = {q['student_id'] for q in qualifying_qs}
        free_eligible_count = len(free_eligible_ids)

        # Count current paying locker holders who are NOT free-eligible for next season
        paying_lockers = Locker.objects.filter(
            assigned_to__isnull=False,
            locker_type='paid',
            expires_at=season_end,
            status='active',
        ).select_related('assigned_to')
        paying_holder_count = paying_lockers.count()

        # Count free-locker-eligible students who currently have (or want) a locker
        # (those already with lockers who'll get free carry-over)
        free_with_locker = Locker.objects.filter(
            assigned_to_id__in=free_eligible_ids,
            expires_at=season_end,
            status='active',
        ).count()

        # Worst-case next season usage: all free eligible + all paying = total demand
        total_demand = free_eligible_count + paying_holder_count

        self.stdout.write(
            f'Capacity check for {next_season.name}:\n'
            f'  Total lockers: {TOTAL_LOCKERS}\n'
            f'  Free-eligible students (4+ classes): {free_eligible_count}\n'
            f'  Paying locker holders: {paying_holder_count}\n'
            f'  Total demand: {total_demand}\n'
        )

        if free_eligible_count >= TOTAL_LOCKERS or total_demand > TOTAL_LOCKERS:
            # Problem! Not enough room for everyone
            shortfall = total_demand - TOTAL_LOCKERS
            message = (
                f'Locker capacity issue for {next_season.name}: '
                f'{free_eligible_count} students are eligible for free lockers (4+ classes enrolled) '
                f'and {paying_holder_count} students currently have paid lockers — '
                f'total demand ({total_demand}) exceeds capacity ({TOTAL_LOCKERS}) by {max(0, shortfall)} lockers. '
                f'Carry-over emails have been PAUSED. Please review locker allocations before proceeding.'
            )
            # Pause carry-over automation
            settings_obj.locker_carry_over_paused = True
            settings_obj.save(update_fields=['locker_carry_over_paused'])

            # Notify all admins
            admins = User.objects.filter(role='admin', is_active=True)
            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    title='Locker capacity issue — carry-over paused',
                    body=message,
                    notification_type='warning',
                    action_url='/admin/lockers',
                )

            self.stdout.write(self.style.WARNING(
                f'CAPACITY ISSUE: demand {total_demand} > capacity {TOTAL_LOCKERS}. '
                f'Carry-over paused. {len(admins)} admins notified.'
            ))
        else:
            # All clear — ensure carry-over is not paused
            if settings_obj.locker_carry_over_paused:
                settings_obj.locker_carry_over_paused = False
                settings_obj.save(update_fields=['locker_carry_over_paused'])
                self.stdout.write('Carry-over was paused but capacity is now OK — unpaused.')
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'All clear: {total_demand} demand vs {TOTAL_LOCKERS} capacity. No issues.'
                ))
