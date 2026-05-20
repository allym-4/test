"""
Non-destructive demo data seeder.

Creates realistic demo students, enrolments, occurrences, attendance and
payments layered on top of whatever already exists in the database.
All demo accounts use the prefix 'demo_' so they are easy to identify and
clean up with the --clear flag.

Usage:
    python manage.py seed_demo            # add demo data
    python manage.py seed_demo --clear    # remove all demo_ users and their data
"""
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.db.models.signals import post_save
from django.utils import timezone


DEMO_PREFIX = 'demo_'

STUDENTS = [
    ('jess',   'Jess',   'Malone',  'she/her',   '0412 111 001', 'Level 2'),
    ('tara',   'Tara',   'Bell',    'she/her',   '0412 111 002', 'Level 3'),
    ('dana',   'Dana',   'Park',    'she/they',  '0412 111 003', 'Level 2'),
    ('nina',   'Nina',   'Torres',  'she/her',   '0412 111 004', 'Level 1'),
    ('sophie', 'Sophie', 'Lawson',  'she/her',   '0412 111 005', 'Level 3'),
    ('alex',   'Alex',   'Kim',     'they/them', '0412 111 006', 'Level 2'),
    ('riley',  'Riley',  'Chen',    'she/her',   '0412 111 007', 'Level 1'),
    ('morgan', 'Morgan', 'Walsh',   'they/them', '0412 111 008', 'Level 2'),
]

DEMO_PASSWORD = 'demo1234'


