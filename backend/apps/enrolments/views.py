import datetime
import pytz
from decimal import Decimal
from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Enrolment, ClassChangeRequest
from .serializers import EnrolmentSerializer, ClassChangeRequestSerializer
from apps.users.permissions import IsAdminOrInstructor


def get_displacement_window(occ_date, start_time):
    sydney_tz = pytz.timezone('Australia/Sydney')
    now = datetime.datetime.now(sydney_tz)
    class_dt = sydney_tz.localize(datetime.datetime.combine(occ_date, start_time))
    hours_until = (class_dt - now).total_seconds() / 3600
    if hours_until < 4:
        return datetime.timedelta(hours=1)
    elif hours_until < 12:
        return datetime.timedelta(hours=2)
    else:
        return datetime.timedelta(hours=12)


def _trigger_displacement_if_needed(enrolment):
    """Check if the new enrolment displaces casual bookings and handle accordingly."""
    if enrolment.enrolment_type != 'course' or enrolment.status != 'active':
        return

    from apps.classes.models import CasualBooking, ClassOccurrence
    from apps.users.models import Notification

    session = enrolment.class_session
    season_count = Enrolment.objects.filter(
        class_session=session,
        status__in=['active', 'pending_displacement'],
        enrolment_type='course',
    ).count()

    if season_count < session.capacity:
        return

    # Class is at capacity with season students — check for casual bookings
    today = datetime.date.today()
    future_occs = ClassOccurrence.objects.filter(session=session, date__gte=today)
    casuals = CasualBooking.objects.filter(
        occurrence__in=future_occs, status='confirmed'
    ).select_related('student', 'occurrence')

    if not casuals.exists():
        return

    # Calculate window based on earliest upcoming occurrence
    earliest_occ = casuals.order_by('occurrence__date').first().occurrence
    window = get_displacement_window(earliest_occ.date, enrolment.class_session.start_time)

    # Set the enrolment to pending_displacement
    enrolment.status = 'pending_displacement'
    enrolment.displacement_casual_booking = casuals.first()
    enrolment.displacement_expires_at = timezone.now() + window
    enrolment.save(update_fields=['status', 'displacement_casual_booking', 'displacement_expires_at'])

    hours = int(window.total_seconds() / 3600)

    for casual in casuals:
        c_window = get_displacement_window(casual.occurrence.date, casual.occurrence.session.start_time)
        c_expires_at = timezone.now() + c_window
        c_hours = int(c_window.total_seconds() / 3600)
        casual.displacement_offered_at = timezone.now()
        casual.displacement_expires_at = c_expires_at
        casual.save(update_fields=['displacement_offered_at', 'displacement_expires_at'])

        Notification.objects.create(
            recipient=casual.student,
            title=f'Upgrade offer — {session.name}',
            body=(
                f'A student wants to enrol in {session.name} for the full season. '
                f'Upgrade your casual booking to a full season enrolment within {c_hours} hour{"s" if c_hours != 1 else ""}, '
                f'or unfortunately your spot will be released and your account credited with the amount paid.'
            ),
            notification_type='warning',
            action_label='View Offer',
            action_url='/portal/classes',
        )
        send_mail(
            subject=f'Action required: Upgrade or release your spot — {session.name}',
            message=(
                f'Hi {casual.student.first_name},\n\n'
                f'A student wants to enrol in {session.name} for the full season. '
                f'You have {c_hours} hour{"s" if c_hours != 1 else ""} to decide:\n\n'
                f'• Upgrade to a full season enrolment\n'
                f'• Release your spot (your account will be credited ${casual.price_charged})\n'
                f'• Message Duality if you have questions\n\n'
                f'Log in to your student portal to respond:\n'
                f'{getattr(settings, "FRONTEND_URL", "https://dualitypole.com.au")}/portal/classes\n\n'
                f'Duality Pole Studio'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[casual.student.email],
            fail_silently=True,
        )

    Notification.objects.create(
        recipient=enrolment.student,
        title=f'Almost there — {session.name}',
        body=(
            f'There is a spot in the season, however a casual is taking up one of those spots. '
            f"We've given the casual {hours} hour{'s' if hours != 1 else ''} to upgrade to a full season enrolment "
            f"— and if they don't, the spot is yours! We'll confirm your spot as soon as it's resolved."
        ),
        notification_type='info',
        action_label='View My Classes',
        action_url='/portal/classes',
    )


SEASON_PRICES = {1: 270, 2: 440, 3: 580, 4: 700, 5: 800, 6: 900}

DEFAULT_DISCOUNT_TIERS = {"2": 100, "3": 130, "4": 150, "5": 170, "6": 170}


def _get_class_incremental_price(session, position):
    """Return price for adding a class at the given enrolment position (1-indexed)."""
    from apps.users.models import StudioSettings
    settings = StudioSettings.objects.first()
    base_price = (
        Decimal(str(session.category.standalone_price))
        if session.category and session.category.standalone_price is not None
        else Decimal(str(settings.price_season if settings else 270))
    )
    # Season-level tiers take priority over studio-level tiers
    season_tiers = (session.season.discount_tiers or {}) if session.season_id else {}
    studio_tiers = (settings.season_discount_tiers or {}) if settings else {}
    tiers = season_tiers or studio_tiers or DEFAULT_DISCOUNT_TIERS
    discount = Decimal(str(tiers.get(str(position), 0)))
    return max(Decimal('0'), base_price - discount)


@api_view(['GET'])
@permission_classes([IsAdminOrInstructor])
def enrolment_pricing(request):
    """Return the price for adding a class to a student's schedule.

    GET /api/enrolments/pricing/?student=X&session=Y
    """
    student_id = request.query_params.get('student')
    session_id = request.query_params.get('session')

    if not student_id or not session_id:
        return Response({'detail': 'student and session params are required.'}, status=status.HTTP_400_BAD_REQUEST)

    from apps.classes.models import ClassSession

    try:
        session = ClassSession.objects.select_related('category').get(pk=session_id)
    except ClassSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

    count = Enrolment.objects.filter(student_id=student_id, status='active').count()
    position = count + 1
    price = _get_class_incremental_price(session, position)

    return Response({
        'price': price,
        'num_enrolments': count,
        'is_addon': count > 0,
    })


class EnrolmentListView(generics.ListCreateAPIView):
    serializer_class = EnrolmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Enrolment.objects.select_related('student', 'class_session__studio')
        # Students can only see their own enrolments
        if user.role == 'student':
            qs = qs.filter(student=user)
            status_ = self.request.query_params.get('status')
            if status_:
                qs = qs.filter(status=status_)
        else:
            student_id = self.request.query_params.get('student')
            session_id = self.request.query_params.get('session')
            status_ = self.request.query_params.get('status')
            if student_id:
                qs = qs.filter(student_id=student_id)
            if session_id:
                qs = qs.filter(class_session_id=session_id)
            if status_:
                qs = qs.filter(status=status_)
        enrolment_type = self.request.query_params.get('enrolment_type')
        if enrolment_type:
            types = [t.strip() for t in enrolment_type.split(',') if t.strip()]
            qs = qs.filter(enrolment_type__in=types)
        return qs

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError
        from apps.payments.models import Payment
        from django.db.models import Sum

        user = self.request.user
        enrolment_type = serializer.validated_data.get('enrolment_type', 'course')
        session = serializer.validated_data.get('class_session')

        # Season booking gate — course/catchup enrolments only (not casual/trial)
        if user.role == 'student' and session and enrolment_type in ('course', 'catchup', 'catch_up'):
            season = getattr(session, 'season', None)
            if season and not season.bookings_open:
                raise ValidationError(
                    f'Bookings for {season.name} are not open yet. '
                    'Keep an eye on your email for when they open!'
                )

        # Catch-up cutoff week gate
        if session and enrolment_type in ('catchup', 'catch_up'):
            cutoff = getattr(session, 'catchup_cutoff_weeks', None)
            season = getattr(session, 'season', None)
            if cutoff is not None and season and season.start_date:
                today = timezone.localdate()
                week_number = (today - season.start_date).days // 7 + 1
                if week_number > cutoff:
                    raise ValidationError(
                        f'Catch-up bookings for {session.name} closed after week {cutoff} of the season.'
                    )

        # Block students with outstanding required forms from booking course/catchup
        if user.role == 'student' and enrolment_type in ('course', 'catchup', 'catch_up'):
            from apps.users.models import StudioSettings, StudentForm
            settings = StudioSettings.get()
            required_map = {
                'parq': settings.form_health_required,
                'waiver': settings.form_waiver_required,
                'photo_consent': settings.form_photo_consent_required,
                'season_agreement': settings.form_season_agreement_required,
            }
            required_types = [k for k, v in required_map.items() if v]
            if required_types:
                completed = set(
                    StudentForm.objects.filter(
                        student=user, form_type__in=required_types, completed=True,
                    ).values_list('form_type', flat=True)
                )
                pending = [ft.replace('_', ' ').title() for ft in required_types if ft not in completed]
                if pending:
                    raise ValidationError(
                        f'Please complete your required forms before booking: {", ".join(pending)}.'
                    )

        # Block students whose account has been placed on hold
        if user.role == 'student' and user.booking_blocked:
            raise PermissionDenied(
                'Your account is currently on hold due to an outstanding balance. '
                'Please settle your account before booking.'
            )
            enrolment = serializer.save(student=user)
        else:
            enrolment = serializer.save()

        # Deduct a makeup credit for catchup enrolments
        if enrolment.enrolment_type in ('catchup', 'catch_up'):
            from apps.attendance.models import MakeupCredit
            credit = MakeupCredit.objects.filter(
                student=enrolment.student, status='available'
            ).order_by('created_at').first()
            if credit:
                credit.status = 'used'
                credit.used_at = timezone.now()
                credit.save(update_fields=['status', 'used_at'])

        # Auto-issue catch-up credits for weeks missed when enrolling mid-season
        if enrolment.enrolment_type == 'course' and enrolment.status == 'active':
            session = enrolment.class_session
            season = getattr(session, 'season', None)
            if season and season.start_date:
                today = timezone.localdate()
                week_number = (today - season.start_date).days // 7 + 1
                missed_weeks = week_number - 1
                if missed_weeks > 0:
                    from apps.attendance.models import MakeupCredit
                    for _ in range(missed_weeks):
                        MakeupCredit.objects.create(
                            student=enrolment.student,
                            status='available',
                            season=season,
                            reason=f'Auto-issued: joined {session.name} in week {week_number}',
                        )

        _trigger_displacement_if_needed(enrolment)


class EnrolmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EnrolmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Enrolment.objects.select_related('student', 'class_session__studio')
        if user.role == 'student':
            return qs.filter(student=user)
        return qs


class ConvertTrialView(APIView):
    """Convert a trial enrolment to a full course enrolment and record the payment."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            enrolment = Enrolment.objects.select_related('student', 'class_session').get(pk=pk)
        except Enrolment.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if enrolment.enrolment_type != 'trial':
            return Response({'detail': 'Enrolment is not a trial.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.payments.models import Payment, PaymentPlan, PaymentPlanInstalment
        from apps.users.models import StudioSettings
        from decimal import Decimal

        studio = StudioSettings.get()
        season_price = float(studio.price_season)
        trial_price = float(studio.price_trial)

        description = request.data.get(
            'description',
            f'Season enrolment — {enrolment.class_session.name} (converted from trial)'
        )
        notes = request.data.get('notes', '')

        enrolment.enrolment_type = 'course'
        enrolment.notes = (enrolment.notes + '\n' + notes).strip() if notes else enrolment.notes
        enrolment.save(update_fields=['enrolment_type', 'notes'])

        use_plan = request.data.get('payment_plan', False)
        instalments_data = request.data.get('instalments', [])

        if use_plan and instalments_data:
            total = sum(float(i['amount']) for i in instalments_data)
            plan = PaymentPlan.objects.create(
                student=enrolment.student,
                description=description,
                total_amount=Decimal(str(total)),
                status='active',
                created_by=request.user,
            )
            for inst in instalments_data:
                PaymentPlanInstalment.objects.create(
                    plan=plan,
                    amount=Decimal(str(inst['amount'])),
                    due_date=inst['due_date'],
                    status='pending',
                )
            return Response({
                'enrolment': EnrolmentSerializer(enrolment).data,
                'plan_id': plan.id,
                'total_amount': str(plan.total_amount),
            }, status=status.HTTP_200_OK)

        # Single payment
        amount_paid = float(request.data.get('amount_paid', season_price - trial_price))
        payment_type = request.data.get('payment_type', 'payment')
        reference = request.data.get('reference', '')

        payment = Payment.objects.create(
            student=enrolment.student,
            payment_type=payment_type,
            amount=amount_paid,
            description=description,
            reference=reference,
            created_by=request.user,
        )

        return Response({
            'enrolment': EnrolmentSerializer(enrolment).data,
            'payment_id': payment.id,
            'amount_charged': str(payment.amount),
        }, status=status.HTTP_200_OK)


class ClaimWaitlistSpotView(APIView):
    """Student claims their offered waitlist spot before it expires."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            enrolment = Enrolment.objects.select_related('student', 'class_session').get(
                pk=pk, student=request.user, status='waitlisted'
            )
        except Enrolment.DoesNotExist:
            return Response({'detail': 'Waitlist enrolment not found.'}, status=404)

        if not enrolment.waitlist_offered_at:
            return Response({'detail': 'No spot offer active for this enrolment.'}, status=400)

        if enrolment.waitlist_expires_at and timezone.now() > enrolment.waitlist_expires_at:
            return Response({'detail': 'This offer has expired. We\'ll let you know when the next spot opens.'}, status=400)

        session = enrolment.class_session

        # If urgent (all notified), check if spot still available (capacity)
        if enrolment.waitlist_urgent:
            active_count = Enrolment.objects.filter(
                class_session=session, status='active'
            ).count()
            capacity = getattr(session, 'max_students', None)
            if capacity and active_count >= capacity:
                # Spot taken by someone else
                enrolment.waitlist_offered_at = None
                enrolment.waitlist_expires_at = None
                enrolment.save(update_fields=['waitlist_offered_at', 'waitlist_expires_at'])
                return Response({'detail': 'Sorry — this spot was just taken by another student. We\'ll notify you if another opens.'}, status=409)

        # Promote to active
        enrolment.status = 'active'
        enrolment.waitlist_offered_at = None
        enrolment.waitlist_expires_at = None
        enrolment.waitlist_urgent = False
        enrolment.save(update_fields=['status', 'waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent'])

        # Cancel pending offers for other students on the same session (urgent mode)
        Enrolment.objects.filter(
            class_session=session, status='waitlisted', waitlist_offered_at__isnull=False
        ).exclude(pk=pk).update(
            waitlist_offered_at=None, waitlist_expires_at=None, waitlist_urgent=False
        )

        return Response(EnrolmentSerializer(enrolment).data, status=200)


