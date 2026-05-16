from datetime import date
from django.db.models import Count
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Studio, ClassCategory, ClassSession, ClassOccurrence, Season, Locker, KisiGrant, ClassChatMessage, Workshop, WorkshopBooking, PracticeSlot, PracticeBooking
from .serializers import StudioSerializer, ClassCategorySerializer, ClassSessionSerializer, ClassOccurrenceSerializer, SeasonSerializer, LockerSerializer, KisiGrantSerializer, WorkshopSerializer, WorkshopBookingSerializer, PracticeSlotSerializer, PracticeBookingSerializer
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
        if self.request.user.role == 'instructor':
            qs = qs.filter(instructor=self.request.user)
        active_only = self.request.query_params.get('active')
        if active_only == 'true':
            qs = qs.filter(is_active=True)
        season_id = self.request.query_params.get('season')
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
        qs = ClassOccurrence.objects.select_related('session__instructor', 'session__studio')
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(session_id=session_id)
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
        return qs


class ClassOccurrenceDetailView(generics.RetrieveUpdateAPIView):
    queryset = ClassOccurrence.objects.select_related('session__instructor', 'session__studio')
    serializer_class = ClassOccurrenceSerializer
    permission_classes = [IsAdminOrInstructor]


class SeasonListView(generics.ListCreateAPIView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = [IsAdminOrInstructor]


class SeasonDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = [IsAdminOrInstructor]


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
            send_mail(subject=subject, message=body, from_email=settings.DEFAULT_FROM_EMAIL,
                      recipient_list=[student.email], fail_silently=True)

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


class PracticeSlotDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PracticeSlot.objects.all()
    serializer_class = PracticeSlotSerializer
    permission_classes = [IsAdminOrInstructor]


class PracticeSlotBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _calc_price(self, slot, user):
        from apps.enrolments.models import Enrolment
        from apps.classes.models import Season
        # Free if enrolled in 3+ course classes in the current/active season
        active_season = Season.objects.filter(status__in=['active', 'upcoming']).order_by('-start_date').first()
        course_enrolments = Enrolment.objects.filter(
            student=user,
            status='active',
            enrolment_type='course',
            class_session__season=active_season,
        ).count() if active_season else 0
        if course_enrolments >= 3:
            return 0, True
        is_enrolled = course_enrolments > 0
        rate = slot.ENROLLED_RATE if is_enrolled else slot.NON_ENROLLED_RATE
        return round(slot.duration_hours * rate, 2), False

    def post(self, request, pk):
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
        booking = PracticeBooking.objects.create(
            slot=slot,
            student=request.user,
            price_charged=price,
            is_free=is_free,
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
