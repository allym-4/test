from datetime import date
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Studio, ClassCategory, ClassSession, ClassOccurrence, Season, Locker, KisiGrant, ClassChatMessage, Workshop, WorkshopBooking
from .serializers import StudioSerializer, ClassCategorySerializer, ClassSessionSerializer, ClassOccurrenceSerializer, SeasonSerializer, LockerSerializer, KisiGrantSerializer, WorkshopSerializer, WorkshopBookingSerializer
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


class ClassOccurrenceListView(generics.ListCreateAPIView):
    serializer_class = ClassOccurrenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ClassOccurrence.objects.select_related('session__instructor', 'session__studio')
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(session_id=session_id)
        if self.request.user.role == 'instructor':
            qs = qs.filter(session__instructor=self.request.user)
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
    queryset = Locker.objects.select_related('assigned_to')
    serializer_class = LockerSerializer
    permission_classes = [IsAdminOrInstructor]


class LockerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Locker.objects.select_related('assigned_to')
    serializer_class = LockerSerializer
    permission_classes = [IsAdminOrInstructor]


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
        return Response({'id': booking.id, 'status': booking.status, 'workshop': workshop.name}, status=201)