class CalendarIcsView(APIView):
    """Generate an ICS calendar feed for the authenticated student's active enrolments."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        student = request.user
        enrolments = Enrolment.objects.filter(
            student=student, status='active'
        ).select_related('class_session', 'class_session__season', 'class_session__studio')

        lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Duality Pole Studio//Schedule//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            f'X-WR-CALNAME:Duality Pole — {student.first_name}\'s Classes',
            'X-WR-TIMEZONE:Australia/Sydney',
        ]

        for enrolment in enrolments:
            session = enrolment.class_session
            season = session.season
            if not season:
                continue

            # Generate weekly recurring events for the season
            # day_of_week: 0=Monday, 6=Sunday
            start_date = season.start_date
            end_date = season.end_date

            # Find the first occurrence on or after start_date
            days_ahead = (session.day_of_week - start_date.weekday()) % 7
            first_date = start_date + datetime.timedelta(days=days_ahead)

            current = first_date
            rrule_days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
            rrule_day = rrule_days[session.day_of_week]
            until_str = end_date.strftime('%Y%m%d') + 'T235959Z'

            if current <= end_date:
                duration_mins = getattr(session, 'duration_minutes', 60)
                start_dt = datetime.datetime.combine(current, session.start_time)
                end_dt = start_dt + datetime.timedelta(minutes=duration_mins)

                uid = f'enrolment-{enrolment.id}-{session.id}@dualitypole.com'
                dtstart = start_dt.strftime('%Y%m%dT%H%M%S')
                dtend = end_dt.strftime('%Y%m%dT%H%M%S')
                dtstamp = timezone.now().strftime('%Y%m%dT%H%M%SZ')
                location = session.studio.name if session.studio else 'Duality Pole Studio'
                summary = session.name

                lines += [
                    'BEGIN:VEVENT',
                    f'UID:{uid}',
                    f'DTSTAMP:{dtstamp}',
                    f'DTSTART;TZID=Australia/Sydney:{dtstart}',
                    f'DTEND;TZID=Australia/Sydney:{dtend}',
                    f'RRULE:FREQ=WEEKLY;BYDAY={rrule_day};UNTIL={until_str}',
                    f'SUMMARY:{summary}',
                    f'LOCATION:{location}',
                    f'DESCRIPTION:with {session.instructor.display_name if session.instructor else "instructor"}',
                    'END:VEVENT',
                ]

        lines.append('END:VCALENDAR')

        ics_content = '\r\n'.join(lines) + '\r\n'
        response = HttpResponse(ics_content, content_type='text/calendar; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="duality-pole-classes.ics"'
        return response


class FlaggedEnrolmentsView(generics.ListAPIView):
    permission_classes = [IsAdminOrInstructor]
    serializer_class = EnrolmentSerializer

    def get_queryset(self):
        return Enrolment.objects.filter(
            level_override=True,
            flag_dismissed=False,
            status='active',
        ).select_related('student', 'class_session')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = []
        for e in qs:
            data.append({
                'id': e.id,
                'student_id': e.student_id,
                'student_name': e.student.display_name,
                'session_name': e.class_session.name,
                'session_id': e.class_session_id,
                'flag_reason': 'Self-enrolled above assessed level',
            })
        return Response(data)

    def patch(self, request, pk=None):
        """Dismiss a flag."""
        enrolment = get_object_or_404(Enrolment, pk=pk)
        enrolment.flag_dismissed = True
        enrolment.save(update_fields=['flag_dismissed'])
        return Response({'status': 'dismissed'})


class PendingTrialFeedbackView(APIView):
    """Return trial enrolments that are past their class date and have no feedback yet."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import TrialFeedback
        from apps.classes.models import ClassOccurrence
        from django.utils import timezone as tz

        today = tz.localdate()
        trial_enrolments = Enrolment.objects.filter(
            student=request.user,
            enrolment_type='trial',
            enrolled_date__lte=today,
        ).exclude(
            trial_feedback__isnull=False
        ).select_related('class_session__season', 'class_session__category')

        results = []
        for enrolment in trial_enrolments:
            session = enrolment.class_session
            season = getattr(session, 'season', None)

            # Count remaining occurrences in the season
            remaining = 0
            if season and season.end_date:
                remaining = ClassOccurrence.objects.filter(
                    session=session,
                    date__gt=today,
                    date__lte=season.end_date,
                ).count()

            # Calculate enrol price (full season minus trial credit)
            from apps.users.models import StudioSettings
            studio = StudioSettings.get()
            season_price = float(studio.price_season)
            trial_price = float(studio.price_trial)
            enrol_price = max(0, season_price - trial_price)

            results.append({
                'id': enrolment.id,
                'session_name': session.name,
                'season_name': season.name if season else None,
                'remaining_classes': remaining,
                'enrol_price': enrol_price,
                'trial_price': trial_price,
            })

        return Response(results)


