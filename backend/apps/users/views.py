import csv
import io
import re
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import User, StaffNote, Lead, StudioSettings, Announcement, Product, AutomationRule, Order, Notification, InstructorAvailability, StudentForm, InstructorPayRecord
from .serializers import (
    UserSerializer, UserCreateSerializer, StaffNoteSerializer, LeadSerializer,
    StudioSettingsSerializer, AnnouncementSerializer, ProductSerializer, AutomationRuleSerializer,
    OrderSerializer, NotificationSerializer, InstructorAvailabilitySerializer, StudentFormSerializer,
    InstructorPayRecordSerializer,
)
from .permissions import IsAdminOrInstructor, IsAdminUser


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by('last_name', 'first_name')
    permission_classes = [IsAdminOrInstructor]

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == 'POST' else UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return qs


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrInstructor]


class StaffNoteListView(generics.ListCreateAPIView):
    serializer_class = StaffNoteSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        return StaffNote.objects.filter(student_id=self.kwargs['user_pk'])

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, student_id=self.kwargs['user_pk'])


def _slugify_username(first, last, existing):
    base = re.sub(r'[^a-z0-9]', '', f"{first}{last}".lower()) or 'student'
    username = base
    i = 1
    while username in existing or User.objects.filter(username=username).exists():
        username = f"{base}{i}"
        i += 1
    existing.add(username)
    return username


class BulkImportView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(content))
            rows = list(reader)
        except Exception as e:
            return Response({'error': f'Could not parse CSV: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        skipped = []
        errors = []
        used_usernames = set()

        with transaction.atomic():
            for i, row in enumerate(rows):
                row = {k.strip().lower().replace(' ', '_'): (v or '').strip() for k, v in row.items()}
                email = row.get('email', '').lower()
                first = row.get('first_name', '') or row.get('first', '')
                last = row.get('last_name', '') or row.get('last', '')

                if not first or not last:
                    errors.append({'row': i + 2, 'reason': 'Missing first or last name'})
                    continue

                if email and User.objects.filter(email=email).exists():
                    skipped.append({'row': i + 2, 'name': f'{first} {last}', 'reason': 'Email already exists'})
                    continue

                username = _slugify_username(first, last, used_usernames)
                password = row.get('password') or 'Welcome1!'

                try:
                    user = User(
                        username=username,
                        email=email,
                        first_name=first,
                        last_name=last,
                        role='student',
                        phone=row.get('phone', ''),
                        pronouns=row.get('pronouns', ''),
                        emergency_contact_name=row.get('emergency_contact_name', '') or row.get('emergency_contact', ''),
                        emergency_contact_phone=row.get('emergency_contact_phone', '') or row.get('emergency_phone', ''),
                        internal_notes=row.get('notes', '') or row.get('internal_notes', ''),
                    )
                    if row.get('date_of_birth') or row.get('dob'):
                        from datetime import datetime
                        dob_str = row.get('date_of_birth') or row.get('dob')
                        for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%m/%d/%Y', '%d-%m-%Y'):
                            try:
                                user.date_of_birth = datetime.strptime(dob_str, fmt).date()
                                break
                            except ValueError:
                                continue
                    user.set_password(password)
                    user.save()
                    created.append({'id': user.id, 'name': user.display_name, 'username': username, 'password': password})
                except Exception as e:
                    errors.append({'row': i + 2, 'name': f'{first} {last}', 'reason': str(e)})

        return Response({
            'created': len(created),
            'skipped': len(skipped),
            'errors': len(errors),
            'students': created,
            'skipped_detail': skipped,
            'error_detail': errors,
        }, status=status.HTTP_200_OK)


class LeadListView(generics.ListCreateAPIView):
    serializer_class = LeadSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = Lead.objects.select_related('assigned_to')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search))
        return qs


class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Lead.objects.select_related('assigned_to')
    serializer_class = LeadSerializer
    permission_classes = [IsAdminOrInstructor]


class StudioSettingsView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminUser()]

    def get(self, request):
        settings = StudioSettings.get()
        return Response(StudioSettingsSerializer(settings).data)

    def patch(self, request):
        settings = StudioSettings.get()
        serializer = StudioSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AnnouncementListView(generics.ListCreateAPIView):
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Announcement.objects.select_related('created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Announcement.objects.select_related('created_by')
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAdminOrInstructor]


class ProductListView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrInstructor]


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrInstructor]


class AutomationRuleView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        rules = AutomationRule.objects.all()
        return Response(AutomationRuleSerializer(rules, many=True).data)

    def patch(self, request):
        slug = request.data.get('slug')
        enabled = request.data.get('enabled')
        if slug is None or enabled is None:
            return Response({'detail': 'slug and enabled required'}, status=400)
        rule, _ = AutomationRule.objects.get_or_create(slug=slug)
        rule.enabled = enabled
        rule.save()
        return Response(AutomationRuleSerializer(rule).data)



class OrderListView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = Order.objects.select_related('student')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.select_related('student')
    serializer_class = OrderSerializer
    permission_classes = [IsAdminOrInstructor]


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids')
        qs = Notification.objects.filter(recipient=request.user)
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(read=True)
        return Response({'ok': True})


class InstructorAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        instructor_id = request.query_params.get('instructor', request.user.id)
        slots = InstructorAvailability.objects.filter(instructor_id=instructor_id)
        return Response(InstructorAvailabilitySerializer(slots, many=True).data)

    def post(self, request):
        """Bulk-save availability slots for the requesting instructor."""
        slots_data = request.data if isinstance(request.data, list) else [request.data]
        saved = []
        for item in slots_data:
            obj, _ = InstructorAvailability.objects.update_or_create(
                instructor=request.user,
                day_of_week=item['day_of_week'],
                slot=item['slot'],
                defaults={'available': item.get('available', True)},
            )
            saved.append(obj)
        return Response(InstructorAvailabilitySerializer(saved, many=True).data)


class StudentFormView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        forms = StudentForm.objects.filter(student=request.user)
        return Response(StudentFormSerializer(forms, many=True).data)

    def post(self, request):
        from django.utils import timezone as tz
        form_type = request.data.get('form_type')
        responses = request.data.get('responses', {})
        obj, _ = StudentForm.objects.update_or_create(
            student=request.user,
            form_type=form_type,
            defaults={
                'responses': responses,
                'completed': True,
                'completed_at': tz.now(),
            }
        )
        return Response(StudentFormSerializer(obj).data)


class InstructorPayRecordListView(generics.ListCreateAPIView):
    serializer_class = InstructorPayRecordSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = InstructorPayRecord.objects.select_related('instructor')
        if self.request.user.role == 'instructor':
            qs = qs.filter(instructor=self.request.user)
        else:
            instructor_id = self.request.query_params.get('instructor')
            if instructor_id:
                qs = qs.filter(instructor_id=instructor_id)
        return qs


class InstructorPayRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = InstructorPayRecord.objects.select_related('instructor')
    serializer_class = InstructorPayRecordSerializer
    permission_classes = [IsAdminUser]
