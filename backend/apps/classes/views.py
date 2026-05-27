from datetime import date
from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Studio, ClassCategory, ClassSession, ClassOccurrence, Season, Locker, KisiGrant, ClassChatMessage, Workshop, WorkshopBooking, PracticeSlot, PracticeBooking, PracticeCredit, CasualBooking, ClassUpsell, Tag
from .serializers import StudioSerializer, ClassCategorySerializer, ClassSessionSerializer, ClassOccurrenceSerializer, SeasonSerializer, LockerSerializer, KisiGrantSerializer, WorkshopSerializer, WorkshopBookingSerializer, PracticeSlotSerializer, PracticeBookingSerializer, PracticeCreditSerializer, CasualBookingSerializer, ClassUpsellSerializer, TagSerializer
from apps.users.permissions import IsAdminOrInstructor, IsAdminUser


class TagListCreateView(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAdminOrInstructor]


class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAdminOrInstructor]


def _send_casual_waitlist_notifications(bookings, occurrence, expires_at, urgent, now):
    """
    Send waitlist offer notifications to a list of CasualBooking objects.
    Shared by _offer_casual_waitlist_spot and _cascade_casual_waitlist_offer.
    """
    from django.core.mail import send_mail
    from django.conf import settings as django_settings
    from apps.users.models import Notification

    sydney_tz = timezone.get_current_timezone()
    expires_str = expires_at.astimezone(sydney_tz).strftime('%I:%M %p')
    session_name = occurrence.session.name
    date_str = occurrence.date.strftime('%d %b')

    for booking in bookings:
        student = booking.student
        prefs = student.notification_preferences or {}

        booking.waitlist_offered_at = now
        booking.waitlist_expires_at = expires_at
        booking.save(update_fields=['waitlist_offered_at', 'waitlist_expires_at'])

        if prefs.get('waitlist_app', True):
            Notification.objects.create(
                recipient=student,
                title=f"Spot available — {session_name} {date_str}",
                body=f"A spot opened up! You have until {expires_str} to claim it. Tap to confirm.",
                notification_type='waitlist',
                action_label='Claim My Spot',
                action_url='/portal/classes',
            )

        if prefs.get('waitlist_email', True) and student.email:
            if urgent:
                body = (
                    f"Hi {student.first_name},\n\n"
                    f"A spot has just opened in {session_name} on {date_str} — the class is within 4 hours!\n\n"
                    "This offer is open to all waitlisted students — first to confirm gets the spot.\n\n"
                    f"You have until {expires_str} to claim it. Log in now.\n\n"
                    "Duality Pole Studio"
                )
            else:
                hours = int((expires_at - now).total_seconds() / 3600)
                body = (
                    f"Hi {student.first_name},\n\n"
                    f"A spot has opened in {session_name} on {date_str}!\n\n"
                    f"You have {hours} hours to claim your spot (until {expires_str}). "
                    "If you don't confirm by then, the spot will be offered to the next person.\n\n"
                    "Log in to confirm your booking.\n\n"
                    "Duality Pole Studio"
                )
            send_mail(
                subject=f"Spot available — {session_name} {date_str}!",
                message=body,
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[student.email],
                fail_silently=True,
            )


def _get_casual_offer_params(occurrence, now):
    """
    Determine offer parameters (expires_at, to_offer subset, urgent, cascade) based
    on how far away the class is.

    Returns: (expires_at, slice_or_all, urgent, should_cascade)
    - within 4h:   2h window, all waitlisted, urgent=True,  cascade=False
    - same day >4h: 2h window, #1 only,        urgent=False, cascade=True
    - future:       4h window, #1 only,         urgent=False, cascade=True
    """
    from datetime import timedelta
    sydney_tz = timezone.get_current_timezone()
    import datetime as _dt
    occ_dt = timezone.make_aware(
        _dt.datetime.combine(occurrence.date, occurrence.session.start_time),
        sydney_tz,
    )
    hours_until = (occ_dt - now).total_seconds() / 3600
    same_day = occ_dt.astimezone(sydney_tz).date() == now.astimezone(sydney_tz).date()

    if hours_until <= 4:
        # Within 4 hours — notify everyone, no cascade
        return now + timedelta(hours=2), 'all', True, False
    elif same_day:
        # Same day but more than 4h away — 2h to #1, cascade
        return now + timedelta(hours=2), 'one', False, True
    else:
        # Future date — 4h to #1, cascade
        return now + timedelta(hours=4), 'one', False, True


def _offer_casual_waitlist_spot(occurrence):
    """
    When a confirmed casual spot opens on an occurrence:
    - Within 4h of class: notify ALL waitlisted simultaneously, 2h window, no cascade
      (first to claim wins; if nobody claims the spot just opens)
    - Same day but >4h away: 2h offer to #1 only, cascade on reject/expire
    - Future date: 4h offer to #1 only, cascade on reject/expire
    """
    waitlisted = list(
        CasualBooking.objects.filter(
            occurrence=occurrence,
            status='waitlisted',
            waitlist_offered_at__isnull=True,
            waitlist_offer_rejected=False,
        ).order_by('waitlist_position', 'id').select_related('student')
    )
    if not waitlisted:
        return

    now = timezone.now()
    expires_at, scope, urgent, _ = _get_casual_offer_params(occurrence, now)

    to_offer = waitlisted if scope == 'all' else waitlisted[:1]
    _send_casual_waitlist_notifications(to_offer, occurrence, expires_at, urgent, now)


def _cascade_casual_waitlist_offer(occurrence, skip_booking_id=None):
    """
    Find the next eligible waitlisted CasualBooking and send a timed offer.
    Called after a student rejects or a management command expires a casual waitlist offer.

    Re-applies the same timing logic:
    - Within 4h: notify all remaining simultaneously (no further cascade)
    - Same day >4h: 2h to #1, cascade
    - Future: 4h to #1, cascade
    """
    qs = CasualBooking.objects.filter(
        occurrence=occurrence,
        status='waitlisted',
        waitlist_offered_at__isnull=True,
        waitlist_offer_rejected=False,
    ).order_by('waitlist_position', 'id').select_related('student')

    if skip_booking_id:
        qs = qs.exclude(pk=skip_booking_id)

    remaining = list(qs)
    if not remaining:
        return

    now = timezone.now()
    expires_at, scope, urgent, _ = _get_casual_offer_params(occurrence, now)

    to_offer = remaining if scope == 'all' else remaining[:1]
    _send_casual_waitlist_notifications(to_offer, occurrence, expires_at, urgent, now)


class StudioListView(generics.ListCreateAPIView):
    queryset = Studio.objects.all()
    serializer_class = StudioSerializer
    permission_classes = [IsAdminOrInstructor]


class StudioDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Studio.objects.all()
    serializer_class = StudioSerializer
    permission_classes = [IsAdminOrInstructor]


class ClassCategoryListView(generics.ListCreateAPIView):
    queryset = ClassCategory.objects.all()
    serializer_class = ClassCategorySerializer
    permission_classes = [IsAdminOrInstructor]


class ClassCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ClassCategory.objects.all()
    serializer_class = ClassCategorySerializer
    permission_classes = [IsAdminOrInstructor]


def _auto_assign_skill_level(session):
    """Auto-assign or create a SkillLevel for a ClassSession based on its name/level field."""
    from apps.users.models import SkillLevel
    candidate = session.level or session.name or ''
    if not candidate:
        return
    # Try matching an existing SkillLevel by name (case-insensitive)
    for sl in SkillLevel.objects.all():
        if sl.name.lower() in candidate.lower() or candidate.lower() in sl.name.lower():
            session.skill_level = sl
            session.save(update_fields=['skill_level'])
            return
    # Extract level pattern like "Level 2" from name
    import re
    match = re.search(r'level\s*\d+', candidate, re.IGNORECASE)
    if match:
        level_name = match.group(0).title()  # e.g. "Level 2"
        sl, _ = SkillLevel.objects.get_or_create(
            name=level_name,
            defaults={'order': int(re.search(r'\d+', level_name).group(0))},
        )
        session.skill_level = sl
        session.save(update_fields=['skill_level'])


class ClassSessionListView(generics.ListCreateAPIView):
    serializer_class = ClassSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        session = serializer.save()
        if not session.skill_level:
            _auto_assign_skill_level(session)

    def get_queryset(self):
        qs = ClassSession.objects.select_related('instructor', 'studio', 'category')
        season_id = self.request.query_params.get('season')
        # Only restrict to own sessions when no season filter — instructors
        # need to see the full timetable when picking a transfer target
        if self.request.user.role == 'instructor' and not season_id:
            qs = qs.filter(instructor=self.request.user)
        active_only = self.request.query_params.get('active')
        if active_only == 'true':
            qs = qs.filter(is_active=True)
        if season_id:
            qs = qs.filter(season_id=season_id)
        # Students only see sessions whose category is visible (or has no category)
        if getattr(self.request.user, 'role', None) == 'student':
            qs = qs.filter(
                models.Q(category__isnull=True) | models.Q(category__is_visible=True)
            )
        return qs


class ClassSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ClassSession.objects.select_related('instructor', 'studio')
    serializer_class = ClassSessionSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_update(self, serializer):
        session = serializer.save()
        if not session.skill_level:
            _auto_assign_skill_level(session)


class ClassRosterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_pk):
        from apps.enrolments.models import Enrolment
        enrolled = Enrolment.objects.filter(
            class_session_id=session_pk,
            status='active',
            student__show_in_roster=True,
        ).select_related('student')
        names = []
        for e in enrolled:
            s = e.student
            if s.roster_name == 'nickname' and s.nickname:
                names.append(s.nickname)
            else:
                names.append(s.first_name or s.display_name)
        return Response({'names': names})


class ClassOccurrenceListView(generics.ListCreateAPIView):
    serializer_class = ClassOccurrenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ClassOccurrence.objects.select_related('session__instructor', 'session__studio', 'session__season')
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(session_id=session_id)
        date_param = self.request.query_params.get('date')
        if date_param:
            qs = qs.filter(date=date_param)
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if self.request.query_params.get('cover_needed') == 'true':
            qs = qs.filter(cover_needed=True)
        elif self.request.user.role == 'instructor' and not self.request.query_params.get('substitute_instructor'):
            qs = qs.filter(session__instructor=self.request.user)
        sub_id = self.request.query_params.get('substitute_instructor')
        if sub_id:
            qs = qs.filter(substitute_instructor_id=sub_id)
        student_id = self.request.query_params.get('student')
        if student_id:
            from apps.enrolments.models import Enrolment
            session_ids = Enrolment.objects.filter(student_id=student_id, status='active').values_list('class_session_id', flat=True)
            qs = qs.filter(session_id__in=session_ids)
        if self.request.query_params.get('upcoming') == 'true':
            qs = qs.filter(date__gte=date.today()).order_by('date')
        season_id = self.request.query_params.get('season')
        if season_id:
            qs = qs.filter(session__season_id=season_id)
        return qs


class ClassOccurrenceDetailView(generics.RetrieveUpdateAPIView):
    queryset = ClassOccurrence.objects.select_related('session__instructor', 'session__studio')
    serializer_class = ClassOccurrenceSerializer
    permission_classes = [IsAdminOrInstructor]


