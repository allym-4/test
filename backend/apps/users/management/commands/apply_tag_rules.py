from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Apply and remove auto-rule tags for all students'

    def handle(self, *args, **options):
        from apps.users.models import Tag, StudentTag, User
        from apps.classes.models import Season, ClassSession
        from apps.enrolments.models import Enrolment
        from django.db.models import Count

        # Get all active (non-manual) tags with a rule_type
        auto_tags = Tag.objects.filter(is_manual=False).exclude(rule_type='')
        if not auto_tags.exists():
            self.stdout.write('No auto-rule tags configured.')
            return

        students = User.objects.filter(role='student', is_active=True)

        # Resolve seasons once
        seasons = list(Season.objects.order_by('-start_date'))
        current_season = next((s for s in seasons if s.status == 'active'), None)
        previous_season = seasons[1] if len(seasons) > 1 else None
        season_2_ago = seasons[2] if len(seasons) > 2 else None
        season_3_ago = seasons[3] if len(seasons) > 3 else None

        for tag in auto_tags:
            self.stdout.write(f'Processing tag: {tag.name} ({tag.rule_type})')
            qualifying_student_ids = set()

            for student in students:
                if self._matches(student, tag, current_season, previous_season, season_2_ago, season_3_ago):
                    qualifying_student_ids.add(student.id)

            # Assign to qualifying students who don't have the tag
            existing_ids = set(StudentTag.objects.filter(tag=tag).values_list('student_id', flat=True))
            to_add = qualifying_student_ids - existing_ids
            to_remove = existing_ids - qualifying_student_ids

            StudentTag.objects.bulk_create([
                StudentTag(student_id=sid, tag=tag) for sid in to_add
            ], ignore_conflicts=True)
            StudentTag.objects.filter(tag=tag, student_id__in=to_remove).delete()

            self.stdout.write(f'  +{len(to_add)} added, -{len(to_remove)} removed')

    def _matches(self, student, tag, current_season, previous_season, season_2_ago, season_3_ago):
        from apps.enrolments.models import Enrolment
        from apps.classes.models import CasualBooking, Locker

        rt = tag.rule_type
        params = tag.rule_params or {}

        def enrolments_in(season, types=('course',)):
            if not season:
                return Enrolment.objects.none()
            return Enrolment.objects.filter(
                student=student,
                class_session__season=season,
                enrolment_type__in=types,
                status='active',
            )

        if rt == 'active_enrolment':
            return enrolments_in(current_season).exists()

        elif rt == 'first_timer':
            if not current_season:
                return False
            # First enrolment ever is in the current season
            has_current = enrolments_in(current_season).exists()
            has_prior = Enrolment.objects.filter(
                student=student,
                enrolment_type='course',
                status__in=('active', 'completed'),
            ).exclude(class_session__season=current_season).exists()
            return has_current and not has_prior

        elif rt == 'enrolled_in_class':
            class_name = params.get('class_name', '')
            season_param = params.get('season', 'current')
            if season_param == 'current':
                season = current_season
            elif season_param == 'previous':
                season = previous_season
            else:
                season = current_season  # default
            if not season or not class_name:
                return False
            return enrolments_in(season).filter(
                class_session__name__icontains=class_name
            ).exists()

        elif rt == 'three_plus_classes':
            return enrolments_in(current_season).count() >= 3

        elif rt == 'lapsed_1':
            # Not enrolled this season, but was enrolled last season
            return (
                not enrolments_in(current_season).exists()
                and enrolments_in(previous_season).exists()
            )

        elif rt == 'lapsed_2':
            # Not enrolled this season or last season, but enrolled 2 seasons ago
            return (
                not enrolments_in(current_season).exists()
                and not enrolments_in(previous_season).exists()
                and enrolments_in(season_2_ago).exists()
            )

        elif rt == 'lapsed_3_plus':
            # Not enrolled in last 3 seasons, but has some enrolment history
            return (
                not enrolments_in(current_season).exists()
                and not enrolments_in(previous_season).exists()
                and not enrolments_in(season_2_ago).exists()
                and Enrolment.objects.filter(
                    student=student, enrolment_type='course', status__in=('active', 'completed')
                ).exists()
            )

        elif rt == 'casual_only':
            if not current_season:
                return False
            has_casual = CasualBooking.objects.filter(
                student=student,
                occurrence__session__season=current_season,
                status='confirmed',
            ).exists()
            has_course = enrolments_in(current_season).exists()
            return has_casual and not has_course

        elif rt == 'trial_not_converted':
            has_trial = Enrolment.objects.filter(
                student=student, enrolment_type='trial'
            ).exists()
            has_course = Enrolment.objects.filter(
                student=student, enrolment_type='course', status__in=('active', 'completed')
            ).exists()
            return has_trial and not has_course

        elif rt == 'has_locker':
            return Locker.objects.filter(
                student=student, status='active'
            ).exists()

        elif rt == 'level':
            level_param = params.get('level', '')
            if not current_season:
                return False
            if level_param == 'supplementary':
                # Enrolled in current season but NOT in any Level class
                has_any = enrolments_in(current_season).exists()
                has_level = enrolments_in(current_season).filter(
                    class_session__name__iregex=r'level\s*[1-6]'
                ).exists()
                return has_any and not has_level
            else:
                # Enrolled in a Level N class
                return enrolments_in(current_season).filter(
                    class_session__name__iregex=rf'level\s*{level_param}'
                ).exists()

        return False