class Command(BaseCommand):
    help = 'Seed the live database with demo students and activity data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Remove all demo_ accounts and their associated data',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self._clear()
            return
        self._seed()

    # ── Clear ─────────────────────────────────────────────────────────────

    def _clear(self):
        from apps.users.models import User
        demo_users = User.objects.filter(username__startswith=DEMO_PREFIX)
        count = demo_users.count()
        demo_users.delete()
        self.stdout.write(self.style.SUCCESS(f'Removed {count} demo account(s) and all related data.'))

    # ── Seed ──────────────────────────────────────────────────────────────

    def _seed(self):
        from apps.users.models import User, StudioSettings, Notification
        from apps.classes.models import Studio, ClassSession, ClassOccurrence, Season
        from apps.enrolments.models import Enrolment
        from apps.attendance.models import AttendanceRecord, MakeupCredit
        from apps.payments.models import Payment

        # Disconnect signals so we don't fire welcome emails / no-show fees
        try:
            from apps.users.signals import send_welcome_email, handle_no_show_fee, handle_payment_overdue
            from apps.enrolments.signals import handle_enrolment_change
            from apps.attendance.models import AttendanceRecord as AR
            from apps.payments.models import PaymentPlanInstalment as PPI
            post_save.disconnect(send_welcome_email, sender=User)
            post_save.disconnect(handle_enrolment_change, sender=Enrolment)
            post_save.disconnect(handle_no_show_fee, sender=AR)
            post_save.disconnect(handle_payment_overdue, sender=PPI)
        except Exception:
            pass

        today = date.today()

        # ── Studio settings ───────────────────────────────────────────────
        try:
            settings = StudioSettings.get()
            studio_name = settings.studio_name or 'the studio'
        except Exception:
            studio_name = 'the studio'

        # ── Instructor ────────────────────────────────────────────────────
        instructor = (
            User.objects.filter(role='instructor', is_active=True).first()
            or User.objects.filter(role='admin', is_active=True).first()
        )
        if not instructor:
            self.stderr.write('No instructor or admin account found — please create one first.')
            return

        # ── Demo students ─────────────────────────────────────────────────
        self.stdout.write('Creating demo students...')
        students = {}
        for slug, first, last, pronouns, phone, level in STUDENTS:
            username = f'{DEMO_PREFIX}{slug}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults=dict(
                    email=f'{username}@example.com',
                    first_name=first, last_name=last,
                    role='student', pronouns=pronouns,
                    phone=phone, level=level,
                ),
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            students[slug] = user
        self.stdout.write(f'  {len(students)} demo students ready')

        # ── Rooms ─────────────────────────────────────────────────────────
        rooms = list(Studio.objects.filter(is_active=True))
        if not rooms:
            self.stdout.write('No active rooms found — creating demo rooms...')
            rooms = [
                Studio.objects.create(name='Main Studio', poles='10'),
                Studio.objects.create(name='Studio B', poles='6'),
            ]
        room_a, room_b = rooms[0], rooms[-1]

        # ── Active season ─────────────────────────────────────────────────
        season = Season.objects.filter(status='active').order_by('-start_date').first()
        if not season:
            self.stdout.write('No active season found — creating one...')
            season_start = today.replace(day=1)
            season_end = (season_start + timedelta(days=92)).replace(day=1) - timedelta(days=1)
            season = Season.objects.create(
                name=f'Demo Season {today.year}',
                start_date=season_start,
                end_date=season_end,
                status='active',
            )
        self.stdout.write(f'  Using season: {season.name} ({season.start_date} – {season.end_date})')

        # ── Class sessions ────────────────────────────────────────────────
        # Re-use existing sessions for this season, or create demo ones
        existing = list(ClassSession.objects.filter(
            season=season, session_type='course', is_active=True,
        ).select_related('studio'))

        if existing:
            self.stdout.write(f'  Using {len(existing)} existing class session(s)')
            sessions_to_enrol = existing[:3]
        else:
            self.stdout.write('  No course sessions found for active season — creating demo sessions...')
            s1 = ClassSession.objects.create(
                name='Level 1', level='Level 1',
                instructor=instructor, studio=room_a,
                day_of_week=0, start_time=time(18, 0),
                duration_minutes=90, capacity=12,
                session_type='course', season=season,
            )
            s2 = ClassSession.objects.create(
                name='Level 2', level='Level 2',
                instructor=instructor, studio=room_b,
                day_of_week=2, start_time=time(18, 30),
                duration_minutes=90, capacity=12,
                session_type='course', season=season,
            )
            s3 = ClassSession.objects.create(
                name='Level 3', level='Level 3',
                instructor=instructor, studio=room_a,
                day_of_week=4, start_time=time(17, 30),
                duration_minutes=90, capacity=10,
                session_type='course', season=season,
            )
            sessions_to_enrol = [s1, s2, s3]

        # ── Occurrences ───────────────────────────────────────────────────
        self.stdout.write('Creating occurrences...')

        def next_weekday(weekday, from_date=None):
            base = from_date or today
            days_ahead = weekday - base.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return base + timedelta(days=days_ahead)

        def last_weekday(weekday):
            days_ago = today.weekday() - weekday
            if days_ago <= 0:
                days_ago += 7
            return today - timedelta(days=days_ago)

        all_occs = {}  # session_id -> {'past': [...], 'upcoming': [...]}

        for sess in sessions_to_enrol:
            dow = sess.day_of_week
            past_dates = [
                last_weekday(dow) - timedelta(weeks=3),
                last_weekday(dow) - timedelta(weeks=2),
                last_weekday(dow) - timedelta(weeks=1),
                last_weekday(dow),
            ]
            future_dates = [
                next_weekday(dow),
                next_weekday(dow) + timedelta(weeks=1),
                next_weekday(dow) + timedelta(weeks=2),
                next_weekday(dow) + timedelta(weeks=3),
            ]
            past_occs, future_occs = [], []
            for d in past_dates:
                if d >= season.start_date:
                    occ, _ = ClassOccurrence.objects.get_or_create(
                        session=sess, date=d,
                        defaults={'status': 'completed', 'register_saved': True},
                    )
                    past_occs.append(occ)
            for d in future_dates:
                if d <= season.end_date:
                    occ, _ = ClassOccurrence.objects.get_or_create(
                        session=sess, date=d,
                        defaults={'status': 'scheduled'},
                    )
                    future_occs.append(occ)
            all_occs[sess.id] = {'past': past_occs, 'upcoming': future_occs}

        # ── Enrolments ────────────────────────────────────────────────────
        self.stdout.write('Enrolling demo students...')

        # Map students to sessions (spread them across available sessions)
        enrol_map = {
            'jess':   [sessions_to_enrol[0]],
            'tara':   [sessions_to_enrol[0], sessions_to_enrol[min(1, len(sessions_to_enrol)-1)]],
            'dana':   [sessions_to_enrol[0]],
            'nina':   [sessions_to_enrol[min(1, len(sessions_to_enrol)-1)]],
            'sophie': [sessions_to_enrol[min(1, len(sessions_to_enrol)-1)], sessions_to_enrol[min(2, len(sessions_to_enrol)-1)]],
            'alex':   [sessions_to_enrol[min(2, len(sessions_to_enrol)-1)]],
            'riley':  [sessions_to_enrol[0]],
            'morgan': [sessions_to_enrol[min(1, len(sessions_to_enrol)-1)]],
        }

        for slug, sess_list in enrol_map.items():
            for sess in sess_list:
                Enrolment.objects.get_or_create(
                    student=students[slug],
                    class_session=sess,
                    defaults={'enrolment_type': 'course', 'status': 'active'},
                )

        # ── Attendance history ────────────────────────────────────────────
        self.stdout.write('Creating attendance history...')

        # Build a map of which students are enrolled in which sessions
        enrolled_by_session = {}
        for slug, sess_list in enrol_map.items():
            for sess in sess_list:
                enrolled_by_session.setdefault(sess.id, []).append(slug)

        for sess in sessions_to_enrol:
            past_occs = all_occs[sess.id]['past']
            enrolled = enrolled_by_session.get(sess.id, [])
            for occ in past_occs:
                for slug in enrolled:
                    AttendanceRecord.objects.get_or_create(
                        student=students[slug], occurrence=occ,
                        defaults={'status': 'present'},
                    )

        # A few realistic absences across students
        absences = [
            ('tara',   0),   # absent from first past session of their first session
            ('dana',   1),   # absent from second past session
            ('alex',   2),   # absent from third past session
            ('riley',  0),
        ]
        for slug, past_idx in absences:
            if slug not in students:
                continue
            for sess in enrol_map.get(slug, []):
                past_occs = all_occs[sess.id]['past']
                if past_idx < len(past_occs):
                    AttendanceRecord.objects.filter(
                        student=students[slug], occurrence=past_occs[past_idx],
                    ).update(status='absent')
                    MakeupCredit.objects.get_or_create(
                        student=students[slug],
                        reason=f'Absent — {sess.name} (demo)',
                        defaults={
                            'status': 'available',
                            'season': season,
                            'issued_by': instructor,
                        },
                    )
                    break

        # ── Payments ─────────────────────────────────────────────────────
        self.stdout.write('Creating payments...')
        try:
            season_price = float(StudioSettings.get().price_season or 270)
        except Exception:
            season_price = 270

        for slug, sess_list in enrol_map.items():
            student = students[slug]
            n = len(sess_list)
            amount = round(season_price * n * (0.85 if n > 1 else 1))
            label = ' + '.join(s.name for s in sess_list)
            if not Payment.objects.filter(student=student, description__icontains='demo season').exists():
                Payment.objects.create(
                    student=student,
                    payment_type='charge',
                    amount=amount,
                    description=f'Demo season fee — {label}',
                    created_by=instructor,
                )
                # Most students have paid; jess has partial balance owing
                if slug != 'jess':
                    Payment.objects.create(
                        student=student,
                        payment_type='payment',
                        amount=amount,
                        description='Payment received (demo)',
                        created_by=instructor,
                    )
                else:
                    Payment.objects.create(
                        student=student,
                        payment_type='payment',
                        amount=round(amount * 0.55),
                        description='Partial payment received (demo)',
                        created_by=instructor,
                    )

        # ── Notifications ─────────────────────────────────────────────────
        self.stdout.write('Creating notifications...')
        Notification.objects.get_or_create(
            recipient=students['jess'],
            title='Balance outstanding',
            defaults=dict(
                body=f'You have an outstanding balance — please arrange payment at your earliest convenience.',
                notification_type='billing',
                read=False,
            ),
        )
        Notification.objects.get_or_create(
            recipient=students['tara'],
            title='Catch-up credit added',
            defaults=dict(
                body='A catch-up credit has been added to your account for your recent absence.',
                notification_type='info',
                read=False,
            ),
        )

        self.stdout.write(self.style.SUCCESS(
            '\n✓ Demo data seeded!\n'
            f'  Password for all demo accounts: {DEMO_PASSWORD}\n'
            '  Accounts: ' + ', '.join(f'{DEMO_PREFIX}{s}' for s in list(students.keys())[:4]) + ', ...\n'
            '\n  To remove demo data later:\n'
            '    python manage.py seed_demo --clear\n'
        ))
