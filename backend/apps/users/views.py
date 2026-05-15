import csv
import io
import os
import re
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
from .models import User, StaffNote, Lead, StudioSettings, Announcement, Product, AutomationRule, AutomationRun, Order, Notification, InstructorAvailability, StudentForm, InstructorPayRecord, StudentSkill, Tag, StudentTag, SkillLevel, SkillGroup, SkillDefinition, MediaItem, EmailCampaign, EmailList, Referral
from .serializers import (
    UserSerializer, UserCreateSerializer, StaffNoteSerializer, LeadSerializer,
    StudioSettingsSerializer, AnnouncementSerializer, ProductSerializer, AutomationRuleSerializer,
    OrderSerializer, NotificationSerializer, InstructorAvailabilitySerializer, StudentFormSerializer,
    InstructorPayRecordSerializer, StudentSkillSerializer,
    TagSerializer, StudentTagSerializer, SkillLevelSerializer, SkillGroupSerializer, SkillDefinitionSerializer,
    MediaItemSerializer, EmailCampaignSerializer, EmailListSerializer, ReferralSerializer,
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
        qs = Announcement.objects.select_related('created_by')
        note_type = self.request.query_params.get('note_type')
        if note_type:
            qs = qs.filter(note_type=note_type)
        return qs

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

    def post(self, request):
        data = request.data.copy()
        data['is_custom'] = True
        # Auto-generate a unique slug for custom rules if not provided
        if not data.get('slug'):
            import uuid
            data['slug'] = f"custom_{uuid.uuid4().hex[:8]}"
        serializer = AutomationRuleSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    def patch(self, request):
        slug = request.data.get('slug')
        enabled = request.data.get('enabled')
        if slug is None or enabled is None:
            return Response({'detail': 'slug and enabled required'}, status=400)
        rule, _ = AutomationRule.objects.get_or_create(slug=slug)
        rule.enabled = enabled
        rule.save()
        return Response(AutomationRuleSerializer(rule).data)


class AutomationRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AutomationRule.objects.all()
    serializer_class = AutomationRuleSerializer
    permission_classes = [IsAdminOrInstructor]


class AutomationStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        cutoff = timezone.now() - timedelta(days=30)
        runs_this_month = AutomationRun.objects.filter(created_at__gte=cutoff).count()
        total_runs = AutomationRun.objects.count()

        by_slug_qs = (
            AutomationRun.objects
            .values('slug')
            .annotate(count=Count('id'))
        )
        by_slug = {item['slug']: item['count'] for item in by_slug_qs}

        return Response({
            'runs_this_month': runs_this_month,
            'emails_sent': 0,
            'total_runs': total_runs,
            'by_slug': by_slug,
        })


class AutomationRunListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        runs = (
            AutomationRun.objects
            .select_related('student', 'rule')
            .order_by('-created_at')[:10]
        )
        data = [
            {
                'id': r.id,
                'slug': r.slug,
                'student_name': r.student.display_name if r.student else None,
                'student_id': r.student_id,
                'status': r.status,
                'actions_taken': r.actions_taken,
                'created_at': r.created_at,
            }
            for r in runs
        ]
        return Response(data)


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
        if request.user.role in ('admin', 'instructor'):
            student_id = request.query_params.get('student')
            if student_id:
                forms_qs = StudentForm.objects.filter(student_id=student_id)
            else:
                forms_qs = StudentForm.objects.all()
        else:
            forms_qs = StudentForm.objects.filter(student=request.user)
        return Response(StudentFormSerializer(forms_qs, many=True).data)

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


class StudentSkillView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_pk):
        if request.user.role in ('admin', 'instructor') or request.user.id == int(user_pk):
            skills = StudentSkill.objects.filter(student_id=user_pk)
            return Response(StudentSkillSerializer(skills, many=True).data)
        return Response({'detail': 'Not authorized'}, status=403)

    def post(self, request, user_pk):
        if request.user.role not in ('admin', 'instructor') and request.user.id != int(user_pk):
            return Response({'detail': 'Not authorized'}, status=403)
        skill_name = request.data.get('skill_name')
        level = request.data.get('level', '')
        if not skill_name:
            return Response({'detail': 'skill_name required'}, status=400)
        defaults = {'level': level}
        if 'self_assessed' in request.data:
            defaults['self_assessed'] = request.data['self_assessed']
        if 'teacher_confirmed' in request.data and request.user.role in ('admin', 'instructor'):
            defaults['teacher_confirmed'] = request.data['teacher_confirmed']
        obj, _ = StudentSkill.objects.update_or_create(
            student_id=user_pk,
            skill_name=skill_name,
            defaults=defaults,
        )
        return Response(StudentSkillSerializer(obj).data)