class SubmitTrialFeedbackView(APIView):
    """Submit (or skip) post-trial feedback for a trial enrolment."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from .models import TrialFeedback

        enrolment = get_object_or_404(
            Enrolment, pk=pk, student=request.user, enrolment_type='trial'
        )

        if hasattr(enrolment, 'trial_feedback'):
            return Response({'detail': 'Feedback already submitted.'}, status=status.HTTP_400_BAD_REQUEST)

        enrolled = bool(request.data.get('enrolled', False))
        TrialFeedback.objects.create(
            enrolment=enrolment,
            enrolled=enrolled,
            class_rating=request.data.get('class_rating') or None,
            instructor_rating=request.data.get('instructor_rating') or None,
            facilities_rating=request.data.get('facilities_rating') or None,
            structure_rating=request.data.get('structure_rating') or None,
            reason=request.data.get('reason', ''),
        )
        return Response({'status': 'ok'})


class StudentTrialEnrolView(APIView):
    """Student self-service: convert their own trial into a full season enrolment."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from apps.payments.models import Payment
        from apps.users.models import StudioSettings, Notification
        from apps.users.email_utils import send_branded_email
        from decimal import Decimal

        try:
            enrolment = Enrolment.objects.select_related('student', 'class_session').get(
                pk=pk, student=request.user, enrolment_type='trial'
            )
        except Enrolment.DoesNotExist:
            return Response({'detail': 'Trial enrolment not found.'}, status=status.HTTP_404_NOT_FOUND)

        studio = StudioSettings.get()
        season_price = float(studio.price_season)
        trial_price = float(studio.price_trial)
        remaining = round(max(0, season_price - trial_price), 2)

        payment_method = request.data.get('payment_method')  # 'stripe', 'plan', 'cash'
        payment_intent_id = request.data.get('payment_intent_id', '')
        amount = float(request.data.get('amount', remaining))

        if payment_method not in ('stripe', 'plan', 'cash'):
            return Response(
                {'detail': 'payment_method must be stripe, plan, or cash.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convert enrolment
        enrolment.enrolment_type = 'course'
        enrolment.save(update_fields=['enrolment_type'])
        session_name = enrolment.class_session.name

        if payment_method == 'stripe':
            Payment.objects.create(
                student=request.user,
                payment_type=Payment.PaymentType.PAYMENT,
                amount=Decimal(str(amount)),
                description=f'Season enrolment — {session_name} (converted from trial)',
                reference=payment_intent_id,
                created_by=None,
            )
        elif payment_method == 'plan':
            # Half now (paid via Stripe), half later (charge / owing)
            half = round(amount / 2, 2)
            remainder = round(amount - half, 2)
            Payment.objects.create(
                student=request.user,
                payment_type=Payment.PaymentType.PAYMENT,
                amount=Decimal(str(half)),
                description=f'Season enrolment — {session_name}, instalment 1 of 2',
                reference=payment_intent_id,
                created_by=None,
            )
            Payment.objects.create(
                student=request.user,
                payment_type=Payment.PaymentType.CHARGE,
                amount=Decimal(str(remainder)),
                description=f'Season enrolment — {session_name}, instalment 2 of 2 (due in 30 days)',
                created_by=None,
            )
        elif payment_method == 'cash':
            cash_promised_date = request.data.get('cash_promised_date') or None
            Payment.objects.create(
                student=request.user,
                payment_type=Payment.PaymentType.CHARGE,
                amount=Decimal(str(remaining)),
                description=f'Season enrolment — {session_name} (pay at studio)',
                created_by=None,
                cash_promised_date=cash_promised_date,
            )

        Notification.objects.create(
            recipient=request.user,
            title=f"You're enrolled in {session_name}!",
            body=f"Welcome to the season. We can't wait to see you in class.",
            notification_type='success',
        )

        if request.user.email:
            send_branded_email(
                to_email=request.user.email,
                subject=f"You're enrolled — {session_name}",
                template_name='payment_received',
                context={
                    'first_name': request.user.first_name,
                    'amount': f'{amount:.2f}',
                    'description': f'Season enrolment — {session_name}',
                    'plain_text': (
                        f"Hi {request.user.first_name},\n\n"
                        f"You're all set for {session_name}! "
                        f"We've recorded your enrolment and look forward to seeing you in class.\n\n"
                        f"Duality Pole Studio"
                    ),
                }
            )

        return Response(EnrolmentSerializer(enrolment).data, status=status.HTTP_200_OK)


SEASON_PRICES_CHANGE = {1: 270, 2: 440, 3: 580, 4: 700, 5: 800, 6: 900}


class ClassChangeRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ClassChangeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return ClassChangeRequest.objects.filter(student=user).select_related(
                'current_enrolment__class_session', 'requested_session'
            )
        qs = ClassChangeRequest.objects.select_related(
            'student', 'current_enrolment__class_session', 'requested_session'
        )
        student_id = self.request.query_params.get('student')
        status_ = self.request.query_params.get('status')
        if student_id:
            qs = qs.filter(student_id=student_id)
        if status_:
            qs = qs.filter(status=status_)
        return qs

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        user = self.request.user
        is_staff = user.role in ('admin', 'instructor', 'staff')
        enrolment_id = self.request.data.get('current_enrolment')
        if not enrolment_id:
            raise ValidationError('current_enrolment is required.')

        try:
            if is_staff:
                enrolment = Enrolment.objects.select_related('student', 'class_session__season').get(
                    pk=enrolment_id, status='active'
                )
            else:
                enrolment = Enrolment.objects.select_related('student', 'class_session__season').get(
                    pk=enrolment_id, student=user, status='active', enrolment_type='course'
                )
        except Enrolment.DoesNotExist:
            raise ValidationError('Active enrolment not found.')

        # Prevent duplicate pending requests for same enrolment
        if ClassChangeRequest.objects.filter(
            current_enrolment=enrolment, status='pending'
        ).exists():
            raise ValidationError('A pending request for this enrolment already exists.')

        student = enrolment.student
        request_type = self.request.data.get('request_type', 'transfer')
        change_request = serializer.save(
            student=student,
            admin_initiated=is_staff,
        )

        from apps.helpdesk.models import Ticket, TicketMessage
        session_name = enrolment.class_session.name
        initiated_by = f'{user.display_name} (staff)' if is_staff else student.display_name

        if request_type == 'cancel':
            resolution = change_request.cancellation_resolution or 'no_refund'
            resolution_label = {'credit': 'account credit', 'refund': 'refund to card', 'no_refund': 'no refund'}.get(resolution, resolution)
            subject = f'Cancellation request — {session_name} ({student.display_name})'
            body = (
                f'Cancellation request submitted by {initiated_by}.\n\n'
                f'Student: {student.display_name}\n'
                f'Class: {session_name}\n'
                f'Requested resolution: {resolution_label}\n'
            )
        else:
            requested = change_request.requested_session
            requested_name = requested.name if requested else 'a different class'
            subject = f'Transfer request — {session_name} → {requested_name} ({student.display_name})'
            body = (
                f'Transfer request submitted by {initiated_by}.\n\n'
                f'Student: {student.display_name}\n'
                f'Currently enrolled in: {session_name}\n'
                f'Requesting to transfer to: {requested_name}\n'
            )

        if change_request.notes:
            body += f'\nNotes: {change_request.notes}\n'

        ticket = Ticket.objects.create(
            subject=subject,
            student=student,
            status=Ticket.Status.OPEN,
            priority=Ticket.Priority.MEDIUM,
            category=Ticket.Category.BOOKING,
        )
        TicketMessage.objects.create(ticket=ticket, sender=user, body=body)
        change_request.ticket = ticket
        change_request.save(update_fields=['ticket'])

        from apps.users.models import Notification
        Notification.objects.create(
            recipient=student,
            title='Request received',
            body=f'Your {"cancellation" if request_type == "cancel" else "transfer"} request for {session_name} has been submitted and is pending review.',
            notification_type='info',
        )


class ClassChangeRequestDetailView(generics.RetrieveAPIView):
    serializer_class = ClassChangeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return ClassChangeRequest.objects.filter(student=user)
        return ClassChangeRequest.objects.all()


class ClassChangeRequestApproveView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from apps.classes.models import ClassSession
        from apps.payments.models import Payment
        from apps.users.models import Notification
        import stripe
        from django.conf import settings as django_settings

        change_request = get_object_or_404(ClassChangeRequest, pk=pk)
        if change_request.status not in ('pending', 'awaiting_response'):
            return Response({'detail': 'Request cannot be approved.'}, status=status.HTTP_400_BAD_REQUEST)

        new_session_id = request.data.get('new_session_id')
        refund_action = request.data.get('refund_action', 'none')  # 'none', 'credit', 'stripe'
        refund_amount = request.data.get('refund_amount')
        charge_amount = request.data.get('charge_amount')
        admin_notes = request.data.get('admin_notes', '')
        force_override = request.data.get('force', False)
        action = request.data.get('action', 'transfer')  # 'transfer' | 'waitlist'

        # Handle cancel requests separately — no new session required
        if change_request.request_type == ClassChangeRequest.RequestType.CANCEL:
            enrolment = change_request.current_enrolment
            student = change_request.student
            session_name = enrolment.class_session.name

            # Cancel the enrolment
            enrolment.status = 'cancelled'
            enrolment.cancelled_date = timezone.now().date()
            enrolment.save(update_fields=['status', 'cancelled_date'])

            # Handle refund / credit
            if refund_amount and float(refund_amount) > 0:
                if refund_action == 'credit':
                    Payment.objects.create(
                        student=student,
                        payment_type=Payment.PaymentType.CREDIT,
                        amount=Decimal(str(refund_amount)),
                        description=f'Cancellation credit: {session_name}',
                        created_by=request.user,
                    )
                elif refund_action == 'stripe':
                    stripe.api_key = django_settings.STRIPE_SECRET_KEY
                    last_payment = Payment.objects.filter(
                        student=student,
                        payment_type__in=['payment', 'charge'],
                        reference__startswith='pi_',
                    ).order_by('-created_at').first()
                    if last_payment and last_payment.reference:
                        try:
                            stripe.Refund.create(
                                payment_intent=last_payment.reference,
                                amount=int(float(refund_amount) * 100),
                            )
                            Payment.objects.create(
                                student=student,
                                payment_type=Payment.PaymentType.REFUND,
                                amount=Decimal(str(refund_amount)),
                                description=f'Cancellation refund: {session_name}',
                                reference=last_payment.reference,
                                created_by=request.user,
                            )
                        except Exception as e:
                            return Response(
                                {'detail': f'Stripe refund failed: {str(e)}. Consider issuing studio credit instead.'},
                                status=status.HTTP_502_BAD_GATEWAY,
                            )
                    else:
                        return Response(
                            {'detail': 'No Stripe payment found for this student. Issue credit instead.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

            # Resolve the request
            change_request.status = ClassChangeRequest.Status.APPROVED
            change_request.admin_notes = admin_notes
            change_request.resolved_at = timezone.now()
            change_request.save(update_fields=['status', 'admin_notes', 'resolved_at'])

            if change_request.ticket:
                change_request.ticket.status = 'resolved'
                change_request.ticket.save(update_fields=['status'])

            resolution_label = {'credit': 'account credit issued', 'stripe': 'refund processed', 'none': 'no refund'}.get(refund_action, 'no refund')
            Notification.objects.create(
                recipient=student,
                title='Enrolment cancelled',
                body=f'Your enrolment in {session_name} has been cancelled. {admin_notes}'.strip(),
                notification_type='info',
            )
            if student.email:
                from apps.users.email_utils import send_branded_email
                send_branded_email(
                    to_email=student.email,
                    subject=f'Enrolment cancelled — {session_name}',
                    template_name='class_change_approved',
                    context={
                        'first_name': student.first_name,
                        'greeting': f'Hi {student.first_name},',
                        'old_session': session_name,
                        'new_session': f'Cancelled ({resolution_label})',
                        'admin_notes': admin_notes,
                        'plain_text': (
                            f'Hi {student.first_name},\n\n'
                            f'Your enrolment in {session_name} has been cancelled.\n\n'
                            + (f'{admin_notes}\n\n' if admin_notes else '')
                            + f'Duality Pole Studio'
                        ),
                    }
                )
            return Response(ClassChangeRequestSerializer(change_request).data)

        if not new_session_id:
            return Response({'detail': 'new_session_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_session = ClassSession.objects.get(pk=new_session_id)
        except ClassSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        enrolment = change_request.current_enrolment
        old_session = enrolment.class_session
        student = change_request.student

        # Check capacity on target session (skip for force override or waitlist)
        active_count = Enrolment.objects.filter(class_session=new_session, status='active').count()
        if active_count >= new_session.capacity and not force_override and action != 'waitlist':
            return Response({'detail': f'{new_session.name} is at capacity ({new_session.capacity} students).'}, status=status.HTTP_400_BAD_REQUEST)

        # Check target session is not already enrolled/waitlisted
        if Enrolment.objects.filter(student=student, class_session=new_session, status__in=('active', 'waitlisted')).exists():
            return Response(
                {'detail': 'Student is already enrolled or waitlisted in the target session.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if action == 'waitlist':
            # Create a new waitlisted enrolment on the target session; leave current enrolment active
            waitlist_pos = Enrolment.objects.filter(class_session=new_session, status='waitlisted').count() + 1
            Enrolment.objects.create(
                student=student,
                class_session=new_session,
                status='waitlisted',
                enrolment_type=enrolment.enrolment_type,
                waitlist_position=waitlist_pos,
            )
            # Resolve the change request as approved (waitlisted)
            change_request.status = ClassChangeRequest.Status.APPROVED
            change_request.admin_notes = (admin_notes + ' [Waitlisted]').strip()
            change_request.resolved_at = timezone.now()
            change_request.save(update_fields=['status', 'admin_notes', 'resolved_at'])
            if change_request.ticket:
                change_request.ticket.status = 'resolved'
                change_request.ticket.save(update_fields=['status'])
            Notification.objects.create(
                recipient=student,
                title=f'You\'ve been added to the waitlist for {new_session.name}',
                body=(
                    f'Your transfer request has been reviewed. {new_session.name} is currently full, '
                    f'so you\'ve been added to the waitlist (position #{waitlist_pos}). '
                    'You\'ll be notified as soon as a spot opens up.'
                ),
                notification_type='info',
            )
            if student.email:
                from apps.users.email_utils import send_branded_email
                send_branded_email(
                    to_email=student.email,
                    subject=f'Waitlisted for {new_session.name}',
                    template_name='class_change_approved',
                    context={
                        'first_name': student.first_name,
                        'greeting': f'Hi {student.first_name},',
                        'old_session': old_session.name,
                        'new_session': f'{new_session.name} (waitlisted — position #{waitlist_pos})',
                        'admin_notes': admin_notes,
                        'plain_text': (
                            f'Hi {student.first_name},\n\n'
                            f'{new_session.name} is currently full, so you\'ve been added to the waitlist at position #{waitlist_pos}. '
                            'We\'ll notify you as soon as a spot becomes available.\n\nDuality Pole Studio'
                        ),
                    }
                )
            return Response(ClassChangeRequestSerializer(change_request).data)

        # Move the enrolment (transfer, with optional force override)
        enrolment.class_session = new_session
        enrolment.save(update_fields=['class_session'])

        # Handle payment difference
        if refund_amount and float(refund_amount) > 0:
            if refund_action == 'credit':
                Payment.objects.create(
                    student=student,
                    payment_type=Payment.PaymentType.CREDIT,
                    amount=Decimal(str(refund_amount)),
                    description=f'Class change credit: {old_session.name} → {new_session.name}',
                    created_by=request.user,
                )
            elif refund_action == 'stripe':
                # Attempt Stripe refund using last payment reference
                stripe.api_key = django_settings.STRIPE_SECRET_KEY
                last_payment = Payment.objects.filter(
                    student=student,
                    payment_type__in=['payment', 'charge'],
                    reference__startswith='pi_',
                ).order_by('-created_at').first()
                if last_payment and last_payment.reference:
                    try:
                        stripe.Refund.create(
                            payment_intent=last_payment.reference,
                            amount=int(float(refund_amount) * 100),
                        )
                        Payment.objects.create(
                            student=student,
                            payment_type=Payment.PaymentType.REFUND,
                            amount=Decimal(str(refund_amount)),
                            description=f'Class change refund: {old_session.name} → {new_session.name}',
                            reference=last_payment.reference,
                            created_by=request.user,
                        )
                    except Exception as e:
                        return Response(
                            {'detail': f'Stripe refund failed: {str(e)}. Consider issuing studio credit instead.'},
                            status=status.HTTP_502_BAD_GATEWAY,
                        )
                else:
                    return Response(
                        {'detail': 'No Stripe payment found for this student. Issue credit instead.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        if charge_amount and float(charge_amount) > 0:
            Payment.objects.create(
                student=student,
                payment_type=Payment.PaymentType.CHARGE,
                amount=Decimal(str(charge_amount)),
                description=f'Class change upgrade: {old_session.name} → {new_session.name}',
                created_by=request.user,
            )

        # Resolve the request
        change_request.status = ClassChangeRequest.Status.APPROVED
        change_request.admin_notes = admin_notes
        change_request.resolved_at = timezone.now()
        change_request.save(update_fields=['status', 'admin_notes', 'resolved_at'])

        # Close the linked helpdesk ticket if present
        if change_request.ticket:
            change_request.ticket.status = 'resolved'
            change_request.ticket.save(update_fields=['status'])

        # Notify student
        Notification.objects.create(
            recipient=student,
            title='Class change approved',
            body=f'Your class has been changed from {old_session.name} to {new_session.name}.',
            notification_type='success',
        )

        # Email student
        if student.email:
            from apps.users.email_utils import send_branded_email
            send_branded_email(
                to_email=student.email,
                subject=f'Class change approved — {new_session.name}',
                template_name='class_change_approved',
                context={
                    'first_name': student.first_name,
                    'greeting': f'Hi {student.first_name},',
                    'old_session': old_session.name,
                    'new_session': new_session.name,
                    'admin_notes': admin_notes,
                    'plain_text': f'Hi {student.first_name},\n\nYour class has been changed from {old_session.name} to {new_session.name}.\n\nDuality Pole Studio',
                }
            )

        return Response(ClassChangeRequestSerializer(change_request).data)


class ClassChangeRequestInfoView(APIView):
    """Set change request to awaiting-response and send a DM to the student."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from apps.helpdesk.models import Conversation, DirectMessage

        change_request = get_object_or_404(ClassChangeRequest, pk=pk)
        if change_request.status not in ('pending', 'awaiting_response'):
            return Response({'detail': 'Request cannot be set to awaiting response.'}, status=status.HTTP_400_BAD_REQUEST)

        message_body = request.data.get('message', '').strip()
        admin_notes = request.data.get('admin_notes', '')

        change_request.status = 'awaiting_response'
        change_request.admin_notes = admin_notes
        change_request.save(update_fields=['status', 'admin_notes'])

        if message_body:
            conv, _ = Conversation.objects.get_or_create(student=change_request.student, instructor=None)
            DirectMessage.objects.create(conversation=conv, sender=request.user, body=message_body)
            conv.admin_unread = False
            conv.save(update_fields=['updated_at', 'admin_unread'])

        return Response(ClassChangeRequestSerializer(change_request).data)


class ClassChangeRequestRejectView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from apps.users.models import Notification

        change_request = get_object_or_404(ClassChangeRequest, pk=pk)
        if change_request.status not in ('pending', 'awaiting_response'):
            return Response({'detail': 'Request cannot be rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        admin_notes = request.data.get('admin_notes', '')
        message_body = request.data.get('message', '').strip()
        change_request.status = ClassChangeRequest.Status.REJECTED
        change_request.admin_notes = admin_notes
        change_request.resolved_at = timezone.now()
        change_request.save(update_fields=['status', 'admin_notes', 'resolved_at'])

        # Send DM to student if message provided
        if message_body:
            from apps.helpdesk.models import Conversation, DirectMessage
            conv, _ = Conversation.objects.get_or_create(student=change_request.student, instructor=None)
            DirectMessage.objects.create(conversation=conv, sender=request.user, body=message_body)
            conv.admin_unread = False
            conv.save(update_fields=['updated_at', 'admin_unread'])

        # Close the linked helpdesk ticket if present
        if change_request.ticket:
            change_request.ticket.status = 'resolved'
            change_request.ticket.save(update_fields=['status'])

        Notification.objects.create(
            recipient=change_request.student,
            title='Class change request update',
            body=f'Your class change request has been reviewed. {admin_notes}' if admin_notes else 'Your class change request could not be approved at this time. Please contact the studio for more information.',
            notification_type='info',
        )

        # Email student
        session_name = change_request.current_enrolment.class_session.name
        if change_request.student.email:
            from apps.users.email_utils import send_branded_email
            send_branded_email(
                to_email=change_request.student.email,
                subject='Class change request — update',
                template_name='class_change_rejected',
                context={
                    'first_name': change_request.student.first_name,
                    'greeting': f'Hi {change_request.student.first_name},',
                    'session_name': session_name,
                    'admin_notes': admin_notes,
                    'plain_text': (
                        f'Hi {change_request.student.first_name},\n\n'
                        f'We\'ve reviewed your class change request for {session_name}.\n\n'
                        + (f'{admin_notes}\n\n' if admin_notes else 'Unfortunately we\'re unable to approve this change at this time. Please contact the studio for more information.\n\n')
                        + f'Duality Pole Studio'
                    ),
                }
            )

        return Response(ClassChangeRequestSerializer(change_request).data)


class WaitlistReorderView(APIView):
    """Admin: reorder season waitlist for a class session."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request):
        ordered_ids = request.data.get('ordered_ids', [])
        if not ordered_ids:
            return Response({'detail': 'ordered_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)
        for position, enrolment_id in enumerate(ordered_ids, start=1):
            Enrolment.objects.filter(pk=enrolment_id, status='waitlisted').update(waitlist_position=position)
        return Response({'status': 'ok'})


class AdminPromoteSeasonWaitlistView(APIView):
    """Admin: promote a waitlisted season enrolment to active, with optional capacity override."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        enrolment = get_object_or_404(Enrolment, pk=pk, status='waitlisted')
        override = request.data.get('override_capacity', False)

        session = enrolment.class_session
        active_count = Enrolment.objects.filter(class_session=session, status='active').count()
        capacity = getattr(session, 'capacity', None)

        if not override and capacity and active_count >= capacity:
            return Response({
                'detail': 'Class is at capacity.',
                'current': active_count,
                'capacity': capacity,
                'requires_override': True,
            }, status=status.HTTP_409_CONFLICT)

        enrolment.status = 'active'
        enrolment.waitlist_offered_at = None
        enrolment.waitlist_expires_at = None
        enrolment.waitlist_urgent = False
        enrolment.waitlist_position = None
        enrolment.save(update_fields=['status', 'waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent', 'waitlist_position'])

        from apps.users.models import Notification
        Notification.objects.create(
            recipient=enrolment.student,
            title=f"You're in! — {session.name}",
            body=f"A spot opened up in {session.name} and you've been promoted from the waitlist. You're now enrolled!",
            notification_type='success',
        )

        return Response(EnrolmentSerializer(enrolment).data)


class AdminSendSeasonWaitlistOfferView(APIView):
    """Admin: manually send (or resend) a waitlist offer with optional custom expiry."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from datetime import timedelta
        from apps.users.models import Notification

        enrolment = get_object_or_404(Enrolment, pk=pk, status='waitlisted')
        session = enrolment.class_session
        student = enrolment.student

        try:
            expires_hours = max(1, int(request.data.get('expires_hours', 4)))
        except (ValueError, TypeError):
            expires_hours = 4

        now = timezone.now()
        expires_at = now + timedelta(hours=expires_hours)
        expires_str = expires_at.strftime('%I:%M %p')

        enrolment.waitlist_offered_at = now
        enrolment.waitlist_expires_at = expires_at
        enrolment.waitlist_urgent = False
        enrolment.save(update_fields=['waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent'])

        prefs = student.notification_preferences or {}
        if prefs.get('waitlist_app', True):
            Notification.objects.create(
                recipient=student,
                title=f"Spot available — {session.name}",
                body=f"A spot is available for you! You have {expires_hours} hour{'s' if expires_hours != 1 else ''} to claim it (until {expires_str}).",
                notification_type='waitlist',
                action_label='Claim My Spot',
                action_url='/portal/classes',
            )

        if prefs.get('waitlist_email', True) and student.email:
            send_mail(
                subject=f"A spot has opened up — {session.name}!",
                message=(
                    f"Hi {student.first_name},\n\n"
                    f"A spot has opened up in {session.name}!\n\n"
                    f"You have {expires_hours} hour{'s' if expires_hours != 1 else ''} to claim your spot (until {expires_str}). "
                    "If you don't confirm by then, your spot will be offered to the next person.\n\n"
                    "Log in to confirm your enrolment.\n\n"
                    "Duality Pole Studio"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[student.email],
                fail_silently=True,
            )

        return Response({
            'waitlist_offered_at': enrolment.waitlist_offered_at.isoformat(),
            'waitlist_expires_at': enrolment.waitlist_expires_at.isoformat(),
        })


class AdminBulkSeasonWaitlistView(APIView):
    """Admin: bulk promote or remove waitlisted season enrolments."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request):
        from apps.users.models import Notification

        action = request.data.get('action')
        ids = request.data.get('ids', [])
        override = request.data.get('override_capacity', False)

        if action not in ('promote', 'remove'):
            return Response({'detail': 'action must be promote or remove'}, status=400)
        if not ids:
            return Response({'detail': 'ids required'}, status=400)

        enrolment_qs = Enrolment.objects.filter(pk__in=ids, status='waitlisted').select_related('class_session', 'student')
        results = {'succeeded': [], 'failed': []}

        for enrolment in enrolment_qs:
            if action == 'remove':
                eid = enrolment.id
                enrolment.delete()
                results['succeeded'].append(eid)
            else:
                session = enrolment.class_session
                active_count = Enrolment.objects.filter(class_session=session, status='active').count()
                capacity = getattr(session, 'capacity', None)
                if not override and capacity and active_count >= capacity:
                    results['failed'].append({'id': enrolment.id, 'reason': 'at_capacity'})
                    continue
                enrolment.status = 'active'
                enrolment.waitlist_offered_at = None
                enrolment.waitlist_expires_at = None
                enrolment.waitlist_urgent = False
                enrolment.waitlist_position = None
                enrolment.save(update_fields=['status', 'waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent', 'waitlist_position'])
                Notification.objects.create(
                    recipient=enrolment.student,
                    title=f"You're in! — {session.name}",
                    body=f"You've been promoted from the waitlist for {session.name}. You're now enrolled!",
                    notification_type='success',
                )
                results['succeeded'].append(enrolment.id)

        return Response(results)
