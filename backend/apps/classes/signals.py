from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone


def _kisi_grant_practice(booking):
    """Auto-create a Kisi grant for a practice time booking."""
    try:
        from apps.users.models import StudioSettings
        from apps.classes.models import KisiGrant
        from apps.classes import kisi_service
        import datetime

        settings_obj = StudioSettings.objects.first()
        place_id = settings_obj.kisi_practice_place_id if settings_obj else ''
        if not place_id or not (settings_obj and settings_obj.kisi_api_key):
            return

        student = booking.student
        slot = booking.slot
        slot_date = getattr(slot, 'date', None)
        end_time = getattr(slot, 'end_time', None)

        start_time = getattr(slot, 'start_time', None)
        if slot_date and start_time:
            # Access: 15 min before practice starts, 20 min after it ends
            dt_start = datetime.datetime.combine(slot_date, start_time)
            valid_from = (dt_start - datetime.timedelta(minutes=15)).isoformat()
        else:
            valid_from = timezone.now().isoformat()
        if slot_date and end_time:
            dt_end = datetime.datetime.combine(slot_date, end_time)
            valid_until = (dt_end + datetime.timedelta(minutes=20)).isoformat()
        else:
            valid_until = None

        link_data = kisi_service.create_link(
            place_id=place_id,
            name=f'{student.display_name} — Practice {slot_date}',
            email=student.email or '',
            valid_from=valid_from,
            valid_until=valid_until,
        )
        KisiGrant.objects.create(
            student=student,
            studio=None,
            valid_from=valid_from,
            valid_until=valid_until,
            kisi_link_id=link_data.get('id', '') if link_data else '',
            link_sent=True,
        )
    except Exception:
        pass


@receiver(post_save, sender='classes.PracticeBooking')
def handle_practice_booking_kisi(sender, instance, created, **kwargs):
    if created and instance.status == 'confirmed':
        _kisi_grant_practice(instance)


@receiver(pre_save, sender='classes.Season')
def capture_old_season_status(sender, instance, **kwargs):
    """Stash the previous status and published_at so post_save can detect transitions."""
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            instance._old_status = old.status
            instance._old_published_at = old.published_at
        except sender.DoesNotExist:
            instance._old_status = None
            instance._old_published_at = None
    else:
        instance._old_status = None
        instance._old_published_at = None