class RequestCoverView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from django.core.mail import send_mail
        from django.conf import settings
        from apps.users.models import Notification, User

        try:
            occ = ClassOccurrence.objects.select_related('session__studio', 'session__instructor').get(pk=pk)
        except ClassOccurrence.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        occ.cover_needed = True
        occ.save(update_fields=['cover_needed'])

        session_name = occ.session.name
        day_str = occ.date.strftime('%-d %B')
        time_str = occ.session.start_time.strftime('%I:%M %p').lstrip('0') if occ.session.start_time else ''
        studio_str = f' at {occ.session.studio.name}' if occ.session.studio else ''
        requesting = request.user.get_full_name() or request.user.first_name or request.user.username

        admins = User.objects.filter(role='admin', is_active=True)
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title=f'Cover requested: {session_name}',
                body=(
                    f'{requesting} has requested cover for {session_name} on {day_str}'
                    f'{f" at {time_str}" if time_str else ""}{studio_str}.'
                ),
                notification_type='info',
                action_label='View Classes',
                action_url='/admin/classes',
            )
            if admin.email:
                send_mail(
                    subject=f'Cover requested: {session_name} on {day_str}',
                    message=(
                        f'Hi {admin.first_name},\n\n'
                        f'{requesting} has requested cover for {session_name} on {day_str}'
                        f'{f" at {time_str}" if time_str else ""}{studio_str}.\n\n'
                        f'Please arrange a substitute instructor as soon as possible.\n\n'
                        f'Duality Pole Studio'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[admin.email],
                    fail_silently=True,
                )

        return Response({'detail': 'Cover request sent.'}, status=status.HTTP_200_OK)


class SeasonListView(generics.ListCreateAPIView):
    serializer_class = SeasonSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminOrInstructor()]

    def get_queryset(self):
        from django.utils import timezone
        qs = Season.objects.all()
        user = self.request.user
        # Only admins see draft seasons
        if user.role == 'admin':
            return qs.filter(archived=False)
        # Students and instructors only see seasons that are live
        now = timezone.now()
        return qs.filter(archived=False).filter(
            models.Q(status='active') |
            models.Q(bookings_open=True) |
            models.Q(go_live_at__lte=now)
        )


class SeasonDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = [IsAdminOrInstructor]


class SeasonToggleBookingsView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            season = Season.objects.get(pk=pk)
        except Season.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        season.bookings_open = not season.bookings_open
        season.save(update_fields=['bookings_open'])
        return Response({'bookings_open': season.bookings_open})


class SeasonToggleBookingsEnabledView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            season = Season.objects.get(pk=pk)
        except Season.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        season.bookings_enabled = not season.bookings_enabled
        season.save(update_fields=['bookings_enabled'])
        return Response({'bookings_enabled': season.bookings_enabled})


