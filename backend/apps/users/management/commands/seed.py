from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, time
from apps.users.models import User, StaffNote
from apps.classes.models import Studio, ClassSession, ClassOccurrence
from apps.enrolments.models import Enrolment
from apps.attendance.models import AttendanceRecord
from apps.payments.models import Payment, PaymentPlan, PaymentPlanInstalment
from apps.homework.models import HomeworkAssignment, HomeworkChecklistItem, HomeworkSubmission, HomeworkSubmissionItem


class Command(BaseCommand):
    help = 'Seed the database with demo data'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        HomeworkSubmissionItem.objects.all().delete()
        HomeworkSubmission.objects.all().delete()
        HomeworkChecklistItem.objects.all().delete()
        HomeworkAssignment.objects.all().delete()
        AttendanceRecord.objects.all().delete()
        Enrolment.objects.all().delete()
        ClassOccurrence.objects.all().delete()
        ClassSession.objects.all().delete()
        Studio.objects.all().delete()
        PaymentPlanInstalment.objects.all().delete()
        PaymentPlan.objects.all().delete()
        Payment.objects.all().delete()
        StaffNote.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        self.stdout.write('Creating users...')
        admin = User.objects.create_superuser(
            username='admin', email='admin@dualitypole.com',
            password='admin1234', first_name='Mimi', last_name='Owner', role='admin',
        )
        chloe = User.objects.create_user(
            username='chloe', email='chloe@dualitypole.com',
            password='chloe1234', first_name='Chloe', last_name='Instructor',
            role='instructor', pronouns='she/her', phone='0412 000 001',
        )
        students_data = [
            ('jess', 'Jess', 'Malone', 'she/her', '0412 111 001'),
            ('tara', 'Tara', 'Bell', 'she/her', '0412 111 002'),
            ('dana', 'Dana', 'Park', 'she/they', '0412 111 003'),
            ('nina', 'Nina', 'Torres', 'she/her', '0412 111 004'),
            ('sophie', 'Sophie', 'Lawson', 'she/her', '0412 111 005'),
            ('alex', 'Alex', 'Kim', 'they/them', '0412 111 006'),
            ('riley', 'Riley', 'Chen', 'she/her', '0412 111 007'),
            ('morgan', 'Morgan', 'Walsh', 'they/them', '0412 111 008'),
            ('jade', 'Jade', 'Nguyen', 'she/her', '0412 111 009'),
            ('sam', 'Sam', 'Foster', 'she/her', '0412 111 010'),
        ]
        students = {}
        for username, first, last, pronouns, phone in students_data:
            students[username] = User.objects.create_user(
                username=username, email=f'{username}@example.com',
                password='student1234', first_name=first, last_name=last,
                role='student', pronouns=pronouns, phone=phone,
            )

        self.stdout.write('Creating studios and classes...')
        the_box = Studio.objects.create(name='The Box', address='12 Industrial Ave, Fitzroy')
        rhapsody = Studio.objects.create(name='Rhapsody', address='88 Chapel St, South Yarra')

        lvl2_mon = ClassSession.objects.create(
            name='Level 2', level='Level 2', instructor=chloe, studio=the_box,
            day_of_week=0, start_time=time(18, 30), duration_minutes=90, capacity=15, session_type='course',
        )
        lvl2_thu = ClassSession.objects.create(
            name='Level 2', level='Level 2', instructor=chloe, studio=rhapsody,
            day_of_week=3, start_time=time(18, 30), duration_minutes=90, capacity=12, session_type='course',
        )
        lvl3_mon = ClassSession.objects.create(
            name='Level 3', level='Level 3', instructor=chloe, studio=rhapsody,
            day_of_week=0, start_time=time(20, 30), duration_minutes=90, capacity=12, session_type='course',
        )
        ClassSession.objects.create(
            name='Level 3', level='Level 3', instructor=chloe, studio=rhapsody,
            day_of_week=1, start_time=time(20, 30), duration_minutes=90, capacity=10, session_type='course',
        )
        ClassSession.objects.create(
            name='Level 1', level='Level 1', instructor=chloe, studio=the_box,
            day_of_week=5, start_time=time(10, 0), duration_minutes=90, capacity=12, session_type='course',
        )

        self.stdout.write('Enrolling students...')
        for username in ['jess', 'tara', 'dana', 'nina', 'sophie', 'alex', 'riley', 'morgan', 'jade', 'sam']:
            Enrolment.objects.create(student=students[username], class_session=lvl2_mon, enrolment_type='course')
        for username in ['tara', 'dana', 'nina', 'sophie', 'alex']:
            Enrolment.objects.create(student=students[username], class_session=lvl3_mon, enrolment_type='course')

        self.stdout.write('Creating occurrences and attendance...')
        occ = ClassOccurrence.objects.create(session=lvl2_mon, date=date(2025, 5, 12), status='scheduled')
        ClassOccurrence.objects.create(session=lvl2_mon, date=date(2025, 5, 5), status='completed', register_saved=True)

        self.stdout.write('Creating payments...')
        Payment.objects.create(student=students['jess'], payment_type='charge', amount=220,
            description='Season 4 course fee', created_by=admin)
        Payment.objects.create(student=students['jess'], payment_type='payment', amount=100,
            description='Payment received — bank transfer', created_by=admin)
        Payment.objects.create(student=students['jess'], payment_type='no_show_fee', amount=20,
            description='No-show fee · Level 2 Mon 5 May', created_by=chloe)
        plan = PaymentPlan.objects.create(
            student=students['jess'], description='Season 4 remainder payment plan',
            total_amount=120, status='active', created_by=admin,
        )
        PaymentPlanInstalment.objects.create(plan=plan, amount=40, due_date=date(2025, 4, 21), paid_date=date(2025, 4, 20), status='paid')
        PaymentPlanInstalment.objects.create(plan=plan, amount=40, due_date=date(2025, 5, 5), status='overdue')
        PaymentPlanInstalment.objects.create(plan=plan, amount=40, due_date=date(2025, 5, 19), status='pending')

        self.stdout.write('Creating staff notes...')
        StaffNote.objects.create(student=students['jess'], created_by=chloe, tag='Medical',
            body='Wrist injury noted — avoid weight-bearing on left hand for next 2 weeks.')
        StaffNote.objects.create(student=students['jess'], created_by=admin, tag='Enrolment',
            body='Cross-enrolled from Level 3. Confirm prerequisite assessment completed.')

        self.stdout.write('Creating homework...')
        hw1 = HomeworkAssignment.objects.create(
            title='Spinning Pole — Week 3 Checklist', class_session=lvl2_mon,
            assigned_by=chloe, assigned_date=date(2025, 5, 8), status='active',
        )
        for i, text in enumerate([
            'Practice outside leg hang — 3 sets each side',
            'Carousel spin — record video attempt',
            'Seated spin to floor dismount — controlled',
            'Stretch routine — hip flexors and shoulders (10 min)',
        ]):
            HomeworkChecklistItem.objects.create(assignment=hw1, text=text, order=i)

        hw2 = HomeworkAssignment.objects.create(
            title='Invert Conditioning Drills', class_session=lvl2_mon,
            assigned_by=chloe, assigned_date=date(2025, 5, 5), status='active',
        )
        for i, text in enumerate([
            'Dead hang — 3 x 30 seconds',
            'Tuck holds on pole — 5 x 10 seconds',
            'Knee raise on bar — 3 x 10 reps',
        ]):
            HomeworkChecklistItem.objects.create(assignment=hw2, text=text, order=i)

        sub = HomeworkSubmission.objects.create(
            assignment=hw1, student=students['jess'],
            submitted_at=timezone.make_aware(timezone.datetime(2025, 5, 11, 20, 0)),
        )
        for item in hw1.checklist_items.all():
            HomeworkSubmissionItem.objects.create(submission=sub, checklist_item=item, completed=True)

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Done. Logins: admin/admin1234 · chloe/chloe1234 · jess/student1234'
        ))
