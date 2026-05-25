from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


def _is_silent_hours():
    """True if it's between 10pm and 7am Sydney time."""
    import pytz
    try:
        tz = pytz.timezone('Australia/Sydney')
        now_local = timezone.now().astimezone(tz)
        hour = now_local.hour
        return hour >= 22 or hour < 7
    except Exception:
        return False


def _offer_waitlist_spot(session):
    """
    When a spot opens in a session:
    - If the next class occurrence is within 4 hours AND it's not silent hours:
      notify ALL waitlisted students simultaneously (first to claim wins).
    - Otherwise: notify only the #1 student, give them 4 hours to claim.
    """
    from apps.users.models import AutomationRule, Notification
    from .models import Enrolment

    rule = AutomationRule.objects.filter(slug='waitlist_notify').first()
    if rule and not rule.enabled:
        return

    waitlisted = list(
        Enrolment.objects.filter(
            class_session=session,
            status='waitlisted',
            waitlist_offered_at__isnull=True,  # not already offered
        ).order_by('id').select_related('student')
    )
    if not waitlisted:
        return

    # Determine how far away the next class occurrence is
    import datetime
    now = timezone.now()
    next_occurrence = None
    try:
        # Try to find the next ClassOccurrence
        from apps.classes.models import ClassOccurrence
        occ = ClassOccurrence.objects.filter(
            session=session, date__gte=now.date()
        ).order_by('date').first()
        if occ:
            occ_dt = timezone.make_aware(
                datetime.datetime.combine(occ.date, occ.start_time),
                timezone.get_current_timezone()
            )
            next_occurrence = occ_dt
    except Exception:
        pass

    hours_until_class = None
    if next_occurrence:
        hours_until_class = (next_occurrence - now).total_seconds() / 3600

    urgent = (
        hours_until_class is not None
        and hours_until_class <= 4
        and not _is_silent_hours()
    )

    expires_at = now + timedelta(hours=4)

    # Get the custom email body if configured
    email_subject = f"A spot has opened up — {session.name}!"
    if urgent:
        email_body_template = (
            "Hi {first_name},\n\n"
            "A spot has just opened in {class_name} which starts very soon!\n\n"
            "Because the class is starting within 4 hours, this offer is open to all waitlisted students — "
            "the first person to confirm their spot gets it.\n\n"
            "You have until {expires} to claim your spot. Log in now to confirm.\n\n"
            "Duality Pole Studio"
        )
        to_offer = waitlisted  # notify all
    else:
        email_body_template = (
            "Hi {first_name},\n\n"
            "Great news — a spot has opened up in {class_name}!\n\n"
            "You have 4 hours to claim your spot (until {expires}). "
            "If you don't confirm by then, your spot will be offered to the next person on the waitlist.\n\n"
            "Log in to confirm your enrolment.\n\n"
            "Duality Pole Studio"
        )
        to_offer = waitlisted[:1]  # notify only #1

    expires_str = expires_at.strftime('%I:%M %p')
    for enrolment in to_offer:
        student = enrolment.student
        prefs = student.notification_preferences or {}

        enrolment.waitlist_offered_at = now
        enrolment.waitlist_expires_at = expires_at
        enrolment.waitlist_urgent = urgent
        enrolment.save(update_fields=['waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent'])

        if prefs.get('waitlist_app', True):
            Notification.objects.create(
                recipient=student,
                title=f"Spot available — {session.name}",
                body=f"A spot opened up! You have until {expires_str} to claim it. Tap to confirm.",
                notification_type='waitlist',
                action_label='Claim My Spot',
                action_url='/portal/classes',
            )

        if prefs.get('waitlist_email', True) and student.email:
            send_mail(
                subject=email_subject,
                message=email_body_template.format(
                    first_name=student.first_name,
                    class_name=session.name,
                    expires=expires_str,
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[student.email],
                fail_silently=True,
            )


def _send_waitlist_reminder(enrolment):
    """Send a reminder 30 minutes before the offer expires."""
    from apps.users.models import Notification
    student = enrolment.student
    session = enrolment.class_session
    prefs = student.notification_preferences or {}

    if prefs.get('waitlist_app', True):
        Notification.objects.create(
            recipient=student,
            title=f"30 mins left to claim — {session.name}",
            body="Your waitlist offer expires soon! Log in now to confirm your spot.",
            notification_type='waitlist',
            action_label='Claim My Spot',
            action_url='/portal/classes',
        )

    if prefs.get('waitlist_email', True) and student.email:
        send_mail(
            subject=f"Last chance to claim your spot — {session.name}",
            message=(
                f"Hi {student.first_name},\n\n"
                f"Just a reminder — your spot in {session.name} expires in 30 minutes.\n\n"
                f"Log in to confirm before you lose your place.\n\n"
                f"Duality Pole Studio"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            fail_silently=True,
        )


@receiver(post_save, sender='enrolments.Enrolment')
def handle_enrolment_change(sender, instance, created, **kwargs):
    from apps.users.automation_engine import run_custom_automations

    session = instance.class_session
    student = instance.student
    context = {
        'class_name': session.name if session else '',
        'class_level': getattr(session, 'level', '') or '',
    }

    class_name = session.name if session else 'your class'
    day = ''
    if session and session.day_of_week is not None:
        day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][session.day_of_week]
    time_str = ''
    if session and session.start_time:
        try:
            t = session.start_time
            hour = t.hour % 12 or 12
            ampm = 'am' if t.hour < 12 else 'pm'
            time_str = f' at {hour}:{t.minute:02d}{ampm}'
        except Exception:
            pass

    # ── Booking confirmation ─────────────────────────────────────────────────
    if created and instance.status == 'active' and student and student.email:
        send_mail(
            subject=f'Booking confirmed — {class_name}',
            message=(
                f'Hi {student.first_name},\n\n'
                f'Your booking for {class_name} ({day}{time_str}) has been confirmed.\n\n'
                f'We look forward to seeing you in class!\n\n'
                f'Duality Pole Studio'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            fail_silently=True,
        )

    # ── Cancellation confirmation ────────────────────────────────────────────
    if not created and instance.status == 'cancelled' and student and student.email:
        send_mail(
            subject=f'Enrolment cancelled — {class_name}',
            message=(
                f'Hi {student.first_name},\n\n'
                f'Your enrolment in {class_name} ({day}{time_str}) has been cancelled.\n\n'
                f'If you have any questions, please contact the studio.\n\n'
                f'Duality Pole Studio'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            fail_silently=True,
        )

    # When a spot opens, offer it to waitlisted students
    if not created and instance.status in ('cancelled', 'completed'):
        _offer_waitlist_spot(session)
        run_custom_automations('enrolment_cancelled', student, context)

    # Fire enrolment_active trigger for new active enrolments
    if instance.status == 'active':
        run_custom_automations('enrolment_active', student, context)

    # Auto-grant Kisi access for new active enrolments
    if created and instance.status == 'active' and student:
        try:
            from apps.users.models import StudioSettings
            from apps.classes.models import KisiGrant, ClassOccurrence
            from apps.classes import kisi_service
            import datetime as _dt
            settings_obj = StudioSettings.objects.first()
            place_id = settings_obj.kisi_enrolment_place_id if settings_obj else ''
            if place_id and settings_obj.kisi_api_key:
                season = session.season if session else None
                if instance.enrolment_type in ('casual', 'trial', 'catchup'):
                    # Access: 45 min before class starts, until 4m59s into class
                    occ = ClassOccurrence.objects.filter(
                        session=session, date__gte=timezone.now().date()
                    ).order_by('date').first()
                    if occ:
                        class_start = _dt.datetime.combine(occ.date, session.start_time)
                        valid_from = class_start - _dt.timedelta(minutes=45)
                        valid_until = class_start + _dt.timedelta(minutes=4, seconds=59)
                    else:
                        valid_from = timezone.now()
                        valid_until = valid_from + _dt.timedelta(minutes=50)
                elif season and season.start_date:
                    valid_from = _dt.datetime.combine(season.start_date, _dt.time(0, 0))
                    valid_until = _dt.datetime.combine(season.end_date, _dt.time(23, 59)) if season.end_date else None
                else:
                    valid_from = timezone.now()
                    valid_until = None
                link_data = kisi_service.create_link(
                    place_id=place_id,
                    name=f'{student.display_name} — {session.name if session else "enrolment"}',
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
            pass  # Kisi failure should never break enrolment

    # Revoke Kisi access when a full season enrolment is cancelled
    if not created and instance.status == 'cancelled' and instance.enrolment_type not in ('casual', 'trial', 'catchup') and student:
        try:
            from apps.users.models import StudioSettings
            from apps.classes.models import KisiGrant
            from apps.classes import kisi_service
            settings_obj = StudioSettings.objects.first()
            if settings_obj and settings_obj.kisi_api_key:
                season = session.season if session else None
                if season and season.end_date:
                    grants = KisiGrant.objects.filter(
                        student=student,
                        revoked=False,
                        valid_until__date=season.end_date,
                    )
                    for grant in grants:
                        if grant.kisi_link_id:
                            kisi_service.revoke_link(grant.kisi_link_id)
                        grant.revoked = True
                        grant.save(update_fields=['revoked'])
        except Exception:
            pass  # Kisi failure should never break cancellation