@receiver(post_save, sender='classes.Season')
def handle_season_enrol_open(sender, instance, created, **kwargs):
    """Notify all active students when a season is moved to 'upcoming' or published_at is set for the first time."""
    if created:
        return
    old_status = getattr(instance, '_old_status', None)
    old_published_at = getattr(instance, '_old_published_at', None)

    status_triggered = (old_status != instance.status and instance.status == 'upcoming')
    published_triggered = (old_published_at is None and instance.published_at is not None)

    if not status_triggered and not published_triggered:
        return

    from apps.users.models import AutomationRule, Notification, AutomationRun, User
    from django.core.mail import send_mail
    from django.conf import settings

    rule = AutomationRule.objects.filter(slug='season_enrol_open').first()
    if rule and not rule.enabled:
        return

    students = User.objects.filter(role='student', is_active=True)
    for student in students:
        Notification.objects.create(
            recipient=student,
            title=f'{instance.name} — enrolments now open!',
            body=f'Enrolments for {instance.name} are now open. Book your spot before classes fill up!',
            notification_type='info',
            action_label='Book Now',
            action_url='/portal/book',
        )
        if student.email:
            send_mail(
                subject=f'Enrolments open — {instance.name}',
                message=(
                    f'Hi {student.first_name},\n\n'
                    f'Enrolments for {instance.name} are now open!\n\n'
                    f'Head to your student portal to book your spot before classes fill up.\n\n'
                    f'See you in class!\n'
                    f'Duality Pole Studio'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[student.email],
                fail_silently=True,
            )

    if rule:
        AutomationRun.objects.create(
            rule=rule, slug='season_enrol_open',
            student=None,
            trigger_data={'season': instance.name, 'status': 'upcoming'},
            actions_taken=[f'Notified {students.count()} active students'],
            status='completed',
        )


@receiver(post_save, sender='classes.Season')
def handle_season_published_generate_occurrences(sender, instance, created, **kwargs):
    """Auto-generate ClassOccurrence records when a season is published for the first time."""
    if created:
        return
    old_published_at = getattr(instance, '_old_published_at', None)
    if old_published_at is not None or instance.published_at is None:
        return

    import datetime
    from apps.classes.models import ClassOccurrence

    sessions = instance.sessions.filter(is_active=True)
    for session in sessions:
        # Find first weekday on or after start_date matching session.day_of_week
        days_ahead = (session.day_of_week - instance.start_date.weekday()) % 7
        first_possible = instance.start_date + datetime.timedelta(days=days_ahead)
        # Respect start_week and end_week
        first_date = first_possible + datetime.timedelta(weeks=(session.start_week - 1))
        end_date_cutoff = first_possible + datetime.timedelta(weeks=(session.end_week - 1))
        if end_date_cutoff > instance.end_date:
            end_date_cutoff = instance.end_date

        current = first_date
        while current <= end_date_cutoff:
            ClassOccurrence.objects.get_or_create(
                session=session,
                date=current,
                defaults={'status': ClassOccurrence.Status.SCHEDULED},
            )
            current += datetime.timedelta(weeks=1)


@receiver(post_save, sender='classes.ClassSession')
def handle_session_saved_generate_occurrences(sender, instance, created, **kwargs):
    """Auto-generate occurrences when a session is added to a season that's already published."""
    if not instance.season_id or not instance.is_active:
        return
    season = instance.season
    if not season.published_at:
        return
    import datetime
    from apps.classes.models import ClassOccurrence
    # Calculate start/end dates based on start_week and end_week
    days_ahead = (instance.day_of_week - season.start_date.weekday()) % 7
    first_possible = season.start_date + datetime.timedelta(days=days_ahead)
    # Advance to start_week
    first_date = first_possible + datetime.timedelta(weeks=(instance.start_week - 1))
    end_date_cutoff = first_possible + datetime.timedelta(weeks=(instance.end_week - 1))
    if end_date_cutoff > season.end_date:
        end_date_cutoff = season.end_date
    current = first_date
    while current <= end_date_cutoff:
        ClassOccurrence.objects.get_or_create(
            session=instance,
            date=current,
            defaults={'status': ClassOccurrence.Status.SCHEDULED},
        )
        current += datetime.timedelta(weeks=1)


@receiver(post_save, sender='classes.ClassOccurrence')
def handle_occurrence_cancelled(sender, instance, created, **kwargs):
    """Notify enrolled students when a class occurrence is cancelled."""
    if created or instance.status != 'cancelled':
        return

    from apps.enrolments.models import Enrolment
    from apps.users.models import Notification
    from django.core.mail import send_mail
    from django.conf import settings

    date_str = instance.date.strftime('%-d %B %Y') if instance.date else ''
    session = instance.session

    active_enrolments = Enrolment.objects.filter(
        class_session=session,
        status='active',
    ).select_related('student')

    for enrolment in active_enrolments:
        Notification.objects.create(
            recipient=enrolment.student,
            title=f'{session.name} cancelled — {date_str}',
            body=(
                f"This week's {session.name} on {date_str} has been cancelled. "
                f"We apologise for any inconvenience. If you have a catch-up credit it will still be valid."
            ),
            notification_type='warning',
        )
        if enrolment.student.email:
            send_mail(
                subject=f'Class cancelled — {session.name} {date_str}',
                message=(
                    f'Hi {enrolment.student.first_name},\n\n'
                    f'{session.name} on {date_str} has been cancelled.\n\n'
                    f'We apologise for the inconvenience. Your catch-up credit (if applicable) remains valid.\n\n'
                    f'Duality Pole Studio'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[enrolment.student.email],
                fail_silently=True,
            )


@receiver(post_save, sender='classes.Season')
def handle_season_status_change(sender, instance, created, **kwargs):
    if created or instance.status != 'completed':
        return

    from django.utils import timezone
    from django.core.mail import send_mail
    from django.conf import settings
    from apps.enrolments.models import Enrolment
    from apps.attendance.models import MakeupCredit
    from apps.users.models import Notification

    today = timezone.now().date()

    active_enrolments = Enrolment.objects.filter(
        class_session__season=instance,
        status='active',
    ).select_related('student', 'class_session')

    for enrolment in active_enrolments:
        enrolment.status = 'completed'
        enrolment.cancelled_date = today
        enrolment.save(update_fields=['status', 'cancelled_date'])

        Notification.objects.create(
            recipient=enrolment.student,
            title=f'{instance.name} has ended',
            body=(
                f'Your enrolment in {enrolment.class_session.name} for {instance.name} '
                f'has been marked as completed. Thanks for a great season!'
            ),
            notification_type='info',
            action_label='Book Next Season',
            action_url='/portal/book',
        )

    credits_to_expire = MakeupCredit.objects.filter(
        season=instance,
        status='available',
    ).select_related('student')

    for credit in credits_to_expire:
        credit.status = 'expired'
        credit.used_at = timezone.now()
        credit.save(update_fields=['status', 'used_at'])

        Notification.objects.create(
            recipient=credit.student,
            title='Catch-up credit expired',
            body=(
                f'Your catch-up credit ({credit.reason}) expired at the end of {instance.name}. '
                f'Catch-up credits do not carry over between seasons.'
            ),
            notification_type='info',
        )

        if credit.student.email:
            send_mail(
                subject=f'Catch-up credit expired — {instance.name} ended',
                message=(
                    f'Hi {credit.student.first_name},\n\n'
                    f'Your catch-up credit ({credit.reason}) has expired now that '
                    f'{instance.name} has ended. Catch-up credits do not carry over between seasons.\n\n'
                    f'If you think this is an error, please get in touch.\n\n'
                    f'Duality Pole Studio'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[credit.student.email],
                fail_silently=True,
            )


@receiver(post_save, sender='classes.ClassOccurrence')
def auto_credit_instructor(sender, instance, created, **kwargs):
    """Credit instructor when register is saved for the first time."""
    if not instance.register_saved:
        return
    if created:
        return  # only trigger on update (register being saved)

    instructor = instance.session.instructor
    if not instructor or instructor.role not in ('instructor', 'admin'):
        return

    from apps.users.models import InstructorPayRecord

    # Guard: don't double-create
    if InstructorPayRecord.objects.filter(occurrence=instance).exists():
        return

    session = instance.session
    if session.instructor_fee:
        rate = float(session.instructor_fee)
    else:
        rate = float(instructor.pay_rate or (30 if instructor.is_shadow_instructor else 40))

    session_name = session.name
    date_str = instance.date.strftime('%-d %b %Y') if instance.date else ''
    InstructorPayRecord.objects.create(
        instructor=instructor,
        occurrence=instance,
        date=instance.date,
        amount=rate,
        rate=rate,
        student_count=None,
        description=f'Class pay — {session_name} {date_str}',
        status='pending',
    )
