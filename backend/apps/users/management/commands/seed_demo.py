"""
Non-destructive demo data seeder for Duality Pole Studio.

Uses the real Season 3 timetable, actual room names, real class names
and live pricing.  All demo accounts use the prefix 'demo_' and can be
removed cleanly with --clear.

Usage:
    python manage.py seed_demo            # add demo data
    python manage.py seed_demo --clear    # remove all demo_ accounts + data
"""
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.db.models.signals import post_save
from django.utils import timezone


DEMO_PREFIX = 'demo_'
DEMO_PASSWORD = 'demo1234'

# ── Season 3 ──────────────────────────────────────────────────────────────────
SEASON_NAME  = 'Season 3'
SEASON_START = date(2026, 5, 11)
SEASON_END   = date(2026, 7,  5)

# ── Pricing (from live pricing page) ─────────────────────────────────────────
SEASON_PRICES = {1: 270, 2: 440, 3: 580, 4: 700, 5: 800, 6: 900}
PRICE_CASUAL  = 40
PRICE_TRIAL   = 35  # deducted from season fee if student enrols

# ── Instructors (first name → tagline/nickname) ───────────────────────────────
INSTRUCTORS = {
    'mimi':    ('Mimi',   '',         'Co-Founder & Unleashing Force'),
    'chloe':   ('Chloe',  '',         'Co-Founder & Senior Powerhouse'),
    'avalon':  ('Avalon', '',         'The Playful Heart'),
    'maz':     ('Maz',    '',         'The Technical Trickler'),
    'jaz':     ('Jaz',    '',         'The Cheeky Catalyst'),
    'peaches': ('Peaches','',         'The Electric Performer'),
    'viv':     ('Viv',    '',         'The Spicy Charmer'),
    'violet':  ('Violet', '',         'The Precision Driver'),
    'bambi':   ('Bambi',  '',         'The Tiny Dynamo'),
    'amy':     ('Amy',    '',         'The Evolving Muse'),
}

# ── First-timer class info ────────────────────────────────────────────────────
# Keyed by session name — applied to matching sessions on creation.
FIRST_TIMER_INFO = {
    'Level 1': (
        'New to pole? Start here.',
        "Here is spin, but we make it our beginner's pole fitness course. "
        "It's here where you'll learn lady things. A 90-minute class of spins "
        "on the pole, four-week-end-choreography course. All designed to build "
        "strength and tap into your sensuality.",
    ),
    'Strip Virgin': (
        'From a cool new through Level 2.',
        "Flow around the pole and floor with sensual choreography, learning "
        "threads and transitions at a slower pace. Perfect if you're brand new "
        "or want to ease in.",
    ),
    'Chair Virgin': (
        'New to chair or under Level 2? Join us.',
        'Here to learn the art of chair and lap dancing with a focus on '
        'confidence and ease.',
    ),
    'Floor Virgin': (
        'First time on the floor?',
        "We'll keep the pace slower and teach you some bad while you learn "
        'funky grips, transitions, and a fresh routine each week.',
    ),
    'Dance Virgin': (
        'First time dancing with us?',
        "We'll keep the pace slower and teach you some bop while you learn "
        'funky grips, transitions, and a fresh routine each week.',
    ),
    'Kiki': (
        'Want to Kiki?',
        "With a focus on both conditioning and flexibility, you'll work those "
        'gorgeous muscles of yours before stretching it out, working towards '
        'full body flexibility.',
    ),
    'Unravel': (
        'Need something a little softer?',
        "Unravel is Kiki's more deliberate cousin — conditioning and guided "
        'stretching at a slower pace with a focus on release and recovery. '
        'A class to avoid less and love more.',
    ),
}

