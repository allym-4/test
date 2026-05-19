from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models.signals import post_save
from datetime import date, time, timedelta
from apps.users.models import (
    User, StaffNote, StudioSettings, Announcement, Notification,
    SkillLevel, SkillGroup, SkillDefinition, MediaItem,
    Challenge, ChallengeProgress,
)
from apps.classes.models import Studio, ClassSession, ClassOccurrence, Season, ClassChatMessage, ClassUpsell, Workshop, WorkshopBooking
from apps.enrolments.models import Enrolment
from apps.attendance.models import AttendanceRecord, MakeupCredit
from apps.payments.models import Payment, PaymentPlan, PaymentPlanInstalment
from apps.homework.models import HomeworkAssignment, HomeworkChecklistItem, HomeworkSubmission, HomeworkSubmissionItem


class Command(BaseCommand):
    help = 'Seed the database with demo data'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Wipe and reseed even if data exists')

    def handle(self, *args, **options):
        if User.objects.filter(username='chloe').exists() and not options['force']:
            self.stdout.write('Seed data already present, skipping.')
            return

        self.stdout.write('Clearing existing data...')
        ChallengeProgress.objects.all().delete()
        Challenge.objects.all().delete()
        MediaItem.objects.all().delete()
        SkillDefinition.objects.all().delete()
        SkillGroup.objects.all().delete()
        SkillLevel.objects.all().delete()
        Notification.objects.all().delete()
        Announcement.objects.all().delete()
        ClassChatMessage.objects.all().delete()
        HomeworkSubmissionItem.objects.all().delete()
        HomeworkSubmission.objects.all().delete()
        HomeworkChecklistItem.objects.all().delete()
        HomeworkAssignment.objects.all().delete()
        AttendanceRecord.objects.all().delete()
        MakeupCredit.objects.all().delete()
        Enrolment.objects.all().delete()
        ClassOccurrence.objects.all().delete()
        ClassSession.objects.all().delete()
        Season.objects.all().delete()
        Studio.objects.all().delete()
        PaymentPlanInstalment.objects.all().delete()
        PaymentPlan.objects.all().delete()
        Payment.objects.all().delete()
        StaffNote.objects.all().delete()
        StudioSettings.objects.all().delete()
        User.objects.all().delete()

        today = date.today()

        # ── Studio settings ───────────────────────────────────────────────
        self.stdout.write('Creating studio settings...')
        StudioSettings.objects.create(
            pk=1,
            studio_name='Duality Pole Studio',
            email='intrigued@dualitypole.com',
            enquiries_email='intrigued@dualitypole.com',
            urgent_email='staff@dualitypole.com',
            phone='(02) 9160 0223',
            address='Level 1, 88 Kippax St, Surry Hills NSW 2010',
            website='https://dualitypole.com.au',
            instagram='@dualitypole',
            tagline='Move boldly. Feel everything.',
            description=(
                'Welcome to Duality, our purpose-built playground for all things pole. '
                'Tucked high in the trees on vibrant Gadigal Land in Surry Hills, our dreamy studio is designed for one thing: the ultimate pole experience.\n\n'
                'Inside you will find not one, not two, but three stunning pole studios ready to set the stage for your spins, flips and hair flicks. '
                'The reception is spacious and luxe, perfect for a pre-class catch-up or post-class debrief. '
                'We have change rooms to slip into your duality with ease, gender-neutral bathrooms with two stalls and a shower, '
                'a Dyson tap-and-dryer because we love looking good while staying sustainable. '
                'You can also grab a locker for the season to stash your grip, shoes or secret snacks.\n\n'
                'Every corner of Duality is designed to feel otherworldly. From the moment you step inside you leave the everyday behind. '
                'The lights, the mirrors, the music, the energy — it is dreamy, a little cheeky and completely transportive. '
                'Think of it as stepping into another dimension — one where you are powerful, playful and free to move however you want.'
            ),
            price_casual=40,
            price_season=270,
            price_trial=25,
            price_class_pass=120,
            class_pass_size=4,
            season_pricing_config=[
                {'label': '1 class/week', 'price': '270', 'discount': '$33.75 per class'},
                {'label': '2 classes/week', 'price': '440', 'discount': '$27.50 per class'},
                {'label': '3 classes/week', 'price': '580', 'discount': '$24.17 per class'},
                {'label': '4 classes/week', 'price': '700', 'discount': '$21.88 per class'},
                {'label': '5 classes/week', 'price': '800', 'discount': '$20.00 per class'},
                {'label': '6 classes/week', 'price': '900', 'discount': '$18.75 per class'},
            ],
            cancellation_window_hours=4,
            no_show_fee=20,
            late_cancel_fee=10,
            credit_expiry_days=60,
            max_freeze_weeks=8,
            studio_code=[
                {
                    'icon': '🚫',
                    'title': 'No talk of weight — anything',
                    'body': 'We are firm believers in working out to feel good within your own body. Fitness should celebrate what your body can do, not punish or reward it. Please refrain from speaking about weight-related goals in the space — it can be triggering. Focus on how you want your body to feel, or what you want to enable it to achieve.',
                },
                {
                    'icon': '🏳️‍🌈',
                    'title': 'Active support & allies',
                    'body': 'Duality acknowledges the Gadigal people, the traditional owners of the land on which we dance. We honour and respect the pioneers of pole dance — past and present sex workers. We are proudly sex-worker positive, LGBTQIA+ and neurodivergent friendly. Your body, skin, preferences, occupation or gender do not define you here. Any offensive behaviour will not be tolerated.',
                },
                {
                    'icon': '🎓',
                    'title': 'Class time is for everyone',
                    'body': 'Duality is a place of solace. Use your phone to film your progress, but step away from messages and calls — you deserve to be present. Our instructors have trained for years; please respect that and do not talk over them or teach other students. Classes start on time — once warm-up begins, we cannot allow late entry for safety reasons.',
                },
                {
                    'icon': '🤒',
                    'title': 'Stay home if you\'re unwell',
                    'body': 'The health and safety of our instructors and community is everything. Many people in our community have low immunity or are at higher risk if they get sick. Please stay home if you are feeling any way unwell — you can make up the class when you are 100%. If you arrive visibly sick or with a high temperature, you will kindly be asked to leave.',
                },
                {
                    'icon': '🎟️',
                    'title': 'Catch-up classes',
                    'body': 'If life gets in the way, let us know at least 4 hours before your class and you will receive a catch-up credit. This credit is valid within the same season you booked into. If you do not show up for your allocated catch-up class, you will forfeit the credit. The same rule applies for casual and Kiki bookings.',
                },
                {
                    'icon': '🌸',
                    'title': 'Give instructors a bit of space',
                    'body': 'Our instructors love connecting with you, but they need time out too. Feel free to reach out via studio channels, but do not message them about class requests on personal accounts, and be mindful they may not respond immediately. Contact us via Instagram @dualitypole or email intrigued@dualitypole.com.',
                },
                {
                    'icon': '✨',
                    'title': 'Keep it clean — for all',
                    'body': 'We clean our studio and bathrooms daily. We ask that you wipe down your apparatus before and after your class, and keep personal hygiene in mind — deodorant and baby wipes are available at reception. Please take your rubbish with you. We sell reusable bottles and have a water filter on site.',
                },
                {
                    'icon': '🎥',
                    'title': 'Ask before filming',
                    'body': 'We love a good video, but many people around you may not want to be filmed. Before you press record, check with everyone nearby. Our instructors will call out when it is time to film — if you do not want to be in the video, speak up. You are not permitted to film warm-up or class content without instructor consent.',
                },
            ],
        )

        # ── Users ─────────────────────────────────────────────────────────
        self.stdout.write('Creating users...')
        # Disconnect all email signals so seed doesn't try to send emails
        from apps.users.signals import send_welcome_email, handle_no_show_fee, handle_payment_overdue
        from apps.enrolments.signals import handle_enrolment_change
        from apps.enrolments.models import Enrolment as EnrolmentModel
        from apps.attendance.models import AttendanceRecord as AttendanceModel
        from apps.payments.models import PaymentPlanInstalment as InstalmentModel
        post_save.disconnect(send_welcome_email, sender=User)
        post_save.disconnect(handle_enrolment_change, sender=EnrolmentModel)
        post_save.disconnect(handle_no_show_fee, sender=AttendanceModel)
        post_save.disconnect(handle_payment_overdue, sender=InstalmentModel)
        admin = User.objects.create_superuser(
            username='admin', email='admin@dualitypole.com',
            password='admin1234', first_name='Mimi', last_name='Owner', role='admin',
        )
        chloe = User.objects.create_user(
            username='chloe', email='chloe@dualitypole.com',
            password='chloe1234', first_name='Chloe', last_name='Glover',
            role='instructor', pronouns='she/her', phone='0412 000 001',
        )
        students_data = [
            ('jess',   'Jess',   'Malone',  'she/her',   '0412 111 001'),
            ('tara',   'Tara',   'Bell',    'she/her',   '0412 111 002'),
            ('dana',   'Dana',   'Park',    'she/they',  '0412 111 003'),
            ('nina',   'Nina',   'Torres',  'she/her',   '0412 111 004'),
            ('sophie', 'Sophie', 'Lawson',  'she/her',   '0412 111 005'),
            ('alex',   'Alex',   'Kim',     'they/them', '0412 111 006'),
            ('riley',  'Riley',  'Chen',    'she/her',   '0412 111 007'),
            ('morgan', 'Morgan', 'Walsh',   'they/them', '0412 111 008'),
            ('jade',   'Jade',   'Nguyen',  'she/her',   '0412 111 009'),
            ('sam',    'Sam',    'Foster',  'she/her',   '0412 111 010'),
        ]
        students = {}
        for username, first, last, pronouns, phone in students_data:
            students[username] = User.objects.create_user(
                username=username, email=f'{username}@example.com',
                password='student1234', first_name=first, last_name=last,
                role='student', pronouns=pronouns, phone=phone,
            )

        # ── Studios ───────────────────────────────────────────────────────
        self.stdout.write('Creating studios and classes...')
        rhapsody = Studio.objects.create(name='Rhapsody', address='Level 1, 88 Kippax St, Surry Hills NSW 2010', poles='14')
        the_box  = Studio.objects.create(name='The Box',  address='Level 1, 88 Kippax St, Surry Hills NSW 2010', poles='11')
        Studio.objects.create(name="Janitor's Closet", address='Level 1, 88 Kippax St, Surry Hills NSW 2010', poles='3')

        # ── Season ────────────────────────────────────────────────────────
        season_start = today.replace(day=1)
        season_end   = (season_start + timedelta(days=90)).replace(day=1) - timedelta(days=1)
        season = Season.objects.create(
            name=f'Season {today.year}',
            start_date=season_start,
            end_date=season_end,
            status='active',
        )

        # ── Class sessions ────────────────────────────────────────────────
        lvl2_mon = ClassSession.objects.create(
            name='Level 2', level='Level 2', instructor=chloe, studio=the_box,
            day_of_week=0, start_time=time(18, 30), duration_minutes=90, capacity=15,
            session_type='course', season=season,
        )
        lvl2_thu = ClassSession.objects.create(
            name='Level 2', level='Level 2', instructor=chloe, studio=rhapsody,
            day_of_week=3, start_time=time(18, 30), duration_minutes=90, capacity=12,
            session_type='course', season=season,
        )
        lvl3_mon = ClassSession.objects.create(
            name='Level 3', level='Level 3', instructor=chloe, studio=rhapsody,
            day_of_week=0, start_time=time(20, 30), duration_minutes=90, capacity=12,
            session_type='course', season=season,
        )
        lvl3_tue = ClassSession.objects.create(
            name='Level 3', level='Level 3', instructor=chloe, studio=rhapsody,
            day_of_week=1, start_time=time(20, 30), duration_minutes=90, capacity=10,
            session_type='course', season=season,
        )
        lvl1_sat = ClassSession.objects.create(
            name='Level 1', level='Level 1', instructor=chloe, studio=the_box,
            day_of_week=5, start_time=time(10, 0), duration_minutes=90, capacity=12,
            session_type='course', season=season,
        )

        # ── Enrolments ────────────────────────────────────────────────────
        self.stdout.write('Enrolling students...')
        for username in ['jess', 'tara', 'dana', 'nina', 'sophie', 'alex', 'riley', 'morgan', 'jade', 'sam']:
            Enrolment.objects.create(student=students[username], class_session=lvl2_mon, enrolment_type='course', status='active')
        for username in ['tara', 'dana', 'nina', 'sophie', 'alex']:
            Enrolment.objects.create(student=students[username], class_session=lvl3_mon, enrolment_type='course', status='active')
        for username in ['jess', 'riley']:
            Enrolment.objects.create(student=students[username], class_session=lvl1_sat, enrolment_type='course', status='active')
        # A few students also enrolled in the Thu/Tue sessions
        for username in ['morgan', 'jade', 'sam']:
            Enrolment.objects.create(student=students[username], class_session=lvl2_thu, enrolment_type='course', status='active')
        for username in ['riley', 'morgan']:
            Enrolment.objects.create(student=students[username], class_session=lvl3_tue, enrolment_type='course', status='active')

        # ── Occurrences ───────────────────────────────────────────────────
        self.stdout.write('Creating occurrences...')
        def next_weekday(weekday):
            days_ahead = weekday - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return today + timedelta(days=days_ahead)

        def last_weekday(weekday):
            days_ago = today.weekday() - weekday
            if days_ago <= 0:
                days_ago += 7
            return today - timedelta(days=days_ago)

        # Past occurrences — 4 weeks of history
        occ_lvl2_mon_w4 = ClassOccurrence.objects.create(session=lvl2_mon, date=last_weekday(0) - timedelta(weeks=3), status='completed', register_saved=True)
        occ_lvl2_mon_w3 = ClassOccurrence.objects.create(session=lvl2_mon, date=last_weekday(0) - timedelta(weeks=2), status='completed', register_saved=True)
        occ_lvl2_mon_w2 = ClassOccurrence.objects.create(session=lvl2_mon, date=last_weekday(0) - timedelta(weeks=1), status='completed', register_saved=True)
        occ_lvl2_mon_past = ClassOccurrence.objects.create(session=lvl2_mon, date=last_weekday(0), status='completed', register_saved=True)
        occ_lvl2_mon_next = ClassOccurrence.objects.create(session=lvl2_mon, date=next_weekday(0), status='scheduled')

        occ_lvl3_mon_w4 = ClassOccurrence.objects.create(session=lvl3_mon, date=last_weekday(0) - timedelta(weeks=3), status='completed', register_saved=True)
        occ_lvl3_mon_w3 = ClassOccurrence.objects.create(session=lvl3_mon, date=last_weekday(0) - timedelta(weeks=2), status='completed', register_saved=True)
        occ_lvl3_mon_w2 = ClassOccurrence.objects.create(session=lvl3_mon, date=last_weekday(0) - timedelta(weeks=1), status='completed', register_saved=True)
        occ_lvl3_mon_past = ClassOccurrence.objects.create(session=lvl3_mon, date=last_weekday(0), status='completed', register_saved=True)
        occ_lvl3_mon_next = ClassOccurrence.objects.create(session=lvl3_mon, date=next_weekday(0), status='scheduled')

        occ_lvl1_sat_w2  = ClassOccurrence.objects.create(session=lvl1_sat, date=last_weekday(5) - timedelta(weeks=1), status='completed', register_saved=True)
        occ_lvl1_sat_past = ClassOccurrence.objects.create(session=lvl1_sat, date=last_weekday(5), status='completed', register_saved=True)
        occ_lvl1_sat_next = ClassOccurrence.objects.create(session=lvl1_sat, date=next_weekday(5), status='scheduled')

        ClassOccurrence.objects.create(session=lvl2_thu, date=last_weekday(3), status='completed', register_saved=True)
        ClassOccurrence.objects.create(session=lvl2_thu, date=next_weekday(3), status='scheduled')
        ClassOccurrence.objects.create(session=lvl3_tue, date=last_weekday(1), status='completed', register_saved=True)
        ClassOccurrence.objects.create(session=lvl3_tue, date=next_weekday(1), status='scheduled')

        # ── Attendance ────────────────────────────────────────────────────
        # Level 2 Monday history — a few absences scattered across weeks
        lvl2_students = ['jess', 'tara', 'dana', 'nina', 'sophie', 'alex', 'riley', 'morgan', 'jade', 'sam']
        for occ in [occ_lvl2_mon_w4, occ_lvl2_mon_w3, occ_lvl2_mon_w2, occ_lvl2_mon_past]:
            for username in lvl2_students:
                AttendanceRecord.objects.create(student=students[username], occurrence=occ, status='present')

        # Overwrite: tara was absent week 3; dana was absent week 2; morgan marked away week 4
        AttendanceRecord.objects.filter(student=students['tara'], occurrence=occ_lvl2_mon_w3).update(status='absent')
        AttendanceRecord.objects.filter(student=students['dana'], occurrence=occ_lvl2_mon_w2).update(status='absent')
        AttendanceRecord.objects.filter(student=students['morgan'], occurrence=occ_lvl2_mon_w4).update(status='absent')

        # Level 3 Monday history
        lvl3_students = ['tara', 'dana', 'nina', 'sophie', 'alex']
        for occ in [occ_lvl3_mon_w4, occ_lvl3_mon_w3, occ_lvl3_mon_w2, occ_lvl3_mon_past]:
            for username in lvl3_students:
                AttendanceRecord.objects.create(student=students[username], occurrence=occ, status='present')

        # Overwrite: alex absent week 4 and last week; sophie marked away week 3
        AttendanceRecord.objects.filter(student=students['alex'], occurrence=occ_lvl3_mon_w4).update(status='absent')
        AttendanceRecord.objects.filter(student=students['alex'], occurrence=occ_lvl3_mon_past).update(status='absent')
        AttendanceRecord.objects.filter(student=students['sophie'], occurrence=occ_lvl3_mon_w3).update(status='absent')

        # Level 1 Saturday history
        for occ in [occ_lvl1_sat_w2, occ_lvl1_sat_past]:
            for username in ['jess', 'riley']:
                AttendanceRecord.objects.create(student=students[username], occurrence=occ, status='present')
        AttendanceRecord.objects.filter(student=students['riley'], occurrence=occ_lvl1_sat_w2).update(status='absent')

        # Makeup credits
        MakeupCredit.objects.create(student=students['alex'], status='available',
            reason='Absent — Level 3 Mon (last week)', season=season, issued_by=chloe)
        MakeupCredit.objects.create(student=students['alex'], status='used',
            reason='Absent — Level 3 Mon (week 4)', season=season, issued_by=chloe)
        MakeupCredit.objects.create(student=students['tara'], status='available',
            reason='Absent — Level 2 Mon (week 3)', season=season, issued_by=chloe)
        MakeupCredit.objects.create(student=students['dana'], status='available',
            reason='Absent — Level 2 Mon (week 2)', season=season, issued_by=chloe)
        MakeupCredit.objects.create(student=students['riley'], status='available',
            reason='Absent — Level 1 Sat (week 2)', season=season, issued_by=chloe)

        # ── Payments ─────────────────────────────────────────────────────
        self.stdout.write('Creating payments...')
        Payment.objects.create(student=students['jess'], payment_type='charge', amount=270,
            description='Season course fee — Level 2 Mon', created_by=admin)
        Payment.objects.create(student=students['jess'], payment_type='payment', amount=150,
            description='Payment received — bank transfer', created_by=admin)
        Payment.objects.create(student=students['jess'], payment_type='no_show_fee', amount=20,
            description='No-show fee · Level 2', created_by=chloe)
        plan = PaymentPlan.objects.create(
            student=students['jess'], description='Season remainder payment plan',
            total_amount=120, status='active', created_by=admin,
        )
        PaymentPlanInstalment.objects.create(plan=plan, amount=40, due_date=today - timedelta(days=28), paid_date=today - timedelta(days=29), status='paid')
        PaymentPlanInstalment.objects.create(plan=plan, amount=40, due_date=today - timedelta(days=7), status='overdue')
        PaymentPlanInstalment.objects.create(plan=plan, amount=40, due_date=today + timedelta(days=14), status='pending')

        for username in ['tara', 'dana', 'nina', 'sophie', 'alex']:
            Payment.objects.create(student=students[username], payment_type='charge', amount=440,
                description='Season course fee — Level 2 + Level 3', created_by=admin)
            Payment.objects.create(student=students[username], payment_type='payment', amount=440,
                description='Payment received', created_by=admin)

        # ── Homework ─────────────────────────────────────────────────────
        self.stdout.write('Creating homework...')
        hw1 = HomeworkAssignment.objects.create(
            title='Spinning Pole — Week 3 Checklist', class_session=lvl2_mon,
            assigned_by=chloe, assigned_date=today - timedelta(days=7), status='active',
        )
        for i, text in enumerate([
            'Practice outside leg hang — 3 sets each side',
            'Carousel spin — record a video attempt',
            'Seated spin to floor dismount — controlled',
            'Stretch routine — hip flexors and shoulders (10 min)',
        ]):
            HomeworkChecklistItem.objects.create(assignment=hw1, text=text, order=i)

        hw2 = HomeworkAssignment.objects.create(
            title='Invert Conditioning Drills', class_session=lvl2_mon,
            assigned_by=chloe, assigned_date=today - timedelta(days=14), status='active',
        )
        for i, text in enumerate([
            'Dead hang — 3 x 30 seconds',
            'Tuck holds on pole — 5 x 10 seconds',
            'Knee raise on bar — 3 x 10 reps',
        ]):
            HomeworkChecklistItem.objects.create(assignment=hw2, text=text, order=i)

        sub = HomeworkSubmission.objects.create(
            assignment=hw1, student=students['jess'],
            submitted_at=timezone.now() - timedelta(days=1),
        )
        for item in hw1.checklist_items.all():
            HomeworkSubmissionItem.objects.create(submission=sub, checklist_item=item, completed=True)

        # ── Chat messages ─────────────────────────────────────────────────
        self.stdout.write('Creating chat messages...')
        chat_msgs = [
            (chloe,             "Hey everyone! Don't forget to bring your grip aid on Monday 🙌"),
            (students['jess'],  "Will do! Quick question — are we doing the layback this week?"),
            (chloe,             "Yes! We'll be working on the layback entry. Make sure your invert is solid first."),
            (students['tara'],  "So excited for this one 😍"),
            (students['dana'],  "Should we warm up our shoulders beforehand?"),
            (chloe,             "Absolutely — shoulder circles, band pull-aparts, and cat-cows. I'll send a video."),
            (students['jess'],  "Thanks Chloe! See everyone Monday"),
            (students['nina'],  "Can't wait! 💪"),
        ]
        for sender, body in chat_msgs:
            ClassChatMessage.objects.create(session=lvl2_mon, sender=sender, body=body)

        lvl3_chat = [
            (chloe,              "Level 3 crew — we're starting the aerial invert sequence this month. Very exciting!"),
            (students['tara'],   "Finally!! I've been working on my aerial for weeks"),
            (students['sophie'], "Same, can't wait to show you what I've been practising"),
            (chloe,              "Love the dedication 🔥 Come 5 mins early if you want a quick warm-up run-through"),
        ]
        for sender, body in lvl3_chat:
            ClassChatMessage.objects.create(session=lvl3_mon, sender=sender, body=body)

        # ── Notifications & announcements ─────────────────────────────────
        self.stdout.write('Creating notifications and announcements...')
        Announcement.objects.create(
            title='Season dates confirmed!',
            body=f'The current season runs {season_start.strftime("%d %b")} – {season_end.strftime("%d %b %Y")}. Fees are due by the end of week 2. Contact us if you need a payment plan.',
            note_type='announcement',
            created_by=admin,
            is_pinned=True,
        )
        Announcement.objects.create(
            title='Studio closure — long weekend',
            body='The studio will be closed on the public holiday Monday. Your next class will be the following week. No makeup credit needed — the term has been adjusted.',
            note_type='announcement',
            created_by=admin,
        )
        Notification.objects.create(
            recipient=students['jess'],
            title='Homework assigned',
            body='Chloe has assigned new homework: Spinning Pole — Week 3 Checklist',
            notification_type='info',
            read=False,
        )
        Notification.objects.create(
            recipient=students['jess'],
            title='Payment overdue',
            body='An instalment of $40 was due last week. Please arrange payment at your earliest convenience.',
            notification_type='billing',
            read=False,
        )
        Notification.objects.create(
            recipient=students['alex'],
            title='Makeup credit added',
            body='A makeup credit has been added to your account for your absence on Level 3 Mon.',
            notification_type='info',
            read=True,
        )

        # ── Skills ────────────────────────────────────────────────────────
        self.stdout.write('Creating skill levels and definitions...')
        skills_data = {
            'Level 1': {
                'Floor & Warm-up': ['Cat-cow stretch', 'Hip circles', 'Body roll', 'Floorwork transition'],
                'Static Pole Basics': ['Front hook spin', 'Back hook spin', 'Fireman spin', 'Chair spin'],
                'Beginner Climbs': ['Basic climb', 'Side climb', 'Thigh hold', 'Sitting position'],
            },
            'Level 2': {
                'Spins': ['Carousel spin', 'Attitude spin', 'Cradle spin', 'Fan kick spin'],
                'Inversions': ['Tuck invert', 'Straddle invert', 'Crucifix', 'Outside leg hang'],
                'Transitions': ['Layback', 'Seated spin to dismount', 'Pole sit transition', 'Bird of paradise entry'],
            },
            'Level 3': {
                'Aerial Moves': ['Aerial invert', 'Ayesha', 'Handspring', 'Flatline Scorpio'],
                'Advanced Spins': ['Superman spin', 'Dead man spin', 'Helicopter', 'Twisted grip spin'],
                'Combos & Flow': ['3-move combo (student choice)', 'Floor-to-pole transition', 'Slow flow sequence'],
            },
        }
        for order, (level_name, groups) in enumerate(skills_data.items()):
            level = SkillLevel.objects.create(name=level_name, order=order)
            for g_order, (group_name, skills) in enumerate(groups.items()):
                group = SkillGroup.objects.create(level=level, name=group_name, order=g_order)
                for s_order, skill_name in enumerate(skills):
                    SkillDefinition.objects.create(group=group, name=skill_name, order=s_order)

        # Add some self-assessed skills for jess
        from apps.users.models import StudentSkill
        for skill_name in ['Fireman spin', 'Chair spin', 'Basic climb', 'Carousel spin', 'Tuck invert']:
            StudentSkill.objects.create(student=students['jess'], skill_name=skill_name,
                self_assessed=True, teacher_confirmed=False)
        for skill_name in ['Cat-cow stretch', 'Hip circles', 'Body roll', 'Front hook spin', 'Back hook spin']:
            StudentSkill.objects.create(student=students['jess'], skill_name=skill_name,
                self_assessed=True, teacher_confirmed=True)

        # ── Media items ───────────────────────────────────────────────────
        self.stdout.write('Creating media items...')
        MediaItem.objects.create(
            name='Invert Conditioning Guide', media_type='pdf',
            url='https://example.com/invert-guide.pdf',
            level='Level 2', uploaded_by=chloe, session=lvl2_mon,
        )
        MediaItem.objects.create(
            name='Layback Tutorial Video', media_type='video',
            url='https://example.com/layback-tutorial.mp4',
            level='Level 2', uploaded_by=chloe, session=lvl2_mon,
        )
        MediaItem.objects.create(
            name='Aerial Invert Breakdown', media_type='video',
            url='https://example.com/aerial-invert.mp4',
            level='Level 3', uploaded_by=chloe, session=lvl3_mon,
        )
        MediaItem.objects.create(
            name='Warm-up Routine PDF', media_type='pdf',
            url='https://example.com/warmup.pdf',
            level='', uploaded_by=chloe,
        )

        # ── Challenges ────────────────────────────────────────────────────
        self.stdout.write('Creating challenges...')
        c1 = Challenge.objects.create(
            title='Attendance All-Star',
            description='Attend 8 classes this season and earn your All-Star badge!',
            challenge_type='attendance_count',
            target_value=8,
            start_date=season_start,
            end_date=season_end,
            reward_type='badge',
            reward_badge_name='All-Star',
            is_active=True,
        )
        c2 = Challenge.objects.create(
            title='Consistency Queen',
            description='Come to class 4 weeks in a row — build that habit!',
            challenge_type='streak',
            target_value=4,
            start_date=season_start,
            end_date=season_end,
            reward_type='credit',
            reward_credit_amount=20,
            is_active=True,
        )
        c3 = Challenge.objects.create(
            title='Style Explorer',
            description='Try 3 different class styles this season.',
            challenge_type='style_variety',
            target_value=3,
            start_date=season_start,
            end_date=season_end,
            reward_type='badge',
            reward_badge_name='Explorer',
            is_active=True,
        )
        ChallengeProgress.objects.create(challenge=c1, student=students['jess'], current_value=5, completed=False)
        ChallengeProgress.objects.create(challenge=c1, student=students['tara'], current_value=7, completed=False)
        ChallengeProgress.objects.create(challenge=c1, student=students['dana'], current_value=8, completed=True,
            completed_at=timezone.now() - timedelta(days=2))
        ChallengeProgress.objects.create(challenge=c2, student=students['jess'], current_value=3, completed=False)
        ChallengeProgress.objects.create(challenge=c2, student=students['nina'], current_value=4, completed=True,
            completed_at=timezone.now() - timedelta(days=5))

        # ── Staff notes ───────────────────────────────────────────────────
        StaffNote.objects.create(student=students['jess'], created_by=chloe, tag='Medical',
            body='Wrist injury noted — avoid weight-bearing on left hand for next 2 weeks.')
        StaffNote.objects.create(student=students['jess'], created_by=admin, tag='Enrolment',
            body='Cross-enrolled from Level 3. Confirm prerequisite assessment completed.')

        # ── Past season with completed enrolments ─────────────────────────
        self.stdout.write('Creating past season...')
        past_start = today - timedelta(days=180)
        past_end   = today - timedelta(days=90)
        past_season = Season.objects.create(
            name=f'Season {today.year - 1} Spring',
            start_date=past_start, end_date=past_end, status='completed',
        )
        past_lvl1 = ClassSession.objects.create(
            name='Level 1', level='Level 1', instructor=chloe, studio=rhapsody,
            day_of_week=0, start_time=time(18, 0), duration_minutes=90, capacity=12,
            session_type='course', season=past_season,
        )
        past_lvl2 = ClassSession.objects.create(
            name='Level 2', level='Level 2', instructor=chloe, studio=the_box,
            day_of_week=3, start_time=time(18, 30), duration_minutes=90, capacity=12,
            session_type='course', season=past_season,
        )
        Enrolment.objects.create(student=students['jess'], class_session=past_lvl1,
            enrolment_type='course', status='completed')
        Enrolment.objects.create(student=students['tara'], class_session=past_lvl2,
            enrolment_type='course', status='completed')
        Enrolment.objects.create(student=students['dana'], class_session=past_lvl1,
            enrolment_type='course', status='completed')

        # ── Upcoming season with enrolments ───────────────────────────────
        self.stdout.write('Creating upcoming season...')
        upcoming_start = (today.replace(day=1) + timedelta(days=95)).replace(day=1)
        upcoming_end   = upcoming_start + timedelta(days=89)
        upcoming_season = Season.objects.create(
            name=f'Season {today.year} Winter',
            start_date=upcoming_start, end_date=upcoming_end, status='upcoming', bookings_open=True,
        )
        upcoming_lvl2 = ClassSession.objects.create(
            name='Level 2', level='Level 2', instructor=chloe, studio=the_box,
            day_of_week=0, start_time=time(18, 30), duration_minutes=90, capacity=15,
            session_type='course', season=upcoming_season,
        )
        upcoming_lvl3 = ClassSession.objects.create(
            name='Level 3', level='Level 3', instructor=chloe, studio=rhapsody,
            day_of_week=1, start_time=time(19, 0), duration_minutes=90, capacity=12,
            session_type='course', season=upcoming_season,
        )
        Enrolment.objects.create(student=students['jess'], class_session=upcoming_lvl2,
            enrolment_type='course', status='active')
        Enrolment.objects.create(student=students['tara'], class_session=upcoming_lvl2,
            enrolment_type='course', status='active')
        Enrolment.objects.create(student=students['tara'], class_session=upcoming_lvl3,
            enrolment_type='course', status='active')

        # ── Casual sessions with upcoming occurrences ─────────────────────
        self.stdout.write('Creating casual sessions...')
        casual_wed = ClassSession.objects.create(
            name='Open Pole', level='All Levels', instructor=chloe, studio=rhapsody,
            day_of_week=2, start_time=time(19, 0), duration_minutes=90, capacity=10,
            session_type='casual',
        )
        casual_fri = ClassSession.objects.create(
            name='Conditioning & Flex', level='All Levels', instructor=chloe, studio=the_box,
            day_of_week=4, start_time=time(17, 30), duration_minutes=60, capacity=12,
            session_type='casual',
        )
        # Generate 4 weeks of upcoming casual occurrences
        for sess, dow in [(casual_wed, 2), (casual_fri, 4)]:
            days_ahead = dow - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            for week in range(4):
                ClassOccurrence.objects.create(
                    session=sess,
                    date=today + timedelta(days=days_ahead + week * 7),
                    status='scheduled',
                )

        # ── Workshops ─────────────────────────────────────────────────────
        self.stdout.write('Creating workshops...')
        ws1 = Workshop.objects.create(
            name='Exotic Flow Masterclass',
            description='Dive deep into fluid exotic movement with special guest instructor Lola V. This two-hour workshop covers floor transitions, partner flow, and signature styling techniques.',
            date=today + timedelta(days=12),
            start_time=time(14, 0), end_time=time(16, 0),
            instructor=chloe, studio=rhapsody, price=65, capacity=14, is_active=True,
        )
        ws2 = Workshop.objects.create(
            name='Aerial Invert Intensive',
            description='Spend 90 minutes focused entirely on aerial inversions — entries, exits, shape and strength. Suitable for Level 2+ students with a consistent straddle.',
            date=today + timedelta(days=26),
            start_time=time(11, 0), end_time=time(12, 30),
            instructor=chloe, studio=the_box, price=55, capacity=10, is_active=True,
        )
        ws3 = Workshop.objects.create(
            name='Strength & Conditioning for Pole',
            description='A 90-minute strength session designed specifically for pole dancers — grip, shoulder stability, core, and hip flexor work. Bands, body weight, and pole included.',
            date=today + timedelta(days=40),
            start_time=time(10, 0), end_time=time(11, 30),
            instructor=chloe, studio=rhapsody, price=45, capacity=16, is_active=True,
        )
        WorkshopBooking.objects.create(workshop=ws1, student=students['jess'], status='confirmed')
        WorkshopBooking.objects.create(workshop=ws1, student=students['tara'], status='confirmed')
        WorkshopBooking.objects.create(workshop=ws2, student=students['dana'], status='confirmed')

        # ── ClassUpsells (show during season checkout) ────────────────────
        self.stdout.write('Creating upsells...')
        ClassUpsell.objects.create(
            source_session=lvl2_mon, suggested_session=lvl3_mon, is_active=True,
            headline='Add Level 3 to your season',
            body='Already doing Level 2? Level 3 is the natural next step — deepen your invert work and start aerial training.',
        )
        ClassUpsell.objects.create(
            source_session=lvl2_thu, suggested_session=lvl3_tue, is_active=True,
            headline='Add Level 3 (Tuesday)',
            body='Build on Level 2 with a second weekly session in our Level 3 Tuesday class.',
        )

        self.stdout.write(self.style.SUCCESS(
            '\n✓ Done!\n'
            '  admin      → admin/admin1234\n'
            '  instructor → chloe/chloe1234\n'
            '  student    → jess/student1234  (and tara, dana, nina, sophie, alex, riley, morgan, jade, sam — all /student1234)\n'
        ))
