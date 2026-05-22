from datetime import date
from django.db import models
from django.db.models import Count
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Studio, ClassCategory, ClassSession, ClassOccurrence, Season, Locker, KisiGrant, ClassChatMessage, Workshop, WorkshopBooking, PracticeSlot, PracticeBooking, CasualBooking, ClassUpsell
from .serializers import StudioSerializer, ClassCategorySerializer, ClassSessionSerializer, ClassOccurrenceSerializer, SeasonSerializer, LockerSerializer, KisiGrantSerializer, WorkshopSerializer, WorkshopBookingSerializer, PracticeSlotSerializer, PracticeBookingSerializer, CasualBookingSerializer, ClassUpsellSerializer
from apps.users.permissions import IsAdminOrInstructor, IsAdminUser


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


class ClassSessionListView(generics.ListCreateAPIView):
    serializer_class = ClassSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ClassSession.objects.select_related('instructor', 'studio')
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
        return qs


class ClassSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ClassSession.objects.select_related('instructor', 'studio')
    serializer_class = ClassSessionSerializer
    permission_classes = [IsAdminOrInstructor]


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
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminOrInstructor()]


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
    """Given a list of session IDs, return active upsells for any of them."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ids_param = request.query_params.get('session_ids', '')
        session_ids = [int(i) for i in ids_param.split(',') if i.strip().isdigit()]
        if not session_ids:
            return Response([])
        upsells = ClassUpsell.objects.filter(
            source_session_id__in=session_ids, is_active=True
        ).select_related('source_session', 'suggested_session', 'suggested_session__category')
        seen = set()
        results = []
        for u in upsells:
            if u.suggested_session_id not in seen:
                seen.add(u.suggested_session_id)
                results.append(ClassUpsellSerializer(u).data)
        return Response(results)


class PracticeSlotDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PracticeSlot.objects.all()
    serializer_class = PracticeSlotSerializer
    permission_classes = [IsAdminOrInstructor]


class PracticeSlotBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _calc_price(self, slot, user):
        from apps.enrolments.models import Enrolment
        from apps.classes.models import Season, PracticeBooking
        from django.utils import timezone
        import datetime
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
        return Response(PracticeBookingSerializer(booking, context={'request': request}).data, status=status.HTTP_201_CREATED)


class PracticeSlotCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = PracticeBooking.objects.get(slot_id=pk, student=request.user, status='confirmed')
        except PracticeBooking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)
        booking.status = 'cancelled'
        booking.save(update_fields=['status'])
        return Response({'status': 'cancelled'})


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

        enrolment_type = request.data.get('enrolment_type', 'casual')
        if enrolment_type not in ('casual', 'catchup', 'classpass'):
            return Response({'detail': 'Invalid enrolment_type.'}, status=status.HTTP_400_BAD_REQUEST)

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
            price = 0
        else:
            from apps.users.models import StudioSettings
            _s = StudioSettings.objects.first()
            price = float(_s.price_casual) if _s else 0

        booking = CasualBooking.objects.create(
            occurrence=occurrence,
            student=request.user,
            enrolment_type=enrolment_type,
            status='confirmed',
            price_charged=price,
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

        was_catchup = booking.enrolment_type == 'catchup' and booking.status == 'confirmed'
        booking.status = 'cancelled'
        booking.save(update_fields=['status'])

        # Restore makeup credit if cancelling a confirmed catch-up before the class
        if was_catchup and booking.occurrence.date >= date.today():
            from apps.attendance.models import MakeupCredit
            from django.utils import timezone
            MakeupCredit.objects.create(
                student=request.user,
                status='available',
                notes='Restored: casual catch-up booking cancelled',
            )

        return Response({'status': 'cancelled'})


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
                action_url='/portal/my-classes',
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
                action_url='/portal/my-classes',
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

        from .serializers import SeasonSerializer
        return Response({
            'season': SeasonSerializer(season).data,
            'enrolments_completed': completed_count,
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