# ── Full timetable ────────────────────────────────────────────────────────────
TIMETABLE = [
    # ── Monday ───────────────────────────────────────────────────────────────
    ('Dance Tech',   'Specialty',    'Chloe',    'rhapsody', 0, time(17, 30), 90, 'course', 12),
    ('Floor Virgin', 'Specialty',    'Jaz',      'box',      0, time(17, 30), 90, 'course', 11),
    ('Level 2',      'Level 2',      'Chloe',    'rhapsody', 0, time(18, 30), 90, 'course', 12),
    ('Level 1',      'Level 1',      'Jaz',      'box',      0, time(18, 30), 90, 'course', 11),
    ('Level 4',      'Level 4',      'Chloe',    'rhapsody', 0, time(19, 30), 90, 'course', 12),
    ('Strip Virgin', 'Conditioning', 'Jaz',      'box',      0, time(19, 30), 90, 'course', 11),
    ('Level 3',      'Level 3',      'Chloe',    'rhapsody', 0, time(20, 30), 90, 'course', 10),
    # ── Tuesday ──────────────────────────────────────────────────────────────
    ('Level 2',      'Level 2',      'Avalon',   'box',      1, time(17, 30), 90, 'course', 11),
    ('Strip',        'Specialty',    'Mimi',     'rhapsody', 1, time(18, 30), 90, 'course', 12),
    ('3 Tricks',     'Conditioning', 'Avalon',   'box',      1, time(18, 30), 90, 'course', 11),
    ('Level 6',      'Level 6',      'Mimi',     'rhapsody', 1, time(19, 30), 90, 'course', 10),
    ('Level 5',      'Level 5',      'Chloe',    'box',      1, time(19, 30), 90, 'course', 11),
    ('High Tricks',  'Conditioning', 'Mimi',     'rhapsody', 1, time(20, 30), 90, 'course', 10),
    # ── Wednesday ────────────────────────────────────────────────────────────
    ('Level 1',      'Level 1',      'Chloe',    'rhapsody', 2, time(17, 30), 90, 'course', 12),
    ('Practice Time','',             'Reception','box',      2, time(16, 30), 110,'casual', 11),
    ('Chair',        'Specialty',    'Chloe',    'rhapsody', 2, time(18, 30), 90, 'course', 12),
    ('Invert Tech',  'Conditioning', 'Maz',      'box',      2, time(18, 30), 90, 'course', 11),
    ('Dance Virgin', 'Specialty',    'Chloe',    'rhapsody', 2, time(19, 30), 90, 'course', 12),
    ('4 Tricks',     'Conditioning', 'Chloe',    'rhapsody', 2, time(20, 30), 90, 'course', 10),
    ('Level 2',      'Level 2',      'Bambi',    'box',      2, time(20, 30), 90, 'course', 11),
    # ── Thursday ─────────────────────────────────────────────────────────────
    ('Inter Floor',  'Specialty',    'Mimi',     'rhapsody', 3, time(17, 30), 90, 'course', 12),
    ('Strip Virgin', 'Conditioning', 'Amy',      'box',      3, time(17, 30), 90, 'course', 11),
    ('Level 5',      'Level 5',      'Mimi',     'rhapsody', 3, time(18, 30), 90, 'course', 10),
    ('Strip',        'Specialty',    'Mimi',     'rhapsody', 3, time(19, 30), 90, 'course', 12),
    ('Practice Time','',             'Reception','box',      3, time(19, 30), 90, 'casual', 11),
    ('Dirty Dance',  'Specialty',    'Mimi',     'rhapsody', 3, time(20, 30), 90, 'course', 10),
    ('Practice Time','',             'Reception','box',      3, time(20, 30), 90, 'casual', 11),
    # ── Friday ───────────────────────────────────────────────────────────────
    ('Kiki',         'Conditioning', 'Mimi',     'rhapsody', 4, time(17, 30), 90, 'course', 12),
    ('Practice Time','',             'Reception','box',      4, time(17, 30), 90, 'casual', 11),
    ('Dance',        'Specialty',    'Mimi',     'rhapsody', 4, time(18, 30), 90, 'course', 12),
    ('Practice Time','',             'Reception','box',      4, time(18, 30), 90, 'casual', 11),
    # ── Saturday ─────────────────────────────────────────────────────────────
    ('Unravel',      'Conditioning', 'Chloe',    'rhapsody', 5, time( 9,  0), 90, 'course', 12),
    ('Level 4',      'Level 4',      'Chloe',    'rhapsody', 5, time(10,  0), 90, 'course', 12),
    ('Practice Time','',             'Reception','box',      5, time(10,  0), 90, 'casual', 11),
    ('Chole',        'Specialty',    'Chloe',    'rhapsody', 5, time(11,  0), 90, 'course', 10),
    ('Practice Time','',             'Reception','box',      5, time(11,  0), 90, 'casual', 11),
    ('Floor Virgin', 'Specialty',    'Chloe',    'rhapsody', 5, time(12,  0), 90, 'course', 12),
    # ── Sunday ───────────────────────────────────────────────────────────────
    ('Advanced Floor','Specialty',   'Mimi',     'rhapsody', 6, time(10,  0), 90, 'course', 12),
    ('Practice Time','',             'Reception','box',      6, time(10,  0), 90, 'casual', 11),
    ('5 & 6 Tricks', 'Conditioning', 'Mimi',     'rhapsody', 6, time(11,  0), 90, 'course', 10),
    ('Practice Time','',             'Reception','box',      6, time(11,  0), 90, 'casual', 11),
]

