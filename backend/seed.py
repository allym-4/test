"""
Run with: python manage.py shell < seed.py
Seeds the database with realistic Duality Pole Studio data matching the mockups.
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import date, time, timedelta
from django.utils import timezone
from apps.users.models import User, StaffNote
from apps.classes.models import Studio, ClassSession, ClassOccurrence
from apps.enrolments.models import Enrolment
from apps.attendance.models import AttendanceRecord
from apps.payments.models import Payment, PaymentPlan, PaymentPlanInstalment
from apps.homework.models import HomeworkAssignment, HomeworkChecklistItem, HomeworkSubmission, HomeworkSubmissionItem

print("Clearing existing data...")
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

print("Creating users...")

admin = User.objects.create_superuser(
    username='admin', email='admin@dualitypole.com',
    password='admin1234', first_name='Mimi', last_name='Owner',
    role='admin',
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
    u = User.objects.create_user(
        username=username, email=f'{username}@example.com',
        password='student1234', first_name=first, last_name=last,
        role='student', pronouns=pronouns, phone=phone,
    )
    students[username] = u

print("Creating studios...")
rhapsody = Studio.objects.create(name='Rhapsody', address='Level 1, 88 Kippax St, Surry Hills NSW 2010', poles='14')
the_box = Studio.objects.create(name='The Box', address='Level 1, 88 Kippax St, Surry Hills NSW 2010', poles='11')
Studio.objects.create(name="Janitor's Closet", address='Level 1, 88 Kippax St, Surry Hills NSW 2010', poles='3')

print("Creating class sessions...")
lvl2_mon = ClassSession.objects.create(
    name='Level 2', level='Level 2', instructor=chloe, studio=the_box,
    day_of_week=0, start_time=time(18, 30), duration_minutes=90,
    capacity=15, session_type='course',
)
lvl2_thu = ClassSession.objects.create(
    name='Level 2', level='Level 2', instructor=chloe, studio=rhapsody,
    day_of_week=3, start_time=time(18, 30), duration_minutes=90,
    capacity=12, session_type='course',
)
lvl3_mon = ClassSession.objects.create(
    name='Level 3', level='Level 3', instructor=chloe, studio=rhapsody,
    day_of_week=0, start_time=time(20, 30), duration_minutes=90,
    capacity=12, session_type='course',
)
lvl3_tue = ClassSession.objects.create(
    name='Level 3', level='Level 3', instructor=chloe, studio=rhapsody,
    day_of_week=1, start_time=time(20, 30), duration_minutes=90,
    capacity=10, session_type='course',
)
lvl1_sat = ClassSession.objects.create(
    name='Level 1', level='Level 1', instructor=chloe, studio=the_box,
    day_of_week=5, start_time=time(10, 0), duration_minutes=90,
    capacity=12, session_type='course',
)

print("Enrolling students...")
# Level 2 Mon — Jess, Tara, Dana, Nina, Sophie, Alex, Riley, Morgan, Jade, Sam
for username in ['jess', 'tara', 'dana', 'nina', 'sophie', 'alex', 'riley', 'morgan', 'jade', 'sam']:
    Enrolment.objects.create(student=students[username], class_session=lvl2_mon, enrolment_type='course')

# Level 3 Mon — Jess (cross-enrolled), Tara, Dana, Nina, Sophie, Alex, Riley, Morgan, Jade, Sam
for username in ['tara', 'dana', 'nina', 'sophie', 'alex']:
    Enrolment.objects.create(student=students[username], class_session=lvl3_mon, enrolment_type='course')

# Level 1 Sat — Riley, Morgan, Jade, Sam
for username in ['riley', 'morgan', 'jade', 'sam']:
    Enrolment.objects.create(student=students[username], class_session=lvl1_sat, enrolment_type='course')

print("Creating class occurrences...")
today = date(2025, 5, 12)
occ_lvl2_mon_12may = ClassOccurrence.objects.create(
    session=lvl2_mon, date=date(2025, 5, 12), status='scheduled', register_saved=False,
)
occ_lvl3_mon_12may = ClassOccurrence.objects.create(
    session=lvl3_mon, date=date(2025, 5, 12), status='scheduled', register_saved=False,
)
occ_lvl2_mon_5may = ClassOccurrence.objects.create(
    session=lvl2_mon, date=date(2025, 5, 5), status='completed', register_saved=True,
)
occ_lvl3_mon_5may = ClassOccurrence.objects.create(
    session=lvl3_mon, date=date(2025, 5, 5), status='completed', register_saved=True,
)
occ_lvl2_mon_28apr = ClassOccurrence.objects.create(
    session=lvl2_mon, date=date(2025, 4, 28), status='completed', register_saved=True,
)
occ_lvl2_mon_21apr = ClassOccurrence.objects.create(
    session=lvl2_mon, date=date(2025, 4, 21), status='completed', register_saved=True,
)
occ_lvl1_sat_10may = ClassOccurrence.objects.create(
    session=lvl1_sat, date=date(2025, 5, 10), status='completed', register_saved=True,
)

print("Creating attendance records...")
att_statuses = {
    'jess': 'present', 'tara': 'present', 'dana': 'late',
    'nina': 'present', 'sophie': 'present', 'alex': 'present',
    'riley': 'no_show', 'morgan': 'absent', 'jade': 'present', 'sam': 'present',
}
for username, att_status in att_statuses.items():
    if Enrolment.objects.filter(student=students[username], class_session=lvl2_mon).exists():
        AttendanceRecord.objects.create(
            occurrence=occ_lvl2_mon_5may,
            student=students[username],
            status=att_status,
            no_show_fee_charged=(att_status == 'no_show'),
            recorded_by=chloe,
        )

print("Creating payments and balances...")
# Jess owes $120 — Season 4 remainder $55 + no-show fee $20 + casual charge $25 + late fee $20
Payment.objects.create(student=students['jess'], payment_type='charge', amount=220,
    description='Season 4 course fee', created_by=admin)
Payment.objects.create(student=students['jess'], payment_type='payment', amount=100,
    description='Payment received — bank transfer', created_by=admin)
Payment.objects.create(student=students['jess'], payment_type='no_show_fee', amount=20,
    description='No-show fee · Level 2 Mon 5 May', created_by=chloe)

# Payment plan for Jess
plan = PaymentPlan.objects.create(
    student=students['jess'], description='Season 4 remainder payment plan',
    total_amount=120, status='active', created_by=admin,
    notes='Student requested 3 x $40 instalments over 6 weeks.',
)
PaymentPlanInstalment.objects.create(
    plan=plan, amount=40, due_date=date(2025, 4, 21),
    paid_date=date(2025, 4, 20), status='paid',
)
PaymentPlanInstalment.objects.create(
    plan=plan, amount=40, due_date=date(2025, 5, 5), status='overdue',
)
PaymentPlanInstalment.objects.create(
    plan=plan, amount=40, due_date=date(2025, 5, 19), status='pending',
)

# Tara — all paid up
Payment.objects.create(student=students['tara'], payment_type='charge', amount=220,
    description='Season 4 course fee', created_by=admin)
Payment.objects.create(student=students['tara'], payment_type='payment', amount=220,
    description='Payment received — card', created_by=admin)

print("Creating staff notes...")
StaffNote.objects.create(
    student=students['jess'], created_by=chloe, tag='Medical',
    body='Wrist injury noted — avoid weight-bearing on left hand for next 2 weeks.',
)
StaffNote.objects.create(
    student=students['jess'], created_by=admin, tag='Enrolment',
    body='Cross-enrolled from Level 3. Confirm she has completed the Level 3 prerequisite assessment before attempting Level 4 moves.',
)
StaffNote.objects.create(
    student=students['dana'], created_by=chloe, tag='General',
    body='Prefers to work on right side first. Very keen, progressing well.',
)

print("Creating homework...")
hw1 = HomeworkAssignment.objects.create(
    title='Spinning Pole — Week 3 Checklist',
    description='Complete the Week 3 spinning pole checklist. Focus on body lines and controlled dismounts.',
    class_session=lvl2_mon,
    assigned_by=chloe,
    assigned_date=date(2025, 5, 8),
    status='active',
)
for i, text in enumerate([
    'Practice outside leg hang — 3 sets each side',
    'Carousel spin — record video attempt',
    'Seated spin to floor dismount — controlled',
    'Stretch routine — hip flexors and shoulders (10 min)',
]):
    HomeworkChecklistItem.objects.create(assignment=hw1, text=text, order=i)

hw2 = HomeworkAssignment.objects.create(
    title='Invert Conditioning Drills',
    description='Conditioning work to build invert strength. Complete 3x per week.',
    class_session=lvl2_mon,
    assigned_by=chloe,
    assigned_date=date(2025, 5, 5),
    status='active',
)
for i, text in enumerate([
    'Dead hang — 3 x 30 seconds',
    'Tuck holds on pole — 5 x 10 seconds',
    'Knee raise on bar — 3 x 10 reps',
]):
    HomeworkChecklistItem.objects.create(assignment=hw2, text=text, order=i)

hw3 = HomeworkAssignment.objects.create(
    title='Flexibility Flow — Shoulder Prep',
    description='Shoulder mobility routine to prep for overhead work in Level 3.',
    class_session=lvl3_mon,
    assigned_by=chloe,
    assigned_date=date(2025, 5, 6),
    status='active',
)
for i, text in enumerate([
    'Thread-the-needle — 2 min each side',
    'Wall shoulder stretch — 90 seconds each',
    'Doorframe chest opener — 2 x 60 seconds',
]):
    HomeworkChecklistItem.objects.create(assignment=hw3, text=text, order=i)

# Submissions for hw1
sub1 = HomeworkSubmission.objects.create(
    assignment=hw1, student=students['jess'],
    submitted_at=timezone.make_aware(timezone.datetime(2025, 5, 11, 20, 0)),
)
for item in hw1.checklist_items.all():
    HomeworkSubmissionItem.objects.create(submission=sub1, checklist_item=item, completed=True)

sub2 = HomeworkSubmission.objects.create(
    assignment=hw1, student=students['sophie'],
    submitted_at=timezone.make_aware(timezone.datetime(2025, 5, 8, 18, 0)),
    reviewed_by=chloe,
    reviewed_at=timezone.make_aware(timezone.datetime(2025, 5, 9, 10, 0)),
    instructor_notes='Great work Sophie! Carousel spin looks much more controlled.',
)
for item in hw1.checklist_items.all():
    HomeworkSubmissionItem.objects.create(submission=sub2, checklist_item=item, completed=True)

print("\n✓ Seed complete. Summary:")
print(f"  Users: {User.objects.count()} ({User.objects.filter(role='student').count()} students, {User.objects.filter(role='instructor').count()} instructors, {User.objects.filter(role='admin').count()} admins)")
print(f"  Studios: {Studio.objects.count()}")
print(f"  Class sessions: {ClassSession.objects.count()}")
print(f"  Occurrences: {ClassOccurrence.objects.count()}")
print(f"  Enrolments: {Enrolment.objects.count()}")
print(f"  Attendance records: {AttendanceRecord.objects.count()}")
print(f"  Payments: {Payment.objects.count()}")
print(f"  Payment plans: {PaymentPlan.objects.count()}")
print(f"  Homework assignments: {HomeworkAssignment.objects.count()}")
print(f"  Submissions: {HomeworkSubmission.objects.count()}")
print(f"\n  Admin login: admin / admin1234")
print(f"  Instructor login: chloe / chloe1234")
print(f"  Student login: jess / student1234")
