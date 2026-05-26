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


def _try_stripe_hold(enrolment):
    """
    Attempt to place a Stripe hold ($270) on the student's saved card for an
    auto-promoted season enrolment. Logs but never raises — enrolment proceeds
    regardless of Stripe outcome.
    """
    import os
    try:
        import stripe
        student = enrolment.student
        if not getattr(student, 'stripe_customer_id', '') or not getattr(student, 'default_payment_method_id', ''):
            # No saved card — add a staff note and continue
            from apps.users.models import StaffNote
            StaffNote.objects.create(
                student=student,
                created_by=None,
                tag='waitlist',
                body=(
                    f'Auto-promoted from waitlist for {enrolment.class_session.name}. '
                    'No saved card on file for Stripe hold.'
                ),
            )
            return

        stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
        intent = stripe.PaymentIntent.create(
            amount=27000,  # $270 hold — base 1-class price
            currency='aud',
            customer=student.stripe_customer_id,
            payment_method=student.default_payment_method_id,
            capture_method='manual',
            confirm=True,
            off_session=True,
            description=f'Waitlist auto-promote hold — {enrolment.class_session.name}',
            metadata={'enrolment_id': enrolment.id, 'student_id': student.id},
        )
        # Log the PaymentIntent ID as a staff note (no dedicated field on Enrolment)
        from apps.users.models import StaffNote
        StaffNote.objects.create(
            student=student,
            created_by=None,
            tag='waitlist',
            body=(
                f'Auto-promoted from waitlist for {enrolment.class_session.name}. '
                f'Stripe hold created: {intent.id}'
            ),
        )
    except Exception as exc:
        # Stripe failure must never block enrolment
        try:
            from apps.users.models import StaffNote
            StaffNote.objects.create(
                student=enrolment.student,
                created_by=None,
                tag='waitlist',
                body=(
                    f'Auto-promoted from waitlist for {enrolment.class_session.name}. '
                    f'Stripe hold failed: {exc}'
                ),
            )
        except Exception:
            pass