# ── Demo students ─────────────────────────────────────────────────────────────
DEMO_STUDENTS = [
    ('jess',   'Jess',   'Malone',  'she/her',   '0412 111 001', 'Level 2'),
    ('tara',   'Tara',   'Bell',    'she/her',   '0412 111 002', 'Level 2'),
    ('dana',   'Dana',   'Park',    'she/they',  '0412 111 003', 'Level 3'),
    ('nina',   'Nina',   'Torres',  'she/her',   '0412 111 004', 'Level 1'),
    ('sophie', 'Sophie', 'Lawson',  'she/her',   '0412 111 005', 'Level 4'),
    ('alex',   'Alex',   'Kim',     'they/them', '0412 111 006', 'Level 1'),
    ('riley',  'Riley',  'Chen',    'she/her',   '0412 111 007', 'Level 5'),
    ('morgan', 'Morgan', 'Walsh',   'they/them', '0412 111 008', 'Specialty'),
]

# ── Demo enrolments ───────────────────────────────────────────────────────────
DEMO_ENROLMENTS = [
    ('jess',   'Level 2',      'Chloe',    0),
    ('tara',   'Level 2',      'Chloe',    0),
    ('tara',   'Invert Tech',  'Maz',      2),
    ('dana',   'Level 3',      'Chloe',    0),
    ('nina',   'Level 1',      'Chloe',    2),
    ('nina',   'Strip Virgin', 'Amy',      3),
    ('sophie', 'Level 4',      'Chloe',    0),
    ('sophie', 'Dance Tech',   'Chloe',    0),
    ('alex',   'Level 2',      'Avalon',   1),
    ('riley',  'Level 5',      'Chloe',    1),
    ('riley',  '3 Tricks',     'Avalon',   1),
    ('morgan', 'Strip',        'Mimi',     1),
    ('morgan', 'Floor Virgin', 'Jaz',      0),
]


