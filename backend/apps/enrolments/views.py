import datetime
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Enrolment
from .serializers import EnrolmentSerializer
from apps.users.permissions import IsAdminOrInstructor


class EnrolmentListView(generics.ListCreateAPIView):
    serializer_class = EnrolmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Enrolment.objects.select_related('student', 'class_session__studio')
        # Students can only see their own enrolments
        if user.role == 'student':
            qs = qs.filter(student=user)
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
        user = self.request.user
        # Students can only enrol themselves
        if user.role == 'student':
            enrolment = serializer.save(student=user)
        else:
            enrolment = serializer.save()

        # Deduct a makeup credit for catchup enrolments
        if enrolment.enrolment_type in ('catchup', 'catch_up'):
            from apps.attendance.models import MakeupCredit
            from django.utils import timezone
            credit = MakeupCredit.objects.filter(
                student=enrolment.student, status='available'
            ).order_by('created_at').first()
            if credit:
                credit.status = 'used'
                credit.used_at = timezone.now()
                credit.save(update_fields=['status', 'used_at'])


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