class SquareSyncView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        from django.conf import settings as django_settings
        if not django_settings.SQUARE_ACCESS_TOKEN:
            return Response({'detail': 'Square not configured'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .square_service import sync_catalog_to_products
            created, updated, skipped = sync_catalog_to_products()
            return Response({'created': created, 'updated': updated, 'skipped': skipped})
        except Exception as e:
            return Response({'detail': f'Square sync failed: {e}'}, status=status.HTTP_502_BAD_GATEWAY)


class TagListView(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAdminOrInstructor]


class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAdminOrInstructor]


class StudentTagView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def get(self, request, user_pk):
        student_tags = StudentTag.objects.filter(student_id=user_pk).select_related('tag')
        return Response(StudentTagSerializer(student_tags, many=True).data)

    def post(self, request, user_pk):
        tag_id = request.data.get('tag_id')
        if not tag_id:
            return Response({'detail': 'tag_id required'}, status=status.HTTP_400_BAD_REQUEST)
        student_tag, created = StudentTag.objects.get_or_create(student_id=user_pk, tag_id=tag_id)
        return Response(StudentTagSerializer(student_tag).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, user_pk):
        tag_id = request.data.get('tag_id')
        if not tag_id:
            return Response({'detail': 'tag_id required'}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = StudentTag.objects.filter(student_id=user_pk, tag_id=tag_id).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({'detail': 'Tag not found on student'}, status=status.HTTP_404_NOT_FOUND)


class SkillLevelListView(generics.ListCreateAPIView):
    queryset = SkillLevel.objects.all()
    serializer_class = SkillLevelSerializer
    permission_classes = [IsAdminOrInstructor]


class SkillLevelDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SkillLevel.objects.all()
    serializer_class = SkillLevelSerializer
    permission_classes = [IsAdminOrInstructor]


class SkillGroupListView(generics.ListCreateAPIView):
    serializer_class = SkillGroupSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = SkillGroup.objects.select_related('level')
        level = self.request.query_params.get('level')
        if level:
            qs = qs.filter(level_id=level)
        return qs


class SkillGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SkillGroup.objects.select_related('level')
    serializer_class = SkillGroupSerializer
    permission_classes = [IsAdminOrInstructor]


class SkillDefinitionListView(generics.ListCreateAPIView):
    serializer_class = SkillDefinitionSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = SkillDefinition.objects.select_related('group')
        group = self.request.query_params.get('group')
        if group:
            qs = qs.filter(group_id=group)
        return qs


class SkillDefinitionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SkillDefinition.objects.select_related('group')
    serializer_class = SkillDefinitionSerializer
    permission_classes = [IsAdminOrInstructor]


class MediaItemListView(generics.ListCreateAPIView):
    serializer_class = MediaItemSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = MediaItem.objects.select_related('uploaded_by')
        type_filter = self.request.query_params.get('type')
        if type_filter:
            qs = qs.filter(media_type=type_filter)
        level_filter = self.request.query_params.get('level')
        if level_filter:
            qs = qs.filter(level=level_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class MediaItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MediaItem.objects.select_related('uploaded_by')
    serializer_class = MediaItemSerializer
    permission_classes = [IsAdminOrInstructor]


class EmailCampaignListView(generics.ListCreateAPIView):
    queryset = EmailCampaign.objects.all()
    serializer_class = EmailCampaignSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EmailCampaignDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EmailCampaign.objects.all()
    serializer_class = EmailCampaignSerializer
    permission_classes = [IsAdminOrInstructor]


class EmailListListView(generics.ListCreateAPIView):
    queryset = EmailList.objects.all()
    serializer_class = EmailListSerializer
    permission_classes = [IsAdminOrInstructor]


class EmailListDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EmailList.objects.all()
    serializer_class = EmailListSerializer
    permission_classes = [IsAdminOrInstructor]


class ReferralListView(generics.ListCreateAPIView):
    serializer_class = ReferralSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Referral.objects.all()
        if not self.request.user.role in ('admin', 'instructor', 'staff'):
            qs = qs.filter(referrer=self.request.user)
        referrer_id = self.request.query_params.get('referrer')
        if referrer_id:
            qs = qs.filter(referrer_id=referrer_id)
        return qs


class AssistantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '').strip()
        if not message:
            return Response({'error': 'No message provided'}, status=400)

        api_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not ANTHROPIC_AVAILABLE or not api_key:
            return Response({'response': "I'm not fully set up yet — please contact the studio directly for help."})

        # Build student context
        from apps.enrolments.models import Enrolment

        student = request.user
        student_name = student.display_name or student.email

        active_enrolments = Enrolment.objects.filter(
            student=student,
            status='active',
        ).select_related('class_session')
        class_list = ', '.join(
            str(e.class_session) for e in active_enrolments
        ) or 'No active enrolments'

        # Pull studio settings
        studio = StudioSettings.get()
        studio_name = studio.studio_name
        cancellation_window_hours = studio.cancellation_window_hours
        late_cancel_fee = studio.late_cancel_fee
        no_show_fee = studio.no_show_fee
        credit_expiry_days = studio.credit_expiry_days

        system_prompt = (
            f"You are the helpful AI assistant for {studio_name}, a pole and aerial dance studio.\n"
            f"You help students with questions about classes, bookings, memberships, and studio policies.\n\n"
            f"Studio policies:\n"
            f"- Cancellation window: {cancellation_window_hours} hours before class\n"
            f"- Late cancellation fee: ${late_cancel_fee}\n"
            f"- No-show fee: ${no_show_fee}\n"
            f"- Credit expiry: {credit_expiry_days} days\n\n"
            f"Student context:\n"
            f"- Name: {student_name}\n"
            f"- Active classes: {class_list}\n\n"
            f"Be warm, helpful, and concise. If you don't know something specific, direct them to contact the studio directly.\n"
            f"Keep responses under 3 sentences unless a longer answer is clearly needed."
        )

        try:
            ai_client = anthropic.Anthropic(api_key=api_key)
            ai_response = ai_client.messages.create(
                model='claude-haiku-4-5-20251001',
                max_tokens=500,
                system=system_prompt,
                messages=[{'role': 'user', 'content': message}],
            )
            reply_text = ai_response.content[0].text
        except Exception:
            reply_text = "I'm having trouble connecting right now — please contact the studio directly for help."

        return Response({'response': reply_text})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get('current_password', '')
        new_pw = request.data.get('new_password', '')
        if not current or not new_pw:
            return Response({'detail': 'current_password and new_password are required.'}, status=400)
        if len(new_pw) < 8:
            return Response({'detail': 'New password must be at least 8 characters.'}, status=400)
        if not request.user.check_password(current):
            return Response({'detail': 'Current password is incorrect.'}, status=400)
        request.user.set_password(new_pw)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password changed successfully.'})


class EmailListExportView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def get(self, request, pk):
        import csv
        from django.http import HttpResponse
        try:
            email_list = EmailList.objects.get(pk=pk)
        except EmailList.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)

        students = User.objects.filter(role='student', is_active=True).order_by('last_name', 'first_name')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{email_list.name.replace(" ", "_")}_export.csv"'
        writer = csv.writer(response)
        writer.writerow(['First Name', 'Last Name', 'Email', 'Phone'])
        for s in students:
            writer.writerow([s.first_name, s.last_name, s.email, getattr(s, 'phone', '') or ''])
        return response