class Command(BaseCommand):
    help = 'Seed the live database with Duality Season 3 demo data'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true',
                            help='Remove all demo_ accounts and their associated data')

    def handle(self, *args, **options):
        if options['clear']:
            self._clear()
        else:
            self._seed()

    def _clear(self):
        from apps.users.models import User
        demo_users = User.objects.filter(username__startswith=DEMO_PREFIX)
        count = demo_users.count()
        demo_users.delete()
        self.stdout.write(self.style.SUCCESS(
            f'Removed {count} demo account(s) and all cascading data.'
        ))

    def _seed(self):
        from apps.users.models import User, Notification
        from apps.classes.models import Studio, ClassSession, ClassOccurrence, Season
        from apps.enrolments.models import Enrolment
        from apps.attendance.models import AttendanceRecord, MakeupCredit
        from apps.payments.models import Payment

        self._disconnect_signals(User, Enrolment)

        today = date.today()

        rhapsody = self._get_room('RHAPSODY', fallback_name='Rhapsody', poles='14')
        box      = self._get_room('THE BOX',  fallback_name='The Box',  poles='11')
        closet   = self._get_room("JANITOR'S CLOSET", fallback_name="Janitor's Closet", poles='3')
        room_map = {'rhapsody': rhapsody, 'box': box, 'closet': closet}
        self.stdout.write(f'  Rooms: {rhapsody.name}, {box.name}, {closet.name}')

        season, created = Season.objects.get_or_create(
            name=SEASON_NAME,
            defaults={
                'start_date': SEASON_START,
                'end_date':   SEASON_END,
                'status':     'active',
                'bookings_open': True,
            },
        )
        # Always ensure season is active and bookings are open
        updated_fields = []
        if season.status != 'active':
            season.status = 'active'
            updated_fields.append('status')
        if not season.bookings_open:
            season.bookings_open = True
            updated_fields.append('bookings_open')
        if season.start_date != SEASON_START:
            season.start_date = SEASON_START
            updated_fields.append('start_date')
        if season.end_date != SEASON_END:
            season.end_date = SEASON_END
            updated_fields.append('end_date')
        if updated_fields:
            season.save(update_fields=updated_fields)
        if created:
            self.stdout.write(f'  Created season: {season.name}')
        else:
            self.stdout.write(f'  Using season: {season.name} ({season.start_date} - {season.end_date})')

        instructors = self._resolve_instructors()

        self.stdout.write('Creating / verifying class sessions...')
        session_index = {}

        for (name, level_tag, instr_first, room_key, dow,
             start, duration, stype, cap) in TIMETABLE:
            instructor = instructors.get(instr_first.lower())
            room = room_map.get(room_key, rhapsody)
            ft = FIRST_TIMER_INFO.get(name, ('', ''))
            sess, _ = ClassSession.objects.get_or_create(
                name=name,
                instructor=instructor,
                studio=room,
                day_of_week=dow,
                start_time=start,
                season=season if stype == 'course' else None,
                defaults={
                    'level': level_tag,
                    'duration_minutes': duration,
                    'capacity': cap,
                    'session_type': stype,
                    'is_active': True,
                    'first_timer_headline': ft[0],
                    'first_timer_body': ft[1],
                },
            )
            session_index[(name, instr_first.lower(), dow)] = sess

        self.stdout.write(f'  {len(session_index)} sessions ready')

        self.stdout.write('Creating demo students...')
        students = {}
        for slug, first, last, pronouns, phone, level in DEMO_STUDENTS:
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

        self.stdout.write('Generating occurrences...')
        occ_by_session = {}

        course_sessions = ClassSession.objects.filter(season=season, session_type='course')
        for sess in course_sessions:
            past_dates   = self._dates_in_range(sess.day_of_week, season.start_date, today - timedelta(days=1))
            future_dates = self._dates_in_range(sess.day_of_week, today, season.end_date)

            past_occs, future_occs = [], []
            for d in past_dates:
                occ, _ = ClassOccurrence.objects.get_or_create(
                    session=sess, date=d,
                    defaults={'status': 'completed', 'register_saved': True},
                )
                past_occs.append(occ)
            for d in future_dates:
                occ, _ = ClassOccurrence.objects.get_or_create(
                    session=sess, date=d,
                    defaults={'status': 'scheduled'},
                )
                future_occs.append(occ)

            occ_by_session[sess.id] = {'past': past_occs, 'upcoming': future_occs}

        self.stdout.write('Enrolling demo students...')
        first_timers = {'nina', 'alex'}

        enrolment_map = {}
        for slug, sess_name, instr_first, dow in DEMO_ENROLMENTS:
            key = (sess_name, instr_first.lower(), dow)
            sess = session_index.get(key)
            if not sess:
                self.stdout.write(self.style.WARNING(
                    f'  Session not found: {sess_name} / {instr_first} / day {dow}'
                ))
                continue
            enrolment, _ = Enrolment.objects.get_or_create(
                student=students[slug],
                class_session=sess,
                defaults={
                    'enrolment_type': 'course',
                    'status': 'active',
                    'is_first_visit': slug in first_timers,
                },
            )
            enrolment_map.setdefault(slug, []).append((enrolment, sess))

        self.stdout.write('Recording attendance...')
        absence_slots = {
            'tara':  0,
            'nina':  1,
            'alex':  0,
        }
        for slug, enrolment_list in enrolment_map.items():
            for enrolment, sess in enrolment_list:
                past_occs = occ_by_session.get(sess.id, {}).get('past', [])
                for occ in past_occs:
                    AttendanceRecord.objects.get_or_create(
                        student=students[slug], occurrence=occ,
                        defaults={'status': 'present'},
                    )
                absent_idx = absence_slots.get(slug)
                if absent_idx is not None and absent_idx < len(past_occs):
                    rec = AttendanceRecord.objects.filter(
                        student=students[slug], occurrence=past_occs[absent_idx]
                    ).first()
                    if rec and rec.status == 'present':
                        rec.status = 'absent'
                        rec.save()
                        MakeupCredit.objects.get_or_create(
                            student=students[slug],
                            reason=f'Absent - {sess.name} (demo)',
                            defaults={
                                'status': 'available',
                                'season': season,
                                'issued_by': enrolment.class_session.instructor,
                            },
                        )
                    absence_slots.pop(slug)

        self.stdout.write('Creating payments...')
        admin_user = User.objects.filter(role='admin').first()

        try:
            from apps.users.models import StudioSettings
            settings = StudioSettings.get()
            if float(settings.price_trial or 0) != PRICE_TRIAL:
                settings.price_trial = PRICE_TRIAL
                settings.save(update_fields=['price_trial'])
        except Exception:
            pass

        for slug, enrolment_list in enrolment_map.items():
            student = students[slug]
            n_classes = len(enrolment_list)
            amount = SEASON_PRICES.get(n_classes, SEASON_PRICES[1])
            class_names = ' + '.join(e.class_session.name for e, _ in enrolment_list)

            if not Payment.objects.filter(student=student, description__contains='Season 3').exists():
                if slug in first_timers:
                    Payment.objects.create(
                        student=student, payment_type='charge', amount=PRICE_TRIAL,
                        description=f'Trial class - {enrolment_list[0][1].name}',
                        created_by=admin_user,
                    )
                    Payment.objects.create(
                        student=student, payment_type='payment', amount=PRICE_TRIAL,
                        description='Trial payment received', created_by=admin_user,
                    )
                    season_amount = amount - PRICE_TRIAL
                    Payment.objects.create(
                        student=student, payment_type='charge', amount=season_amount,
                        description=f'Season 3 - {class_names} (trial credit applied)',
                        created_by=admin_user,
                    )
                    Payment.objects.create(
                        student=student, payment_type='payment', amount=season_amount,
                        description='Season payment received', created_by=admin_user,
                    )
                else:
                    Payment.objects.create(
                        student=student, payment_type='charge', amount=amount,
                        description=f'Season 3 - {class_names}', created_by=admin_user,
                    )
                    paid = amount if slug != 'jess' else round(amount * 0.55)
                    Payment.objects.create(
                        student=student, payment_type='payment', amount=paid,
                        description='Payment received' + (' (partial)' if slug == 'jess' else ''),
                        created_by=admin_user,
                    )

        self.stdout.write('Creating notifications...')
        Notification = self._get_notification_model()
        if Notification:
            Notification.objects.get_or_create(
                recipient=students['jess'],
                title='Balance outstanding',
                defaults=dict(
                    body='You have an outstanding balance for Season 3. Please arrange payment.',
                    notification_type='billing',
                    read=False,
                ),
            )
            Notification.objects.get_or_create(
                recipient=students['tara'],
                title='Catch-up credit added',
                defaults=dict(
                    body='A catch-up credit has been added for your recent absence.',
                    notification_type='info',
                    read=False,
                ),
            )

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo data seeded for Season 3!\n'
            f'  Password for all demo accounts: {DEMO_PASSWORD}\n'
            f'  Accounts: ' + ', '.join(f'{DEMO_PREFIX}{s[0]}' for s in DEMO_STUDENTS)
        ))

    def _get_room(self, name_upper, fallback_name, poles):
        from apps.classes.models import Studio
        room = (
            Studio.objects.filter(name__iexact=name_upper).first()
            or Studio.objects.filter(name__icontains=name_upper.split()[0]).first()
        )
        if not room:
            room = Studio.objects.create(name=fallback_name, poles=poles, is_active=True)
            self.stdout.write(f'  Created room: {fallback_name}')
        return room

    def _resolve_instructors(self):
        from apps.users.models import User

        first_names = {row[2].lower() for row in TIMETABLE if row[2].lower() != 'reception'}
        result = {}
        for fn in first_names:
            user = User.objects.filter(first_name__iexact=fn, is_active=True).first()
            if not user:
                info = INSTRUCTORS.get(fn, (fn.capitalize(), '', ''))
                username = f'{DEMO_PREFIX}instructor_{fn}'
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults=dict(
                        email=f'{username}@example.com',
                        first_name=info[0],
                        last_name='',
                        nickname=info[1],
                        role='instructor',
                    ),
                )
                if created:
                    user.set_password(DEMO_PASSWORD)
                    user.save()
                    self.stdout.write(f'  Created demo instructor: {info[0]}')
            result[fn] = user
        admin = User.objects.filter(role='admin').first()
        result['reception'] = admin
        return result

    def _dates_in_range(self, weekday, start, end):
        days_ahead = (weekday - start.weekday()) % 7
        first = start + timedelta(days=days_ahead)
        dates = []
        d = first
        while d <= end:
            dates.append(d)
            d += timedelta(weeks=1)
        return dates

    def _get_notification_model(self):
        try:
            from apps.users.models import Notification
            return Notification
        except ImportError:
            return None

    def _disconnect_signals(self, User, Enrolment):
        try:
            from apps.users.signals import send_welcome_email, handle_no_show_fee, handle_payment_overdue
            from apps.enrolments.signals import handle_enrolment_change
            from apps.attendance.models import AttendanceRecord
            from apps.payments.models import PaymentPlanInstalment
            post_save.disconnect(send_welcome_email, sender=User)
            post_save.disconnect(handle_enrolment_change, sender=Enrolment)
            post_save.disconnect(handle_no_show_fee, sender=AttendanceRecord)
            post_save.disconnect(handle_payment_overdue, sender=PaymentPlanInstalment)
        except Exception:
            pass