class SeasonDuplicateView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        import datetime
        try:
            source = Season.objects.get(pk=pk)
        except Season.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        start_date_str = request.data.get('start_date')
        weeks = int(request.data.get('weeks', 8))
        name = request.data.get('name') or f'{source.name} (copy)'

        if not start_date_str:
            return Response({'detail': 'start_date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.date.fromisoformat(start_date_str)
        except ValueError:
            return Response({'detail': 'Invalid start_date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        end_date = start_date + datetime.timedelta(days=weeks * 7 - 1)

        from django.utils import timezone as tz
        new_season = Season.objects.create(
            name=name,
            start_date=start_date,
            end_date=end_date,
            status='upcoming',
            bookings_open=False,
            bookings_enabled=True,
            discount_tiers=source.discount_tiers or {},
            published_at=tz.now(),  # generate occurrences immediately; hidden from students until bookings_open
        )

        # Copy all active class sessions from the source season
        for session in source.sessions.filter(is_active=True):
            ClassSession.objects.create(
                season=new_season,
                name=session.name,
                level=session.level,
                session_type=session.session_type,
                day_of_week=session.day_of_week,
                start_time=session.start_time,
                duration_minutes=session.duration_minutes,
                capacity=session.capacity,
                instructor=session.instructor,
                studio=session.studio,
                category=session.category,
                catchup_cutoff_weeks=session.catchup_cutoff_weeks,
                description=session.description,
                first_timer_headline=session.first_timer_headline,
                first_timer_body=session.first_timer_body,
                skill_level=session.skill_level,
                is_active=True,
            )

        from apps.classes.serializers import SeasonSerializer
        return Response(SeasonSerializer(new_season).data, status=status.HTTP_201_CREATED)


class SeasonArchiveView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            season = Season.objects.get(pk=pk)
        except Season.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        season.archived = not season.archived
        season.save(update_fields=['archived'])
        from apps.classes.serializers import SeasonSerializer as SS
        return Response(SS(season).data)


class LockerListView(generics.ListCreateAPIView):
    serializer_class = LockerSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = Locker.objects.select_related('assigned_to')
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            qs = qs.filter(assigned_to_id=assigned_to)
        return qs


class LockerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Locker.objects.select_related('assigned_to')
    serializer_class = LockerSerializer
    permission_classes = [IsAdminOrInstructor]


class MyLockerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from rest_framework.response import Response
        locker = Locker.objects.filter(assigned_to=request.user).first()
        if not locker:
            return Response(None)
        return Response(LockerSerializer(locker).data)


class LockerEligibleStudentsView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        from apps.enrolments.models import Enrolment
        from apps.users.models import User

        active_season = Season.objects.filter(status='active').first()
        if not active_season:
            return Response({'season': None, 'eligible': [], 'paid_holders': []})

        season_session_ids = ClassSession.objects.filter(
            season=active_season, is_active=True
        ).values_list('id', flat=True)

        enrolment_counts = (
            Enrolment.objects.filter(class_session_id__in=season_session_ids, status='active')
            .values('student_id')
            .annotate(count=Count('id'))
        )
        count_by_student = {row['student_id']: row['count'] for row in enrolment_counts}
        eligible_student_ids = [sid for sid, cnt in count_by_student.items() if cnt >= 4]

        assigned_lockers = {
            l.assigned_to_id: l
            for l in Locker.objects.filter(assigned_to__isnull=False).select_related('assigned_to')
        }

        eligible_students = User.objects.filter(id__in=eligible_student_ids).order_by('first_name', 'last_name')
        eligible_data = []
        for s in eligible_students:
            locker = assigned_lockers.get(s.id)
            eligible_data.append({
                'id': s.id, 'display_name': s.display_name, 'email': s.email,
                'enrolment_count': count_by_student.get(s.id, 0),
                'has_locker': locker is not None,
                'locker_number': locker.number if locker else None,
                'locker_id': locker.id if locker else None,
            })

        paid_holder_data = []
        for student_id, locker in assigned_lockers.items():
            if student_id not in eligible_student_ids:
                s = locker.assigned_to
                paid_holder_data.append({
                    'id': s.id, 'display_name': s.display_name, 'email': s.email,
                    'enrolment_count': count_by_student.get(s.id, 0),
                    'has_locker': True,
                    'locker_number': locker.number, 'locker_id': locker.id,
                })
        paid_holder_data.sort(key=lambda x: x['display_name'])

        return Response({
            'season': {'id': active_season.id, 'name': active_season.name},
            'eligible': eligible_data,
            'paid_holders': paid_holder_data,
        })


class LockerLostKeyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            locker = Locker.objects.select_related('assigned_to').get(pk=pk)
        except Locker.DoesNotExist:
            return Response({'detail': 'Locker not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not locker.assigned_to:
            return Response({'detail': 'Locker is not assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        # Students can only report their own locker
        if request.user.role == 'student' and locker.assigned_to != request.user:
            return Response({'detail': 'Not your locker.'}, status=status.HTTP_403_FORBIDDEN)

        locker.key_lost = True
        locker.save(update_fields=['key_lost'])

        student = locker.assigned_to
        from apps.payments.models import Payment
        Payment.objects.create(
            student=student,
            payment_type=Payment.PaymentType.CHARGE,
            amount=50,
            description=f'Lost key fee — Locker #{locker.number}',
            reference=f'locker-{locker.id}-lost-key',
            created_by=request.user,
        )

        from apps.users.models import User as UserModel, Notification
        for admin in UserModel.objects.filter(role='admin', is_active=True):
            Notification.objects.create(
                recipient=admin,
                title=f'Locker #{locker.number} — Key Lost',
                body=f'Key reported lost for {student.display_name}. Please change the lock and issue a new key.',
                notification_type=Notification.Type.WARNING,
            )

        return Response(LockerSerializer(locker).data)


class LockerChaseView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            locker = Locker.objects.select_related('assigned_to').get(pk=pk)
        except Locker.DoesNotExist:
            return Response({'detail': 'Locker not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not locker.assigned_to:
            return Response({'detail': 'Locker is not assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        student = locker.assigned_to
        from apps.users.models import Notification
        Notification.objects.create(
            recipient=student,
            title=f'Locker #{locker.number} — Payment Overdue',
            body=(
                f'Hi {student.first_name}, your locker fee for Locker #{locker.number} '
                f'is overdue. Please contact the studio to arrange payment.'
            ),
            notification_type=Notification.Type.PAYMENT,
        )
        return Response({'detail': f'Chase notification sent to {student.display_name}.'})


class LockerCarryOverView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            locker = Locker.objects.select_related('assigned_to').get(pk=pk)
        except Locker.DoesNotExist:
            return Response({'detail': 'Locker not found.'}, status=status.HTTP_404_NOT_FOUND)

        next_season = Season.objects.filter(status='upcoming').order_by('start_date').first()
        if not next_season:
            return Response({'detail': 'No upcoming season found to carry over to.'}, status=status.HTTP_400_BAD_REQUEST)
        if not next_season.end_date:
            return Response({'detail': 'Upcoming season has no end date set.'}, status=status.HTTP_400_BAD_REQUEST)

        locker.expires_at = next_season.end_date
        if locker.locker_type == 'paid':
            locker.payment_status = 'unpaid'
        locker.key_returned = False
        locker.save(update_fields=['expires_at', 'payment_status', 'key_returned'])

        return Response(LockerSerializer(locker).data)


class LockerInvoiceView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            locker = Locker.objects.select_related('assigned_to').get(pk=pk)
        except Locker.DoesNotExist:
            return Response({'detail': 'Locker not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not locker.assigned_to:
            return Response({'detail': 'Locker is not assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = float(request.data.get('amount', 50))
        description = request.data.get('description', f'Locker fee — Locker #{locker.number}')

        from apps.payments.models import Payment
        Payment.objects.create(
            student=locker.assigned_to,
            payment_type=Payment.PaymentType.CHARGE,
            amount=amount,
            description=description,
            reference=f'locker-{locker.id}-fee',
            created_by=request.user,
        )

        locker.payment_status = 'invoiced'
        locker.save(update_fields=['payment_status'])

        return Response(LockerSerializer(locker).data)


class LockerMarkPendingReturnView(APIView):
    """Mark a locker as 'pending return' — key not yet back, season has ended."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            locker = Locker.objects.select_related('assigned_to').get(pk=pk)
        except Locker.DoesNotExist:
            return Response({'detail': 'Locker not found.'}, status=status.HTTP_404_NOT_FOUND)
        locker.status = 'pending_return'
        locker.save(update_fields=['status'])
        return Response(LockerSerializer(locker).data)


class LockerCapacityCheckView(APIView):
    """Returns locker capacity forecast for next season."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        from apps.users.models import StudioSettings
        from apps.enrolments.models import Enrolment
        from django.db.models import Count

        settings_obj = StudioSettings.get()
        active_season = Season.objects.filter(status='active').first()
        next_season = Season.objects.filter(status='upcoming').order_by('start_date').first()

        if not active_season or not next_season:
            return Response({'error': 'Need active and upcoming season'}, status=400)

        season_end = active_season.end_date
        total = 36  # total lockers

        free_eligible_ids = set()
        qualifying = (
            Enrolment.objects
            .filter(class_session__season=next_season, status='active')
            .values('student_id')
            .annotate(count=Count('id'))
            .filter(count__gte=4)
        )
        free_eligible_ids = {q['student_id'] for q in qualifying}

        paying_lockers = Locker.objects.filter(
            assigned_to__isnull=False, locker_type='paid',
            expires_at=season_end, status='active',
        )
        free_lockers = Locker.objects.filter(
            assigned_to__isnull=False, locker_type='complimentary',
            expires_at=season_end, status='active',
        )

        paying_count = paying_lockers.count()
        free_count = len(free_eligible_ids)
        total_demand = free_count + paying_count
        has_issue = total_demand > total

        return Response({
            'total_lockers': total,
            'free_eligible_next_season': free_count,
            'paying_locker_holders': paying_count,
            'total_demand': total_demand,
            'has_capacity_issue': has_issue,
            'shortfall': max(0, total_demand - total),
            'carry_over_paused': settings_obj.locker_carry_over_paused,
            'active_season': active_season.name,
            'next_season': next_season.name,
        })

    def post(self, request):
        """Admin: manually toggle carry-over pause."""
        from apps.users.models import StudioSettings
        settings_obj = StudioSettings.get()
        paused = request.data.get('carry_over_paused')
        if paused is not None:
            settings_obj.locker_carry_over_paused = bool(paused)
            settings_obj.save(update_fields=['locker_carry_over_paused'])
        return Response({'carry_over_paused': settings_obj.locker_carry_over_paused})


class KisiGrantListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        grants = KisiGrant.objects.filter(revoked=False).select_related('student', 'studio')
        return Response(KisiGrantSerializer(grants, many=True).data)

    def post(self, request):
        from . import kisi_service
        student_id = request.data.get('student')
        studio_id = request.data.get('studio')
        valid_from = request.data.get('valid_from')
        valid_until = request.data.get('valid_until')

        from apps.users.models import User
        from django.utils.dateparse import parse_datetime

        try:
            student = User.objects.get(pk=student_id)
            studio = Studio.objects.get(pk=studio_id) if studio_id else None
            vf = parse_datetime(valid_from)
            vu = parse_datetime(valid_until)
        except (User.DoesNotExist, Studio.DoesNotExist, Exception) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        grant = KisiGrant(student=student, studio=studio, valid_from=vf, valid_until=vu)

        if studio and studio.kisi_place_id:
            try:
                result = kisi_service.create_link(
                    place_id=studio.kisi_place_id,
                    name=f'{student.display_name} — {studio.name}',
                    email=student.email,
                    valid_from=vf,
                    valid_until=vu,
                )
                grant.kisi_link_id = str(result.get('id', ''))
                grant.link_sent = True
            except Exception as e:
                return Response({'detail': f'Kisi API error: {e}'}, status=status.HTTP_502_BAD_GATEWAY)

        grant.save()
        return Response(KisiGrantSerializer(grant).data, status=status.HTTP_201_CREATED)


class KisiGrantDetailView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        from . import kisi_service
        try:
            grant = KisiGrant.objects.get(pk=pk)
        except KisiGrant.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if grant.kisi_link_id:
            try:
                kisi_service.revoke_link(grant.kisi_link_id)
            except Exception as e:
                return Response({'detail': f'Kisi API error: {e}'}, status=status.HTTP_502_BAD_GATEWAY)

        grant.revoked = True
        grant.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClassChatView(APIView):
    """GET/POST chat messages for a given ClassSession."""
    permission_classes = [permissions.IsAuthenticated]

    def _check_access(self, request, session_pk):
        from apps.enrolments.models import Enrolment
        if request.user.role in ('admin', 'instructor'):
            return True
        return Enrolment.objects.filter(
            student=request.user,
            class_session_id=session_pk,
            status__in=['active', 'completed'],
        ).exists()

    def get(self, request, session_pk):
        if not self._check_access(request, session_pk):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        messages = ClassChatMessage.objects.filter(session_id=session_pk).select_related('sender')
        data = [
            {
                'id': m.id,
                'body': m.body,
                'created_at': m.created_at,
                'sender_id': m.sender_id,
                'sender_name': m.sender.get_full_name() or m.sender.display_name,
            }
            for m in messages
        ]
        return Response(data)

    def post(self, request, session_pk):
        if not self._check_access(request, session_pk):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            session = ClassSession.objects.get(pk=session_pk)
        except ClassSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        body = request.data.get('body', '').strip()
        if not body:
            return Response({'detail': 'Message body is required.'}, status=status.HTTP_400_BAD_REQUEST)
        msg = ClassChatMessage.objects.create(session=session, sender=request.user, body=body)
        return Response(
            {
                'id': msg.id,
                'body': msg.body,
                'created_at': msg.created_at,
                'sender_id': msg.sender_id,
                'sender_name': request.user.get_full_name() or request.user.display_name,
            },
            status=status.HTTP_201_CREATED,
        )


class ClassStatsView(APIView):
    """Aggregate counts for the reporting overview — bypasses pagination."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        from django.db.models import Sum, Count
        from apps.users.models import User
        from apps.enrolments.models import Enrolment

        student_count = User.objects.filter(role='student', is_active=True).count()
        session_count = ClassSession.objects.filter(is_active=True).count()
        total_enrolled = Enrolment.objects.filter(status='active').count()

        return Response({
            'student_count': student_count,
            'session_count': session_count,
            'total_enrolled': total_enrolled,
        })


class WorkshopListView(generics.ListCreateAPIView):
    serializer_class = WorkshopSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        from apps.users.permissions import IsAdminOrInstructor
        return [IsAdminOrInstructor()]

    def get_queryset(self):
        return Workshop.objects.filter(is_active=True)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class WorkshopDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkshopSerializer
    queryset = Workshop.objects.all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        from apps.users.permissions import IsAdminOrInstructor
        return [IsAdminOrInstructor()]


class WorkshopBookView(APIView):
    """POST to book a workshop; supports status=waitlisted for full workshops."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            workshop = Workshop.objects.get(pk=pk, is_active=True)
        except Workshop.DoesNotExist:
            return Response({'detail': 'Workshop not found.'}, status=404)

        if WorkshopBooking.objects.filter(workshop=workshop, student=request.user, status__in=['confirmed', 'waitlisted']).exists():
            return Response({'detail': 'Already booked.'}, status=400)

        book_status = 'waitlisted' if workshop.spots_left <= 0 else 'confirmed'
        booking = WorkshopBooking.objects.create(workshop=workshop, student=request.user, status=book_status)

        student = request.user
        if student.email:
            from django.core.mail import send_mail
            from django.conf import settings
            import threading
            date_str = workshop.date.strftime('%-d %B %Y') if workshop.date else ''
            time_str = workshop.start_time.strftime('%I:%M %p').lstrip('0') if workshop.start_time else ''
            studio_name = workshop.studio.name if workshop.studio else 'our studio'
            if book_status == 'confirmed':
                subject = f'Booking confirmed: {workshop.name}'
                body = (
                    f'Hi {student.first_name},\n\n'
                    f'Your spot in {workshop.name} is confirmed!\n\n'
                    f'Date: {date_str}\n'
                    f'Time: {time_str}\n'
                    f'Location: {studio_name}\n'
                    f'Price: ${workshop.price}\n\n'
                    f'See you there!\n'
                    f'Duality Pole Studio'
                )
            else:
                subject = f"You're on the waitlist: {workshop.name}"
                body = (
                    f'Hi {student.first_name},\n\n'
                    f"This workshop is currently full, but you've been added to the waitlist for {workshop.name}.\n\n"
                    f'Date: {date_str}\n'
                    f"We'll let you know as soon as a spot opens up.\n\n"
                    f'Duality Pole Studio'
                )
            threading.Thread(
                target=send_mail,
                kwargs=dict(subject=subject, message=body, from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[student.email], fail_silently=True),
                daemon=True,
            ).start()

        return Response({'id': booking.id, 'status': booking.status, 'workshop': workshop.name}, status=201)

    def delete(self, request, pk):
        """Cancel the current user's booking for this workshop."""
        try:
            workshop = Workshop.objects.get(pk=pk)
        except Workshop.DoesNotExist:
            return Response({'detail': 'Workshop not found.'}, status=404)
        try:
            booking = WorkshopBooking.objects.get(workshop=workshop, student=request.user, status__in=['confirmed', 'waitlisted'])
        except WorkshopBooking.DoesNotExist:
            return Response({'detail': 'No active booking found.'}, status=404)
        booking.status = 'cancelled'
        booking.save(update_fields=['status'])
        return Response({'detail': 'Booking cancelled.'})


class WorkshopBookingListView(APIView):
    """Admin view: list all bookings for a workshop."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if request.user.role not in ('admin', 'instructor', 'staff'):
            return Response({'detail': 'Forbidden.'}, status=403)
        try:
            workshop = Workshop.objects.get(pk=pk)
        except Workshop.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        bookings = workshop.bookings.select_related('student').order_by('status', 'created_at')
        data = [
            {
                'id': b.id,
                'student_id': b.student_id,
                'student_name': b.student.display_name,
                'student_email': b.student.email,
                'status': b.status,
                'created_at': b.created_at,
            }
            for b in bookings
        ]
        return Response(data)


# ── Practice Time ─────────────────────────────────────────────────────────────

class PracticeSlotListView(generics.ListCreateAPIView):
    serializer_class = PracticeSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = PracticeSlot.objects.select_related('studio').prefetch_related('bookings')
        if not (self.request.user.role in ('admin', 'instructor', 'staff')):
            qs = qs.filter(is_active=True, date__gte=date.today())
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        studio_id = self.request.query_params.get('studio')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if studio_id:
            qs = qs.filter(studio_id=studio_id)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrInstructor()]
        return [permissions.IsAuthenticated()]


class ClassUpsellListView(generics.ListCreateAPIView):
    serializer_class = ClassUpsellSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = ClassUpsell.objects.select_related('source_session', 'suggested_session', 'suggested_session__category')
        source = self.request.query_params.get('source_session')
        if source:
            qs = qs.filter(source_session_id=source, is_active=True)
        return qs


class ClassUpsellDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ClassUpsell.objects.select_related('source_session', 'suggested_session', 'suggested_session__category')
    serializer_class = ClassUpsellSerializer
    permission_classes = [IsAdminUser]


class UpsellSuggestView(APIView):
    """Given a list of session IDs, return active upsells for any of them.

    Priority:
    1. Session-level ClassUpsell (manually configured per session)
    2. Category-level upsell (default on the session's ClassCategory)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ids_param = request.query_params.get('session_ids', '')
        session_ids = [int(i) for i in ids_param.split(',') if i.strip().isdigit()]
        if not session_ids:
            return Response([])

        # 1. Session-level upsells
        upsells = ClassUpsell.objects.filter(
            source_session_id__in=session_ids, is_active=True
        ).select_related('source_session', 'suggested_session', 'suggested_session__category')
        seen_source = set()
        seen_suggested = set()
        results = []
        for u in upsells:
            if u.suggested_session_id not in seen_suggested:
                seen_source.add(u.source_session_id)
                seen_suggested.add(u.suggested_session_id)
                results.append(ClassUpsellSerializer(u).data)

        # 2. Category-level fallback for sessions that have no session-level upsell
        sessions_without_upsell = ClassSession.objects.filter(
            id__in=session_ids
        ).exclude(id__in=seen_source).select_related(
            'category', 'category__upsell_target_category'
        )
        for session in sessions_without_upsell:
            cat = session.category
            if not cat or not cat.upsell_target_category_id or not cat.upsell_headline:
                continue
            target_cat = cat.upsell_target_category
            # Find the first active session in the target category (same season preferred)
            suggested = ClassSession.objects.filter(
                category=target_cat, is_active=True
            ).exclude(id__in=seen_suggested).order_by('day_of_week', 'start_time').first()
            if suggested and suggested.id not in seen_suggested:
                seen_suggested.add(suggested.id)
                results.append({
                    'id': None,
                    'source_session': session.id,
                    'source_session_name': session.name,
                    'suggested_session': suggested.id,
                    'suggested_session_name': suggested.name,
                    'headline': cat.upsell_headline,
                    'body': cat.upsell_body,
                    'is_active': True,
                    'from_category': True,
                })

        return Response(results)


class PracticeSlotDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PracticeSlot.objects.all()
    serializer_class = PracticeSlotSerializer
    permission_classes = [IsAdminOrInstructor]


class PracticeSlotBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _calc_price(self, slot, user):
        from apps.enrolments.models import Enrolment
        from apps.classes.models import Season, PracticeBooking, PracticeCredit
        from django.utils import timezone
        import datetime

        # Prepaid practice credits take priority
        if PracticeCredit.objects.filter(student=user, status='available').exists():
            return 0, True

        # Makeup credits (any source) can also be used for practice
        from apps.attendance.models import MakeupCredit
        if MakeupCredit.objects.filter(student=user, status='available').exists():
            return 0, True

        active_season = Season.objects.filter(status__in=['active', 'upcoming']).order_by('-start_date').first()
        course_enrolments = Enrolment.objects.filter(
            student=user,
            status='active',
            enrolment_type='course',
            class_session__season=active_season,
        ).count() if active_season else 0
        if course_enrolments >= 4:
            # 4+ classes: unlimited free practice
            return 0, True
        if course_enrolments == 3:
            # 3 classes: 1 free practice per week (Mon–Sun)
            today = timezone.localdate()
            week_start = today - datetime.timedelta(days=today.weekday())
            week_end = week_start + datetime.timedelta(days=6)
            used_free_this_week = PracticeBooking.objects.filter(
                student=user,
                status='confirmed',
                is_free=True,
                slot__date__range=(week_start, week_end),
            ).count()
            if used_free_this_week == 0:
                return 0, True
            # Already used free slot this week — charge enrolled rate
        is_enrolled = course_enrolments > 0
        rate = slot.ENROLLED_RATE if is_enrolled else slot.NON_ENROLLED_RATE
        return round(slot.duration_hours * rate, 2), False

    def post(self, request, pk):
        import stripe as stripe_lib
        from decimal import Decimal
        try:
            slot = PracticeSlot.objects.get(pk=pk, is_active=True)
        except PracticeSlot.DoesNotExist:
            return Response({'detail': 'Slot not found.'}, status=status.HTTP_404_NOT_FOUND)

        if slot.date < date.today():
            return Response({'detail': 'Cannot book a past slot.'}, status=status.HTTP_400_BAD_REQUEST)

        if slot.spots_left <= 0:
            return Response({'detail': 'This slot is fully booked.'}, status=status.HTTP_400_BAD_REQUEST)

        if PracticeBooking.objects.filter(slot=slot, student=request.user, status='confirmed').exists():
            return Response({'detail': 'Already booked.'}, status=status.HTTP_400_BAD_REQUEST)

        price, is_free = self._calc_price(slot, request.user)
        payment_method = request.data.get('payment_method', 'reception')
        payment_type = ''

        if not is_free and payment_method in ('card', 'cash'):
            CASH_DISCOUNT = Decimal('5.00')
            user = request.user

            # Both card and cash require a card on file
            if not user.stripe_customer_id or not user.default_payment_method_id:
                return Response({'requires_card': True, 'detail': 'A saved card is required.'}, status=status.HTTP_402_PAYMENT_REQUIRED)

            if payment_method == 'cash':
                price = max(Decimal('0'), Decimal(str(price)) - CASH_DISCOUNT)
                payment_type = 'cash'
            else:
                import stripe as _stripe
                import os
                _stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
                try:
                    _stripe.PaymentIntent.create(
                        amount=int(Decimal(str(price)) * 100),
                        currency='aud',
                        customer=user.stripe_customer_id,
                        payment_method=user.default_payment_method_id,
                        confirm=True,
                        off_session=True,
                        description=f'Practice time — {slot.date} {slot.start_time}',
                        metadata={'user_id': user.id, 'slot_id': slot.id},
                    )
                except Exception as e:
                    return Response({'detail': f'Card declined: {getattr(e, "user_message", str(e))}'}, status=status.HTTP_402_PAYMENT_REQUIRED)
                payment_type = 'card'

        booking = PracticeBooking.objects.create(
            slot=slot,
            student=request.user,
            price_charged=price,
            is_free=is_free,
            payment_type=payment_type,
        )

        # Consume a credit if this booking is free
        if is_free:
            from django.utils import timezone as tz
            from apps.attendance.models import MakeupCredit
            practice_credit = PracticeCredit.objects.filter(
                student=request.user, status='available'
            ).order_by('created_at').first()
            if practice_credit:
                practice_credit.status = 'used'
                practice_credit.used_at = tz.now()
                practice_credit.used_for_booking = booking
                practice_credit.save(update_fields=['status', 'used_at', 'used_for_booking'])
                booking.payment_type = 'credit'
                booking.save(update_fields=['payment_type'])
            else:
                makeup_credit = MakeupCredit.objects.filter(
                    student=request.user, status='available'
                ).order_by('created_at').first()
                if makeup_credit:
                    makeup_credit.status = 'used'
                    makeup_credit.used_at = tz.now()
                    makeup_credit.save(update_fields=['status', 'used_at'])
                    booking.payment_type = 'makeup_credit'
                    booking.save(update_fields=['payment_type'])

        return Response(PracticeBookingSerializer(booking, context={'request': request}).data, status=status.HTTP_201_CREATED)


class PracticeSlotCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from datetime import datetime
        from django.utils import timezone
        from apps.enrolments.models import Enrolment
        from apps.classes.models import Season

        try:
            booking = PracticeBooking.objects.select_related('slot').get(
                slot_id=pk, student=request.user, status='confirmed'
            )
        except PracticeBooking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        slot = booking.slot

        # Determine hours until the slot starts
        slot_dt = datetime.combine(slot.date, slot.start_time)
        if timezone.is_naive(slot_dt):
            slot_dt = timezone.make_aware(slot_dt)
        hours_until = (slot_dt - timezone.now()).total_seconds() / 3600

        booking.status = 'cancelled'
        booking.save(update_fields=['status'])

        credit_issued = False
        late_cancel = hours_until < 4

        if not late_cancel:
            # Early cancel: issue a practice credit back
            PracticeCredit.objects.create(
                student=request.user,
                status='available',
                notes=f'Returned: practice cancelled on {slot.date} {slot.start_time:%H:%M}',
                created_by=request.user,
            )
            credit_issued = True
        else:
            # Late cancel: if the booking was free via the "3 classes = 1 free/week" rule,
            # that weekly free slot is consumed — do not issue a credit.
            # (If they paid cash/card, no refund is issued either.)
            pass

        return Response({
            'status': 'cancelled',
            'credit_issued': credit_issued,
            'late_cancel': late_cancel,
        })


class MyPracticeBookingsView(generics.ListAPIView):
    serializer_class = PracticeBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PracticeBooking.objects.filter(
            student=self.request.user
        ).select_related('slot', 'slot__studio').order_by('-slot__date', '-slot__start_time')


class AdminPracticeBookingsView(generics.ListAPIView):
    serializer_class = PracticeBookingSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = PracticeBooking.objects.select_related('slot', 'slot__studio', 'student').order_by('-slot__date', '-slot__start_time')
        slot_id = self.request.query_params.get('slot')
        if slot_id:
            qs = qs.filter(slot_id=slot_id)
        return qs


class CasualBookView(APIView):
    """Book or join waitlist for a specific class occurrence (casual / catch-up)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            occurrence = ClassOccurrence.objects.select_related('session__studio').get(pk=pk)
        except ClassOccurrence.DoesNotExist:
            return Response({'detail': 'Occurrence not found.'}, status=status.HTTP_404_NOT_FOUND)

        if occurrence.date < date.today():
            return Response({'detail': 'Cannot book a past class.'}, status=status.HTTP_400_BAD_REQUEST)

        if occurrence.status == 'cancelled':
            return Response({'detail': 'This class has been cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        # Upcoming-season casuals only open in week 8 of the active season
        occ_season = getattr(getattr(occurrence, 'session', None), 'season', None)
        if occ_season and getattr(occ_season, 'status', None) == 'upcoming':
            from apps.classes.models import Season as _Season
            from django.utils import timezone as _tz
            active_season = _Season.objects.filter(status='active').order_by('-start_date').first()
            if active_season and active_season.start_date:
                active_week = (_tz.localdate() - active_season.start_date).days // 7 + 1
                if active_week < 8:
                    return Response(
                        {'detail': 'Casual bookings for the upcoming season open in week 8 of the current season.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        enrolment_type = request.data.get('enrolment_type', 'casual')
        if enrolment_type not in ('casual', 'catchup', 'classpass'):
            return Response({'detail': 'Invalid enrolment_type.'}, status=status.HTTP_400_BAD_REQUEST)

        # Fix 6: Enforce week-3 drop-in cutoff server-side
        session = occurrence.session
        if session.catchup_cutoff_weeks:
            season = getattr(session, 'season', None)
            if season and season.start_date:
                from django.utils import timezone as _tz
                today = _tz.localdate()
                week_number = (today - season.start_date).days // 7 + 1
                if week_number > session.catchup_cutoff_weeks:
                    # Check auto_exempt_same_name: if student is enrolled in a session with the same name in this season
                    exempt = False
                    if session.auto_exempt_same_name:
                        from apps.enrolments.models import Enrolment
                        same_name_enrolled = Enrolment.objects.filter(
                            student=request.user,
                            class_session__name=session.name,
                            class_session__season=season,
                            status='active',
                        ).exists()
                        if same_name_enrolled:
                            exempt = True

                    # Check catchup_eligible_names: if student is enrolled in any of the listed class names
                    if not exempt and session.catchup_eligible_names:
                        eligible = [n.strip() for n in session.catchup_eligible_names.split(',') if n.strip()]
                        if eligible:
                            from apps.enrolments.models import Enrolment
                            enrolled_names = set(Enrolment.objects.filter(
                                student=request.user,
                                class_session__season=season,
                                status='active',
                            ).values_list('class_session__name', flat=True))
                            if enrolled_names & set(eligible):
                                exempt = True

                    if not exempt:
                        return Response(
                            {'detail': f'Drop-in bookings for {session.name} closed after week {session.catchup_cutoff_weeks} of the season.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

        if CasualBooking.objects.filter(
            occurrence=occurrence, student=request.user
        ).exclude(status='cancelled').exists():
            return Response({'detail': 'Already booked for this class.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate credit availability before checking capacity
        active_pass = None
        if enrolment_type == 'catchup':
            from apps.attendance.models import MakeupCredit
            credit = MakeupCredit.objects.filter(
                student=request.user, status='available'
            ).order_by('created_at').first()
            if not credit:
                return Response({'detail': 'No catch-up credits available.'}, status=status.HTTP_400_BAD_REQUEST)
            # Addon-source credits (Kiki/Unravel) can only be used in addon classes
            if credit.source_occurrence_id:
                src_cat = getattr(getattr(credit.source_occurrence, 'session', None), 'category', None)
                if src_cat and src_cat.is_addon_type:
                    tgt_cat = getattr(occurrence.session, 'category', None)
                    if not (tgt_cat and tgt_cat.is_addon_type):
                        return Response(
                            {'detail': 'This catch-up credit is from a Kiki or Unravel class and can only be used in Kiki, Unravel, or Practice Time.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
        elif enrolment_type == 'classpass':
            from apps.attendance.models import ClassPass
            from datetime import date as _date
            active_pass = ClassPass.objects.filter(
                student=request.user,
                classes_used__lt=models.F('num_classes'),
                expires_at__gte=_date.today(),
            ).order_by('expires_at').first()
            if not active_pass:
                return Response({'detail': 'No class pass credits available.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check capacity
        from apps.enrolments.models import Enrolment
        season_enrolled = Enrolment.objects.filter(
            class_session=occurrence.session, status='active', enrolment_type='course'
        ).count()
        casual_confirmed = occurrence.casual_bookings.filter(status='confirmed').count()
        spots_left = occurrence.session.capacity - season_enrolled - casual_confirmed

        if spots_left <= 0:
            # Join waitlist
            booking = CasualBooking.objects.create(
                occurrence=occurrence,
                student=request.user,
                enrolment_type=enrolment_type if enrolment_type == 'casual' else enrolment_type,
                status='waitlisted',
            )
            return Response(
                CasualBookingSerializer(booking, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )

        # Deduct credits now that we know the booking will proceed
        if enrolment_type == 'catchup':
            from apps.attendance.models import MakeupCredit
            from django.utils import timezone
            credit = MakeupCredit.objects.filter(
                student=request.user, status='available'
            ).order_by('created_at').first()
            credit.status = 'used'
            credit.used_at = timezone.now()
            credit.save(update_fields=['status', 'used_at'])
        elif enrolment_type == 'classpass' and active_pass:
            active_pass.classes_used += 1
            active_pass.save(update_fields=['classes_used'])

        is_free = enrolment_type in ('catchup', 'classpass')
        if is_free:
            price_charged = 0
        else:
            from apps.users.models import StudioSettings
            from apps.enrolments.models import Enrolment as _Enrolment
            _s = StudioSettings.objects.first()
            _session = occurrence.session
            _season = getattr(_session, 'season', None)
            is_enrolled_this_season = (
                _season is not None and
                _Enrolment.objects.filter(
                    student=request.user,
                    class_session__season=_season,
                    status='active',
                ).exists()
            )
            if is_enrolled_this_season:
                price_charged = float(_s.price_casual_enrolled) if _s else 30
            else:
                price_charged = float(_s.price_casual) if _s else 40

        # Fix 5: respect payment_method and cash_promised_date from request
        # CasualBooking model does not have payment_method or cash_promised_date fields,
        # so we only store what the model supports (price_charged, is_free).
        # No additional fields to set.

        booking = CasualBooking.objects.create(
            occurrence=occurrence,
            student=request.user,
            enrolment_type=enrolment_type,
            status='confirmed',
            price_charged=price_charged,
            is_free=is_free,
        )
        return Response(
            CasualBookingSerializer(booking, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class CasualBookCancelView(APIView):
    """Cancel or leave waitlist for a casual occurrence booking."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = CasualBooking.objects.get(
                occurrence_id=pk, student=request.user
            )
        except CasualBooking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status == 'cancelled':
            return Response({'detail': 'Already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        # Block cancellation if a waitlist spot has been offered
        if booking.status == 'waitlisted' and booking.waitlist_offered_at:
            return Response(
                {'detail': 'A spot has been offered to you — please claim or let it expire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        was_confirmed = booking.status == 'confirmed'
        was_catchup = booking.enrolment_type == 'catchup' and was_confirmed
        occurrence = booking.occurrence
        booking.status = 'cancelled'
        booking.save(update_fields=['status'])

        # Restore makeup credit if cancelling a confirmed catch-up before the class
        if was_catchup and occurrence.date >= date.today():
            from apps.attendance.models import MakeupCredit
            from django.utils import timezone
            MakeupCredit.objects.create(
                student=request.user,
                status='available',
                notes='Restored: casual catch-up booking cancelled',
            )

        # Offer freed spot to next waitlisted student
        if was_confirmed:
            _offer_casual_waitlist_spot(occurrence)

        return Response({'status': 'cancelled'})


class RejectCasualWaitlistOfferView(APIView):
    """Student explicitly rejects a casual/catchup/trial waitlist offer — cascades to next person."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(CasualBooking, pk=pk, student=request.user, status='waitlisted')

        if not booking.waitlist_offered_at:
            return Response({'detail': 'No active offer to reject.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.waitlist_expires_at and timezone.now() > booking.waitlist_expires_at:
            return Response({'detail': 'Offer has already expired.'}, status=status.HTTP_400_BAD_REQUEST)

        occurrence = booking.occurrence
        booking.waitlist_offer_rejected = True
        booking.waitlist_offered_at = None
        booking.waitlist_expires_at = None
        booking.save(update_fields=['waitlist_offer_rejected', 'waitlist_offered_at', 'waitlist_expires_at'])

        _cascade_casual_waitlist_offer(occurrence, skip_booking_id=booking.id)

        return Response({'status': 'rejected'})


class MyCasualBookingsView(generics.ListAPIView):
    serializer_class = CasualBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        student_id = self.request.query_params.get('student')
        if student_id and user.role in ('admin', 'instructor', 'staff'):
            return CasualBooking.objects.filter(
                student_id=student_id,
            ).exclude(status='cancelled').select_related(
                'occurrence__session__studio'
            ).order_by('occurrence__date')
        return CasualBooking.objects.filter(
            student=self.request.user,
        ).exclude(status='cancelled').select_related(
            'occurrence__session__studio'
        ).order_by('occurrence__date')


class CasualUpgradeView(APIView):
    """Student upgrades their casual booking to a full season enrolment."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            casual = CasualBooking.objects.select_related(
                'occurrence__session', 'student'
            ).get(pk=pk, student=request.user, displacement_offered_at__isnull=False)
        except CasualBooking.DoesNotExist:
            return Response({'detail': 'Casual booking not found or no upgrade offer active.'}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone
        if timezone.now() > casual.displacement_expires_at:
            return Response({'detail': 'This upgrade offer has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.enrolments.models import Enrolment
        from apps.users.models import Notification

        session = casual.occurrence.session

        # Create a full season enrolment for the casual student
        Enrolment.objects.get_or_create(
            student=casual.student,
            class_session=session,
            defaults={'enrolment_type': 'course', 'status': 'active'},
        )

        # Cancel the casual booking and clear displacement fields
        casual.status = 'cancelled'
        casual.displacement_offered_at = None
        casual.displacement_expires_at = None
        casual.save(update_fields=['status', 'displacement_offered_at', 'displacement_expires_at'])

        # Find the pending enrolment and waitlist them
        pending_enrolment = casual.pending_enrolments.filter(status='pending_displacement').first()
        if pending_enrolment:
            pending_enrolment.status = 'waitlisted'
            pending_enrolment.displacement_casual_booking = None
            pending_enrolment.displacement_expires_at = None
            pending_enrolment.save(update_fields=['status', 'displacement_casual_booking', 'displacement_expires_at'])
            Notification.objects.create(
                recipient=pending_enrolment.student,
                title=f'Update on {session.name}',
                body=(
                    f"The casual student chose to upgrade to the full season, so they've kept the spot. "
                    f"You've been added to the season waitlist and will be first in line if a spot opens."
                ),
                notification_type='info',
            )

        return Response({'detail': 'Upgrade successful. You are now enrolled for the full season.'}, status=status.HTTP_200_OK)


class CasualReleaseView(APIView):
    """Student releases their casual booking, giving the spot to the pending season enrolment."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            casual = CasualBooking.objects.select_related(
                'occurrence__session', 'student'
            ).get(pk=pk, student=request.user)
        except CasualBooking.DoesNotExist:
            return Response({'detail': 'Casual booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        from apps.enrolments.models import Enrolment
        from apps.users.models import Notification

        session = casual.occurrence.session

        casual.status = 'cancelled'
        casual.save(update_fields=['status'])

        # Confirm the pending enrolment
        pending_enrolment = casual.pending_enrolments.filter(status='pending_displacement').first()
        if pending_enrolment:
            pending_enrolment.status = 'active'
            pending_enrolment.displacement_casual_booking = None
            pending_enrolment.displacement_expires_at = None
            pending_enrolment.save(update_fields=['status', 'displacement_casual_booking', 'displacement_expires_at'])
            Notification.objects.create(
                recipient=pending_enrolment.student,
                title=f"You're in! — {session.name}",
                body=f'The casual student released their spot. You\'re confirmed for the full season in {session.name}!',
                notification_type='success',
                action_label='View My Classes',
                action_url='/portal/classes',
            )

        # Notify the casual student of credit
        Notification.objects.create(
            recipient=casual.student,
            title=f'Spot released — {session.name}',
            body=(
                f'Your casual booking for {session.name} has been released. '
                f'Your account has been credited ${casual.price_charged}.'
            ),
            notification_type='info',
        )

        return Response({'detail': 'Spot released successfully.'}, status=status.HTTP_200_OK)


class CasualAdminDisplaceView(APIView):
    """Admin force-displaces a casual booking."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            casual = CasualBooking.objects.select_related(
                'occurrence__session', 'student'
            ).get(pk=pk)
        except CasualBooking.DoesNotExist:
            return Response({'detail': 'Casual booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        from apps.enrolments.models import Enrolment
        from apps.users.models import Notification

        session = casual.occurrence.session

        casual.status = 'cancelled'
        casual.save(update_fields=['status'])

        # Confirm the pending enrolment
        pending_enrolment = casual.pending_enrolments.filter(status='pending_displacement').first()
        if pending_enrolment:
            pending_enrolment.status = 'active'
            pending_enrolment.displacement_casual_booking = None
            pending_enrolment.displacement_expires_at = None
            pending_enrolment.save(update_fields=['status', 'displacement_casual_booking', 'displacement_expires_at'])
            Notification.objects.create(
                recipient=pending_enrolment.student,
                title=f"You're in! — {session.name}",
                body=f'Your spot in {session.name} has been confirmed for the full season!',
                notification_type='success',
                action_label='View My Classes',
                action_url='/portal/classes',
            )

        # Notify the casual student of credit
        Notification.objects.create(
            recipient=casual.student,
            title=f'Spot released — {session.name}',
            body=(
                f'Your casual booking for {session.name} has been released by an admin. '
                f'Your account has been credited ${casual.price_charged}.'
            ),
            notification_type='info',
        )

        return Response({'detail': 'Casual booking force-displaced.'}, status=status.HTTP_200_OK)


class ClassEmailView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, session_pk):
        from apps.enrolments.models import Enrolment
        from apps.users.models import Notification
        from django.core.mail import send_mail
        from django.conf import settings

        subject = request.data.get('subject', '').strip()
        message = request.data.get('message', '').strip()
        if not subject or not message:
            return Response({'detail': 'subject and message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = ClassSession.objects.get(pk=session_pk)
        except ClassSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        enrolments = Enrolment.objects.filter(
            class_session=session, status='active'
        ).select_related('student')

        sent_count = 0
        for enrolment in enrolments:
            student = enrolment.student
            Notification.objects.create(
                recipient=student,
                title=subject,
                body=message,
                notification_type='info',
            )
            if student.email:
                from apps.users.email_utils import send_branded_email
                send_branded_email(
                    to_email=student.email,
                    subject=subject,
                    template_name='class_message',
                    context={
                        'first_name': student.first_name,
                        'greeting': f'Hi {student.first_name},',
                        'message': message,
                        'plain_text': f'Hi {student.first_name},\n\n{message}\n\nDuality Pole Studio',
                    }
                )
                sent_count += 1

        return Response({'sent': sent_count, 'total': enrolments.count()})


class SeasonCloseView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from apps.enrolments.models import Enrolment

        try:
            season = Season.objects.get(pk=pk)
        except Season.DoesNotExist:
            return Response({'detail': 'Season not found.'}, status=status.HTTP_404_NOT_FOUND)

        if season.status == 'completed':
            return Response({'detail': 'Season is already completed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark all active enrolments in this season's sessions as completed
        session_ids = list(season.sessions.values_list('id', flat=True))
        completed_count = Enrolment.objects.filter(
            class_session_id__in=session_ids,
            status='active'
        ).update(status='completed')

        # Mark the season as completed
        season.status = 'completed'
        season.bookings_open = False
        season.save(update_fields=['status', 'bookings_open'])

        # Deactivate all class sessions belonging to this season
        deactivated_count = ClassSession.objects.filter(season=season, is_active=True).update(is_active=False)

        from .serializers import SeasonSerializer
        return Response({
            'season': SeasonSerializer(season).data,
            'enrolments_completed': completed_count,
            'sessions_deactivated': deactivated_count,
        })


class MyUpcomingClassesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.enrolments.models import Enrolment
        from apps.attendance.models import AttendanceRecord, MakeupCredit
        import datetime

        student = request.user
        today = datetime.date.today()
        items = []

        # 1. Enrolled class occurrences (active enrolments) — all upcoming, including away
        active_enrolments = Enrolment.objects.filter(
            student=student, status='active'
        ).select_related('class_session__studio', 'class_session__instructor')

        session_ids = [e.class_session_id for e in active_enrolments if e.class_session_id]
        enrolment_by_session = {e.class_session_id: e for e in active_enrolments}

        if session_ids:
            occurrences = (ClassOccurrence.objects
                .filter(session_id__in=session_ids, date__gte=today, status='scheduled')
                .select_related('session__studio', 'session__instructor')
                .order_by('date', 'session__start_time'))

            # Get absence records for these occurrences
            absence_records = {
                ar.occurrence_id: ar
                for ar in AttendanceRecord.objects.filter(
                    student=student, occurrence__in=occurrences, status='absent'
                )
            }

            for occ in occurrences:
                sess = occ.session
                enrolment = enrolment_by_session.get(sess.id)
                absence = absence_records.get(occ.id)
                # Count confirmed spots to check capacity
                enrolled_count = AttendanceRecord.objects.filter(
                    occurrence=occ
                ).exclude(status__in=['absent', 'no_show']).count()

                # Who's coming: other enrolled students with roster visibility on
                from apps.enrolments.models import Enrolment as EnrolModel
                classmates_qs = EnrolModel.objects.filter(
                    class_session=sess, status='active', enrolment_type='course'
                ).exclude(student=student).select_related('student')
                classmates = []
                for e in classmates_qs:
                    u = e.student
                    if u.show_in_roster:
                        name = u.nickname if u.roster_name == 'nickname' and u.nickname else u.first_name
                        if name:
                            classmates.append(name)

                items.append({
                    'id': f'enrol-{occ.id}',
                    'type': 'enrolled',
                    'date': str(occ.date),
                    'start_time': str(sess.start_time)[:5] if sess.start_time else None,
                    'session_name': sess.name,
                    'studio_name': sess.studio.name if sess.studio else None,
                    'instructor_name': (
                        f"{sess.instructor.first_name} {sess.instructor.last_name}".strip()
                        if sess.instructor else None
                    ),
                    'status': 'away' if absence else 'attending',
                    'occurrence_id': occ.id,
                    'enrolment_id': enrolment.id if enrolment else None,
                    'makeup_credit_issued': absence is not None,
                    'spots_left': max(0, sess.capacity - enrolled_count),
                    'is_past': occ.date < today,
                    'classmates': classmates,
                    'session_id': sess.id,
                })

        # 2. Casual / catch-up / class-pass bookings
        casual_bookings = (CasualBooking.objects
            .filter(student=student, status__in=['confirmed', 'waitlisted'])
            .select_related('occurrence__session__studio', 'occurrence__session__instructor')
            .filter(occurrence__date__gte=today)
            .order_by('occurrence__date', 'occurrence__session__start_time'))

        for cb in casual_bookings:
            occ = cb.occurrence
            sess = occ.session
            items.append({
                'id': f'casual-{cb.id}',
                'type': cb.enrolment_type,  # 'casual', 'catchup', 'classpass'
                'date': str(occ.date),
                'start_time': str(sess.start_time)[:5] if sess.start_time else None,
                'session_name': sess.name,
                'studio_name': sess.studio.name if sess.studio else None,
                'instructor_name': (
                    f"{sess.instructor.first_name} {sess.instructor.last_name}".strip()
                    if sess.instructor else None
                ),
                'status': cb.status,  # 'confirmed' or 'waitlisted'
                'booking_id': cb.id,
                'occurrence_id': occ.id,
                'session_id': sess.id,
                'spots_left': None,
                'is_past': False,
            })

        # 3. Practice bookings
        practice_bookings = (PracticeBooking.objects
            .filter(student=student, status='confirmed')
            .select_related('slot__studio')
            .filter(slot__date__gte=today)
            .order_by('slot__date', 'slot__start_time'))

        for pb in practice_bookings:
            slot = pb.slot
            items.append({
                'id': f'practice-{pb.id}',
                'type': 'practice',
                'date': str(slot.date),
                'start_time': str(slot.start_time)[:5] if slot.start_time else None,
                'session_name': 'Practice Time',
                'studio_name': slot.studio.name if slot.studio else None,
                'instructor_name': None,
                'status': 'confirmed',
                'booking_id': pb.id,
                'occurrence_id': None,
                'spots_left': None,
                'is_past': False,
            })

        # Sort all items by date then time
        items.sort(key=lambda x: (x['date'], x['start_time'] or ''))
        return Response(items)


class AdminCasualWaitlistView(generics.ListAPIView):
    """Admin: all waitlisted casual/catchup/trial CasualBooking records."""
    permission_classes = [IsAdminOrInstructor]
    serializer_class = CasualBookingSerializer

    def get_queryset(self):
        return CasualBooking.objects.filter(
            status='waitlisted',
        ).select_related(
            'student', 'occurrence__session__studio', 'occurrence__session__instructor',
        ).order_by('occurrence__date', 'created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        result = []
        for booking in qs:
            occ = booking.occurrence
            s = occ.session
            result.append({
                'id': booking.id,
                'occurrence_id': occ.id,
                'occurrence_date': str(occ.date),
                'session_id': s.id,
                'session_name': s.name,
                'start_time': str(s.start_time)[:5] if s.start_time else None,
                'studio_name': s.studio.name if s.studio else None,
                'instructor_name': s.instructor.display_name if s.instructor else None,
                'session_capacity': s.capacity,
                'confirmed_count': occ.casual_bookings.filter(status='confirmed').count(),
                'student_id': booking.student_id,
                'student_name': booking.student.display_name,
                'student_email': booking.student.email,
                'enrolment_type': booking.enrolment_type,
                'status': booking.status,
                'created_at': booking.created_at.isoformat() if booking.created_at else None,
                'waitlist_offered_at': booking.waitlist_offered_at.isoformat() if booking.waitlist_offered_at else None,
                'waitlist_expires_at': booking.waitlist_expires_at.isoformat() if booking.waitlist_expires_at else None,
            })
        return Response(result)


class AdminPromoteCasualWaitlistView(APIView):
    """Admin: promote a waitlisted casual booking to confirmed, with optional capacity override."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        booking = get_object_or_404(CasualBooking, pk=pk, status='waitlisted')
        override = request.data.get('override_capacity', False)

        occ = booking.occurrence
        confirmed_count = occ.casual_bookings.filter(status='confirmed').count()
        capacity = occ.session.capacity

        if not override and confirmed_count >= capacity:
            return Response({
                'detail': 'Class is at capacity.',
                'current': confirmed_count,
                'capacity': capacity,
                'requires_override': True,
            }, status=status.HTTP_409_CONFLICT)

        booking.status = 'confirmed'
        booking.waitlist_offered_at = None
        booking.waitlist_expires_at = None
        booking.save(update_fields=['status', 'waitlist_offered_at', 'waitlist_expires_at'])

        from apps.users.models import Notification
        Notification.objects.create(
            recipient=booking.student,
            title=f"Spot confirmed — {occ.session.name}",
            body=f"Great news! You've been moved from the waitlist to confirmed for {occ.session.name} on {occ.date.strftime('%d %b')}.",
            notification_type='success',
        )

        return Response({'status': 'ok', 'id': booking.id})


class AdminSendCasualWaitlistOfferView(APIView):
    """Admin: manually send (or resend) a waitlist offer to a casual/catchup/trial booking."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from datetime import timedelta
        from apps.users.models import Notification
        from django.core.mail import send_mail
        from django.conf import settings

        booking = get_object_or_404(CasualBooking, pk=pk, status='waitlisted')
        occ = booking.occurrence
        session = occ.session
        student = booking.student

        try:
            expires_hours = max(1, int(request.data.get('expires_hours', 4)))
        except (ValueError, TypeError):
            expires_hours = 4

        now = timezone.now()
        expires_at = now + timedelta(hours=expires_hours)
        expires_str = expires_at.strftime('%I:%M %p')

        booking.waitlist_offered_at = now
        booking.waitlist_expires_at = expires_at
        booking.save(update_fields=['waitlist_offered_at', 'waitlist_expires_at'])

        prefs = student.notification_preferences or {}
        if prefs.get('waitlist_app', True):
            Notification.objects.create(
                recipient=student,
                title=f"Spot available — {session.name}",
                body=f"A spot is available for you on {occ.date.strftime('%d %b')}! You have {expires_hours} hour{'s' if expires_hours != 1 else ''} to claim it (until {expires_str}).",
                notification_type='waitlist',
                action_label='Claim My Spot',
                action_url='/portal/classes',
            )

        if prefs.get('waitlist_email', True) and student.email:
            send_mail(
                subject=f"A spot has opened up — {session.name}!",
                message=(
                    f"Hi {student.first_name},\n\n"
                    f"A spot has opened up in {session.name} on {occ.date.strftime('%d %B')}!\n\n"
                    f"You have {expires_hours} hour{'s' if expires_hours != 1 else ''} to claim your spot (until {expires_str}). "
                    "If you don't confirm by then, your spot will be offered to the next person.\n\n"
                    "Log in to confirm your booking.\n\n"
                    "Duality Pole Studio"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[student.email],
                fail_silently=True,
            )

        return Response({
            'waitlist_offered_at': booking.waitlist_offered_at.isoformat(),
            'waitlist_expires_at': booking.waitlist_expires_at.isoformat(),
        })


class ToggleAutoPromoteWaitlistView(APIView):
    """Admin: toggle auto_promote_waitlist on a class session."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        session = get_object_or_404(ClassSession, pk=pk)
        session.auto_promote_waitlist = not session.auto_promote_waitlist
        session.save(update_fields=['auto_promote_waitlist'])
        return Response({'auto_promote_waitlist': session.auto_promote_waitlist})


class AdminBulkCasualWaitlistView(APIView):
    """Admin: bulk promote or remove waitlisted casual/catchup/trial bookings."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request):
        from apps.users.models import Notification

        action = request.data.get('action')
        ids = request.data.get('ids', [])
        override = request.data.get('override_capacity', False)

        if action not in ('promote', 'remove'):
            return Response({'detail': 'action must be promote or remove'}, status=status.HTTP_400_BAD_REQUEST)
        if not ids:
            return Response({'detail': 'ids required'}, status=status.HTTP_400_BAD_REQUEST)

        bookings = CasualBooking.objects.filter(pk__in=ids, status='waitlisted').select_related(
            'occurrence__session', 'student'
        )
        results = {'succeeded': [], 'failed': []}

        for booking in bookings:
            if action == 'remove':
                bid = booking.id
                booking.delete()
                results['succeeded'].append(bid)
            else:
                occ = booking.occurrence
                confirmed_count = occ.casual_bookings.filter(status='confirmed').count()
                capacity = occ.session.capacity
                if not override and confirmed_count >= capacity:
                    results['failed'].append({'id': booking.id, 'reason': 'at_capacity'})
                    continue
                booking.status = 'confirmed'
                booking.waitlist_offered_at = None
                booking.waitlist_expires_at = None
                booking.save(update_fields=['status', 'waitlist_offered_at', 'waitlist_expires_at'])
                Notification.objects.create(
                    recipient=booking.student,
                    title=f"Spot confirmed — {occ.session.name}",
                    body=f"You've been moved from the waitlist to confirmed for {occ.session.name} on {occ.date.strftime('%d %b')}.",
                    notification_type='success',
                )
                results['succeeded'].append(booking.id)

        return Response(results)


class AdminPracticeAttendanceView(APIView):
    """Admin: view and update attendance records for a practice slot.

    GET  /api/classes/practice/<slot_pk>/attendance/
    POST /api/classes/practice/<slot_pk>/attendance/  { student, status, kisi_access_granted }
    """
    permission_classes = [IsAdminOrInstructor]

    def get(self, request, slot_pk):
        slot = get_object_or_404(PracticeSlot, pk=slot_pk)
        bookings = PracticeBooking.objects.filter(
            slot=slot, status='confirmed'
        ).select_related('student')

        results = [PracticeBookingSerializer(b, context={'request': request}).data for b in bookings]
        slot_data = PracticeSlotSerializer(slot, context={'request': request}).data
        return Response({'slot': slot_data, 'bookings': results})

    def post(self, request, slot_pk):
        """Update attendance status and/or kisi flag for one student in this practice slot.
        Accepts: { student_id, attendance_status, kisi_access_granted }
        """
        slot = get_object_or_404(PracticeSlot, pk=slot_pk)
        student_id = request.data.get('student_id')
        att_status = request.data.get('attendance_status', 'pending')
        kisi = request.data.get('kisi_access_granted', False)

        if not student_id:
            return Response({'detail': 'student_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = PracticeBooking.objects.get(slot=slot, student_id=student_id)
        except PracticeBooking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        booking.attendance_status = att_status
        booking.kisi_access_granted = bool(kisi)
        booking.save(update_fields=['attendance_status', 'kisi_access_granted'])
        return Response(PracticeBookingSerializer(booking, context={'request': request}).data, status=status.HTTP_200_OK)


class AdminPracticeAddStudentView(APIView):
    """Admin: add a student to a practice slot (creates a booking)."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, slot_pk):
        slot = get_object_or_404(PracticeSlot, pk=slot_pk)
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id required'}, status=status.HTTP_400_BAD_REQUEST)

        if PracticeBooking.objects.filter(slot=slot, student_id=student_id, status='confirmed').exists():
            return Response({'detail': 'Student already booked into this slot.'}, status=status.HTTP_400_BAD_REQUEST)

        booking = PracticeBooking.objects.create(
            slot=slot,
            student_id=student_id,
            price_charged=0,
            is_free=True,
            payment_type='admin',
        )
        return Response(PracticeBookingSerializer(booking, context={'request': request}).data, status=status.HTTP_201_CREATED)


class AdminPracticeRemoveStudentView(APIView):
    """Admin: remove a student from a practice slot (cancels their booking)."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, slot_pk):
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = PracticeBooking.objects.get(slot_id=slot_pk, student_id=student_id, status='confirmed')
        except PracticeBooking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        booking.status = 'cancelled'
        booking.save(update_fields=['status'])
        return Response({'status': 'removed'})


# ── Practice attendance helpers ──────────────────────────────────────────────
# We store practice-slot attendance in a lightweight dict keyed by (slot_id, student_id)
# using a simple JSON store on the PracticeBooking model's payment_type field
# for the kisi flag, and a separate table for status.
# Rather than a separate model, we piggyback on an existing JSON cache in PracticeBooking.

def _get_practice_attendance(slot_id, student_id):
    try:
        b = PracticeBooking.objects.get(slot_id=slot_id, student_id=student_id, status='confirmed')
        return {'status': b.attendance_status, 'kisi_access_granted': b.kisi_access_granted}
    except PracticeBooking.DoesNotExist:
        return {}


def _upsert_practice_attendance(slot_id, student_id, att_status, kisi_access_granted, recorded_by):
    try:
        b = PracticeBooking.objects.get(slot_id=slot_id, student_id=student_id)
    except PracticeBooking.DoesNotExist:
        return {'detail': 'Booking not found.'}

    if att_status:
        b.attendance_status = att_status
    b.kisi_access_granted = bool(kisi_access_granted)
    b.save(update_fields=['attendance_status', 'kisi_access_granted'])
    return {'status': b.attendance_status, 'kisi_access_granted': b.kisi_access_granted}


class PracticeCreditListView(generics.ListCreateAPIView):
    """Admin: list and create practice credits for a student."""
    serializer_class = PracticeCreditSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        student_id = self.request.query_params.get('student')
        qs = PracticeCredit.objects.select_related('student', 'created_by')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    def create(self, request, *args, **kwargs):
        count = int(request.data.get('count', 1))
        student_id = request.data.get('student')
        notes = request.data.get('notes', '')
        if not student_id:
            return Response({'detail': 'student is required.'}, status=status.HTTP_400_BAD_REQUEST)
        created = []
        for _ in range(count):
            credit = PracticeCredit.objects.create(
                student_id=student_id,
                notes=notes,
                created_by=request.user,
            )
            created.append(credit)
        return Response(PracticeCreditSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class PracticeCreditDetailView(generics.DestroyAPIView):
    """Admin: delete (void) a practice credit."""
    queryset = PracticeCredit.objects.all()
    serializer_class = PracticeCreditSerializer
    permission_classes = [IsAdminOrInstructor]


class SessionNamesView(APIView):
    """Return distinct class session names for skill list creation."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        names = (
            ClassSession.objects
            .filter(is_active=True)
            .values_list('name', flat=True)
            .distinct()
            .order_by('name')
        )
        # Deduplicate case-insensitively (e.g. "Level 1" vs "level 1")
        seen = set()
        result = []
        for n in names:
            key = n.strip().lower()
            if key not in seen:
                seen.add(key)
                result.append(n.strip())
        return Response(result)


class RevenueStatsView(APIView):
    """Admin-only endpoint returning revenue and fill stats per class session."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        from django.db.models import Sum
        from apps.payments.models import Payment
        from apps.enrolments.models import Enrolment

        # Filter sessions to the current active season if one exists
        try:
            active_season = Season.objects.get(status='active')
            sessions = ClassSession.objects.filter(
                season=active_season, is_active=True
            ).select_related('instructor', 'studio')
        except Season.DoesNotExist:
            sessions = ClassSession.objects.filter(is_active=True).select_related(
                'instructor', 'studio'
            )
        except Season.MultipleObjectsReturned:
            active_season = Season.objects.filter(status='active').order_by('-start_date').first()
            sessions = ClassSession.objects.filter(
                season=active_season, is_active=True
            ).select_related('instructor', 'studio')

        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        result = []

        for session in sessions:
            enrolled = Enrolment.objects.filter(
                class_session=session, status='active'
            ).count()
            capacity = session.capacity or 0
            fill_rate = round(enrolled / capacity * 100) if capacity > 0 else 0

            # Revenue: sum payments from students enrolled in this session
            enrolled_student_ids = Enrolment.objects.filter(
                class_session=session,
                status='active',
            ).values_list('student_id', flat=True)

            revenue_agg = Payment.objects.filter(
                student_id__in=enrolled_student_ids,
                payment_type='payment',
                description__icontains=session.name,
            ).aggregate(total=Sum('amount'))
            revenue = float(revenue_agg['total'] or 0)

            avg_per_student = round(revenue / enrolled, 2) if enrolled > 0 else 0.0

            instructor_name = ''
            if session.instructor:
                instructor_name = session.instructor.first_name or session.instructor.display_name

            result.append({
                'id': session.id,
                'name': session.name,
                'day': day_names[session.day_of_week] if session.day_of_week is not None else '',
                'instructor': instructor_name,
                'enrolled': enrolled,
                'capacity': capacity,
                'fill_rate': fill_rate,
                'revenue': revenue,
                'avg_per_student': avg_per_student,
            })

        return Response({'sessions': result})


class SeasonNotifyMeView(APIView):
    """Register interest in being notified when casual/trial bookings open for an upcoming season."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        from apps.classes.models import Season, SeasonNotificationInterest
        try:
            season = Season.objects.get(pk=pk, status='upcoming')
        except Season.DoesNotExist:
            return Response({'detail': 'Season not found or not upcoming.'}, status=404)

        email = (request.data.get('email') or '').strip().lower()
        first_name = (request.data.get('first_name') or '').strip()
        if not email or '@' not in email:
            return Response({'detail': 'A valid email is required.'}, status=400)

        obj, created = SeasonNotificationInterest.objects.get_or_create(
            season=season, email=email,
            defaults={'first_name': first_name},
        )
        if not created and first_name and not obj.first_name:
            obj.first_name = first_name
            obj.save(update_fields=['first_name'])

        return Response({'registered': True, 'season': season.name})


class TrialSessionsView(APIView):
    """Public endpoint — returns all active sessions for the active season (any class is triallable)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import Season, ClassSession
        from .serializers import ClassSessionSerializer

        active_season = Season.objects.filter(status='active').order_by('-start_date').first()
        if not active_season:
            return Response({'results': []})

        sessions = ClassSession.objects.filter(
            season=active_season, is_active=True
        ).select_related('instructor', 'studio').order_by('day_of_week', 'start_time')

        serializer = ClassSessionSerializer(sessions, many=True, context={'request': request})
        return Response({'results': serializer.data, 'season': active_season.name, 'season_id': active_season.id})


class GenerateClassDescriptionView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request):
        import os
        try:
            import anthropic as _anthropic
        except ImportError:
            return Response({'error': 'AI not available'}, status=503)

        api_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not api_key:
            return Response({'error': 'AI not configured'}, status=503)

        name = request.data.get('name', '').strip()
        level = request.data.get('level', '').strip()
        field = request.data.get('field', 'description')  # 'description' or 'first_timer_body'

        if not name:
            return Response({'error': 'Class name is required'}, status=400)

        if field == 'first_timer_body':
            user_prompt = (
                f'Write the "first-timer info" body for the class "{name}" at Duality Pole Studio.\n'
                f'Cover: what to wear, what to bring, and what to expect on the day.\n'
                f'Keep it practical, warm, and encouraging. Use short punchy sentences or a brief list. Max 5 points.'
            )
        else:
            user_prompt = (
                f'Write a short class description for "{name}" at Duality Pole Studio.\n'
                + (f'Level: {level}\n' if level else '')
                + 'Max 2–3 sentences. Capture what the class is about and what students can expect to work on.'
            )

        BRAND_VOICE_SYSTEM = """You write class copy for Duality Pole Studio — a boutique pole dancing studio on Gadigal Land in Surry Hills, Sydney.

BRAND VOICE:
- Short, punchy sentences. Fragments are fine. Even encouraged.
- Direct. Confident. Warm but never gushing.
- Playful — dry humour lands well here. Don't force it though.
- Unapologetically comfortable with words like sensual, sexy, tease, flirty. Don't shy away from them.
- Inclusive — every body, every background, every level.
- Never corporate. Never a gym. Never over-explained.
- No hashtags. No emojis. No exclamation marks unless it's genuinely earned.

REAL EXAMPLES OF OUR CLASS DESCRIPTIONS (match this tone exactly):

Level 1: "Your pole era starts here. Learn spins, grips, floorwork to build strength and tease out your sensual side. You'll also learn how to put it all together and dance a full routine. Perfect if you've never touched a pole before (and no, drunk on Cityrail doesn't count)."

Level 2: "Can you execute all your tricks from Level 1? Wow, you're amazing! Time to climb higher, invert for the first time (yes, that's upside down — you're ready)."

Level 3: "Getting spicy. You'll build on your inversions, add climbing, and your routine will start to feel more like a real performance."

Floor Virgin: "Get low. This one's all about floorwork — crawls, rolls, transitions, and moves that make the ground your dance floor."

Strip Virgin: "Flirty, fun, and unapologetically sexy. Learn the art of the tease through chair work, floor play, and a whole lot of attitude."

Dance Virgin: "Your first taste of pure movement. No pole required (well, there's one nearby, but you won't need it). Floor-based, fun, and full of personality."

Kiki: "Conditioning disguised as fun. Kiki is a conditioning class that builds the strength, stability, and flexibility you need to level up your pole skills — through movement that doesn't feel like a workout (but absolutely is)."

Unravel: "Stretching and flexibility for pole dancers. Designed to open you up safely and progressively so you can access the shapes you've been dreaming about."

Invert Tech: "Technical work on inversions — breaking them down, building strength, and refining entry and exit."

REAL EXAMPLES OF OUR FIRST-TIMER INFO (what to wear / bring / expect):

What to wear: "Shorts are essential. Skin contact with the pole is part of how grip works, so you need exposed legs and ideally a sports crop or fitted top. You can change at the studio — no need to rock up in your pole gear."

What to bring: "Your water bottle, and a good attitude. Everything else you'll figure out as you go. Grip aids are available at the studio if you need them."

What to expect: "Show up on time. Your instructor will take you through a warm-up before getting into the class content. Put your phone away — you can exist without Instagram for 50 minutes. If you're going to be late, let your instructor know in advance."

RULES:
- Class descriptions: 2–3 sentences max. What it is, what you do, who it's for.
- First-timer body: short practical points. What to wear, what to bring, what to expect. Warm and real, not corporate safety briefing.
- Never write "journey". Never write "transform". Never write "amazing community" or "safe space". Show it, don't say it.
- Never mention weight loss, toning, or burning calories as reasons to do pole. Strength, fitness, and sweating are fine — "will have you sweating more than hot yoga" is perfect. The goal is skill, artistry, and feeling good, not changing how your body looks.
- Never say anything that implies a student should want to change how their body looks.
- Write as if you're talking directly to someone who's a bit nervous but excited."""

        try:
            ai = _anthropic.Anthropic(api_key=api_key)
            resp = ai.messages.create(
                model='claude-haiku-4-5-20251001',
                max_tokens=300,
                system=BRAND_VOICE_SYSTEM,
                messages=[{'role': 'user', 'content': user_prompt}],
            )
            text = resp.content[0].text.strip() if resp.content else ''
            return Response({'result': text})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ClassSeasonEnrolmentsView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def get(self, request, pk):
        from apps.enrolments.models import Enrolment, ClassChangeRequest

        try:
            session = ClassSession.objects.select_related('instructor', 'studio', 'season').get(pk=pk)
        except ClassSession.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        season = session.season
        season_id = season.id if season else None

        PRICE_TIERS = [0, 270, 440, 580, 700, 800, 900]

        def incremental_price(count):
            if not count or count <= 0:
                return None
            idx = min(count, len(PRICE_TIERS) - 1)
            return PRICE_TIERS[idx] - PRICE_TIERS[idx - 1]

        def season_enrolment_count(student):
            if not season_id:
                return None
            session_ids = ClassSession.objects.filter(season_id=season_id).values_list('id', flat=True)
            return Enrolment.objects.filter(
                student=student,
                class_session_id__in=session_ids,
                status='active',
                enrolment_type='course',
            ).count()

        def is_new_to_duality(enrolment):
            return not Enrolment.objects.filter(
                student=enrolment.student,
                enrolled_date__lt=enrolment.enrolled_date,
                enrolment_type='course',
            ).exists()

        enrolled_qs = (
            Enrolment.objects
            .filter(class_session=session, status='active', enrolment_type='course')
            .select_related('student')
            .order_by('enrolled_date')
        )

        waitlist_qs = (
            Enrolment.objects
            .filter(class_session=session, status='waitlisted')
            .select_related('student')
            .order_by('waitlist_position', 'enrolled_date')
        )

        transfers_in = (
            ClassChangeRequest.objects
            .filter(requested_session=session, request_type='transfer')
            .select_related('student', 'current_enrolment__class_session')
        )

        transfers_out = (
            ClassChangeRequest.objects
            .filter(current_enrolment__class_session=session, request_type='transfer')
            .exclude(requested_session=session)
            .select_related('student', 'requested_session')
        )

        enrolled_data = []
        for e in enrolled_qs:
            count = season_enrolment_count(e.student)
            enrolled_data.append({
                'id': e.id,
                'student_id': e.student_id,
                'student_name': e.student.display_name,
                'student_level': e.student.level,
                'enrolled_date': e.enrolled_date,
                'is_first_visit': e.is_first_visit,
                'level_override': e.level_override,
                'flag_dismissed': e.flag_dismissed,
                'is_new_to_duality': is_new_to_duality(e),
                'season_enrolment_count': count,
                'incremental_price': incremental_price(count),
                'notes': e.notes,
            })

        waitlist_data = []
        for e in waitlist_qs:
            waitlist_data.append({
                'id': e.id,
                'student_id': e.student_id,
                'student_name': e.student.display_name,
                'student_level': e.student.level,
                'waitlist_position': e.waitlist_position,
                'enrolled_date': e.enrolled_date,
            })

        transfers_data = []
        for t in transfers_in:
            from_class = None
            if t.current_enrolment and t.current_enrolment.class_session:
                from_class = t.current_enrolment.class_session.name
            transfers_data.append({
                'id': t.id,
                'direction': 'in',
                'student_id': t.student_id,
                'student_name': t.student.display_name,
                'from_class': from_class,
                'to_class': session.name,
                'status': t.status,
                'created_at': t.created_at,
                'notes': t.notes,
            })
        for t in transfers_out:
            transfers_data.append({
                'id': t.id,
                'direction': 'out',
                'student_id': t.student_id,
                'student_name': t.student.display_name,
                'from_class': session.name,
                'to_class': t.requested_session.name if t.requested_session else None,
                'status': t.status,
                'created_at': t.created_at,
                'notes': t.notes,
            })
        transfers_data.sort(key=lambda x: x['created_at'], reverse=True)

        cancelled_qs = (
            Enrolment.objects
            .filter(class_session=session, status='cancelled')
            .select_related('student')
            .order_by('-cancelled_date')
        )
        cancelled_data = []
        for e in cancelled_qs:
            cancelled_data.append({
                'id': e.id,
                'student_id': e.student_id,
                'student_name': e.student.display_name,
                'student_level': e.student.level,
                'student_phone': e.student.phone,
                'cancelled_date': e.cancelled_date,
                'notes': e.notes,
                'enrolment_type': e.enrolment_type,
            })

        return Response({
            'session': {
                'id': session.id,
                'name': session.name,
                'level': session.level,
                'day_of_week': session.get_day_of_week_display(),
                'start_time': str(session.start_time)[:5] if session.start_time else None,
                'instructor': session.instructor.display_name if session.instructor else None,
                'studio': session.studio.name if session.studio else None,
                'season': season.name if season else None,
                'season_id': season.id if season else None,
                'capacity': session.capacity,
                'enrolled_count': session.enrolled_count,
            },
            'enrolled': enrolled_data,
            'waitlist': waitlist_data,
            'transfers': transfers_data,
            'cancelled': cancelled_data,
        })