def _cascade_season_waitlist_offer(session, skip_enrolment_id=None):
    """
    Find the next eligible waitlisted season enrolment and either auto-enrol
    (if student_auto_promote=True) or send a 12h offer.

    Called after:
    - A student explicitly rejects an offer (skip_enrolment_id=rejected id)
    - A management command expires an offer (skip_enrolment_id=expired id)
    """
    from apps.users.models import AutomationRule, Notification
    from .models import Enrolment

    rule = AutomationRule.objects.filter(slug='waitlist_notify').first()
    if rule and not rule.enabled:
        return

    qs = Enrolment.objects.filter(
        class_session=session,
        status='waitlisted',
        waitlist_offered_at__isnull=True,
        waitlist_offer_rejected=False,
    ).order_by('waitlist_position', 'id').select_related('student')

    if skip_enrolment_id:
        qs = qs.exclude(pk=skip_enrolment_id)

    next_enrolment = qs.first()
    if not next_enrolment:
        return

    now = timezone.now()
    student = next_enrolment.student

    # Student opted in to auto-promote
    if next_enrolment.student_auto_promote and not next_enrolment.waitlist_skip_auto_promote:
        next_enrolment.status = 'active'
        next_enrolment.waitlist_offered_at = None
        next_enrolment.waitlist_expires_at = None
        next_enrolment.waitlist_urgent = False
        next_enrolment.waitlist_position = None
        next_enrolment.save(update_fields=['status', 'waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent', 'waitlist_position'])
        Notification.objects.create(
            recipient=student,
            title=f"You're in! — {session.name}",
            body=f"A spot opened up in {session.name} and you've been automatically enrolled as you opted in to auto-enrol!",
            notification_type='success',
            action_label='View My Classes',
            action_url='/portal/classes',
        )
        prefs = student.notification_preferences or {}
        if prefs.get('waitlist_email', True) and student.email:
            send_mail(
                subject=f"You're enrolled — {session.name}!",
                message=(
                    f"Hi {student.first_name},\n\n"
                    f"A spot opened up in {session.name} and you've been automatically enrolled from the waitlist.\n\n"
                    "Log in to view your updated schedule.\n\n"
                    "Duality Pole Studio"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[student.email],
                fail_silently=True,
            )
        _try_stripe_hold(next_enrolment)
        return

    # Standard 12h offer to this student only
    expires_at = now + timedelta(hours=12)
    expires_str = expires_at.strftime('%I:%M %p')

    next_enrolment.waitlist_offered_at = now
    next_enrolment.waitlist_expires_at = expires_at
    next_enrolment.waitlist_urgent = False
    next_enrolment.save(update_fields=['waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent'])

    prefs = student.notification_preferences or {}
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
            subject=f"A spot has opened up — {session.name}!",
            message=(
                f"Hi {student.first_name},\n\n"
                f"Great news — a spot has opened up in {session.name}!\n\n"
                f"You have 12 hours to claim your spot (until {expires_str}). "
                "If you don't confirm by then, your spot will be offered to the next person on the waitlist.\n\n"
                "Log in to confirm your enrolment.\n\n"
                "Duality Pole Studio"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            fail_silently=True,
        )


def _offer_waitlist_spot(session):
    """
    When a spot opens in a session:
    - If auto_promote_waitlist (admin toggle) is enabled: directly enrol #1 eligible waitlisted student.
    - Otherwise: 12h offer to #1 only (no urgent/today logic for season enrolments).
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
            waitlist_offered_at__isnull=True,
            waitlist_offer_rejected=False,
        ).order_by('waitlist_position', 'id').select_related('student')
    )
    if not waitlisted:
        return

    # Admin auto-promote toggle: skip the offer/claim step and directly enrol the next eligible student
    if getattr(session, 'auto_promote_waitlist', False):
        eligible = [e for e in waitlisted if not e.waitlist_skip_auto_promote]
        if not eligible:
            return
        enrolment = eligible[0]
        enrolment.status = 'active'
        enrolment.waitlist_offered_at = None
        enrolment.waitlist_expires_at = None
        enrolment.waitlist_urgent = False
        enrolment.waitlist_position = None
        enrolment.save(update_fields=['status', 'waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent', 'waitlist_position'])
        Notification.objects.create(
            recipient=enrolment.student,
            title=f"You're in! — {session.name}",
            body=f"A spot opened up in {session.name} and you've been automatically enrolled from the waitlist!",
            notification_type='success',
            action_label='View My Classes',
            action_url='/portal/classes',
        )
        student = enrolment.student
        prefs = student.notification_preferences or {}
        if prefs.get('waitlist_email', True) and student.email:
            send_mail(
                subject=f"You're enrolled — {session.name}!",
                message=(
                    f"Hi {student.first_name},\n\n"
                    f"A spot opened up in {session.name} and you've been automatically enrolled from the waitlist.\n\n"
                    "Log in to view your updated schedule.\n\n"
                    "Duality Pole Studio"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[student.email],
                fail_silently=True,
            )
        return

    # Always 12h, #1 only — no urgent/today check for season enrolments
    now = timezone.now()
    expires_at = now + timedelta(hours=12)
    expires_str = expires_at.strftime('%I:%M %p')
    to_offer = waitlisted[:1]

    email_subject = f"A spot has opened up — {session.name}!"
    email_body_template = (
        "Hi {first_name},\n\n"
        "Great news — a spot has opened up in {class_name}!\n\n"
        "You have 12 hours to claim your spot (until {expires}). "
        "If you don't confirm by then, your spot will be offered to the next person on the waitlist.\n\n"
        "Log in to confirm your enrolment.\n\n"
        "Duality Pole Studio"
    )

    for enrolment in to_offer:
        student = enrolment.student
        prefs = student.notification_preferences or {}

        enrolment.waitlist_offered_at = now
        enrolment.waitlist_expires_at = expires_at
        enrolment.waitlist_urgent = False
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
