import csv
import io
import os
import re
import random
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.db import models
from django.db.models import Q, Count, Sum, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
from .models import User, StaffNote, Lead, StudioSettings, Announcement, Product, AutomationRule, AutomationRun, Order, Notification, InstructorAvailability, InstructorUnavailableDate, StudentForm, InstructorPayRecord, StudentSkill, Tag, StudentTag, SkillLevel, SkillGroup, SkillDefinition, MediaItem, EmailCampaign, EmailList, Referral, ActionItem, Challenge, ChallengeProgress
from .serializers import (
    UserSerializer, UserCreateSerializer, StaffNoteSerializer, LeadSerializer,
    StudioSettingsSerializer, AnnouncementSerializer, ProductSerializer, AutomationRuleSerializer,
    OrderSerializer, NotificationSerializer, InstructorAvailabilitySerializer, InstructorUnavailableDateSerializer, StudentFormSerializer,
    InstructorPayRecordSerializer, StudentSkillSerializer,
    TagSerializer, StudentTagSerializer, SkillLevelSerializer, SkillGroupSerializer, SkillDefinitionSerializer,
    MediaItemSerializer, EmailCampaignSerializer, EmailListSerializer, ReferralSerializer, ActionItemSerializer,
    ChallengeSerializer, ChallengeProgressSerializer,
    StudioSettingsPublicSerializer,
)
from .permissions import IsAdminOrInstructor, IsAdminUser


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PublicInstructorListView(generics.ListAPIView):
    """Student-accessible list of active instructors for the Team page."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        instructors = User.objects.filter(role='instructor', is_active=True).order_by('last_name', 'first_name')
        data = []
        for u in instructors:
            try:
                photo_url = u.profile_photo.url if u.profile_photo else None
            except Exception:
                photo_url = None
            data.append({
                'id': u.id,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'display_name': u.display_name or f'{u.first_name} {u.last_name}'.strip(),
                'bio': u.bio or '',
                'tagline': u.instructor_tagline or '',
                'pronouns': u.pronouns or '',
                'instagram': u.instructor_instagram or '',
                'profile_photo_url': photo_url,
            })
        return Response(data)


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
        qs = StaffNote.objects.filter(student_id=self.kwargs['user_pk'])
        archived = self.request.query_params.get('archived')
        if archived == 'true':
            qs = qs.filter(archived=True)
        elif archived == 'false':
            qs = qs.filter(archived=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, student_id=self.kwargs['user_pk'])


class StaffNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StaffNoteSerializer
    permission_classes = [IsAdminOrInstructor]
    queryset = StaffNote.objects.all()


class RecheckNotesTodayView(APIView):
    """Notes where recheck_date = today, for the dashboard action items panel."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        from django.utils import timezone
        today = timezone.localdate()
        notes = StaffNote.objects.filter(
            recheck_date=today, archived=False
        ).select_related('student', 'created_by')
        data = []
        for note in notes:
            data.append({
                'id': note.id,
                'student_id': note.student_id,
                'student_name': note.student.display_name if note.student else '',
                'tag': note.tag,
                'body': note.body,
                'recheck_date': str(note.recheck_date),
                'is_permanent': note.is_permanent,
            })
        return Response(data)


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
                    created.append({'id': user.id, 'name': user.display_name, 'username': username})
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
        is_staff = request.user.role in ('admin', 'instructor', 'staff')
        serializer_class = StudioSettingsSerializer if is_staff else StudioSettingsPublicSerializer
        return Response(serializer_class(settings).data)

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
        if self.request.user.role not in ('admin', 'instructor', 'staff'):
            raise permissions.PermissionDenied
        serializer.save(created_by=self.request.user)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Announcement.objects.select_related('created_by')
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAdminOrInstructor]


class AnnouncementAcknowledgeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        ann.acknowledged_by.add(request.user)
        return Response({'status': 'acknowledged'})


class ProductListView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)
        if self.request.user.role in ('admin', 'instructor', 'staff'):
            qs = Product.objects.all()
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'instructor', 'staff'):
            raise permissions.PermissionDenied
        serializer.save()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        if request.user.role not in ('admin', 'instructor', 'staff'):
            raise permissions.PermissionDenied
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in ('admin', 'instructor', 'staff'):
            raise permissions.PermissionDenied
        return super().destroy(request, *args, **kwargs)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def update(self, request, *args, **kwargs):
        # Support multipart for image uploads
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


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
        if slug is None:
            return Response({'detail': 'slug required'}, status=400)
        rule, _ = AutomationRule.objects.get_or_create(slug=slug)
        if enabled is not None:
            rule.enabled = enabled
        if 'actions' in request.data:
            rule.actions = request.data['actions']
        if 'name' in request.data:
            rule.name = request.data['name']
        rule.save()
        return Response(AutomationRuleSerializer(rule).data)


class AutomationRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AutomationRule.objects.all()
    serializer_class = AutomationRuleSerializer
    permission_classes = [IsAdminUser]


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

        emails_sent = AutomationRun.objects.filter(
            actions_taken__contains='email'
        ).count()

        return Response({
            'runs_this_month': runs_this_month,
            'emails_sent': emails_sent,
            'total_runs': total_runs,
            'by_slug': by_slug,
        })


class AutomationRunListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 50)), 200)
        runs = (
            AutomationRun.objects
            .select_related('student', 'rule')
            .order_by('-created_at')[:limit]
        )
        data = [
            {
                'id': r.id,
                'slug': r.slug,
                'rule_name': r.rule.name if r.rule else r.slug,
                'student_name': r.student.display_name if r.student else None,
                'student_id': r.student_id,
                'status': r.status,
                'actions_taken': r.actions_taken,
                'trigger_data': r.trigger_data,
                'created_at': r.created_at,
            }
            for r in runs
        ]
        return Response(data)


class OrderListView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.select_related('student')
        if user.role == 'student':
            return qs.filter(student=user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'student':
            serializer.save(student=user, student_name=user.display_name)
        else:
            serializer.save()


class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.select_related('student')
        if user.role == 'student':
            return qs.filter(student=user)
        return qs

    def update(self, request, *args, **kwargs):
        if request.user.role not in ('admin', 'instructor', 'staff'):
            raise permissions.PermissionDenied
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class NotificationListView(generics.ListCreateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ('admin', 'instructor', 'staff'):
            recipient_id = self.request.query_params.get('recipient')
            if recipient_id:
                return Notification.objects.filter(recipient_id=recipient_id).order_by('-created_at')
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        if request.user.role not in ('admin', 'instructor', 'staff'):
            from rest_framework.response import Response
            return Response({'detail': 'Forbidden.'}, status=403)
        recipient_id = request.data.get('user') or request.data.get('recipient')
        if not recipient_id:
            from rest_framework.response import Response
            return Response({'detail': 'recipient required.'}, status=400)
        notification = Notification.objects.create(
            recipient_id=recipient_id,
            title=request.data.get('title', ''),
            body=request.data.get('body', ''),
            notification_type=request.data.get('notification_type', 'info'),
            action_label=request.data.get('action_label', ''),
            action_url=request.data.get('action_url', ''),
        )
        send_push_notification(notification.recipient_id, notification.title, notification.body)
        from rest_framework.response import Response
        return Response(NotificationSerializer(notification).data, status=201)


class BulkNotificationView(APIView):
    """Send an in-app notification (+ optional email) to a group of students."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request):
        from rest_framework.response import Response
        from django.core.mail import send_mail
        from django.conf import settings as django_settings
        from apps.enrolments.models import Enrolment
        from apps.payments.models import Payment

        title = request.data.get('title', '').strip()
        body = request.data.get('body', '').strip()
        target = request.data.get('target')  # 'all', 'session:<id>', 'overdue', 'user_ids'
        user_ids = request.data.get('user_ids', [])
        send_email = request.data.get('send_email', False)

        if not title or not body:
            return Response({'detail': 'title and body required.'}, status=400)

        recipients = []

        if target == 'all':
            recipients = list(User.objects.filter(role='student', is_active=True))
        elif target and target.startswith('session:'):
            session_id = target.split(':', 1)[1]
            enrolled_ids = Enrolment.objects.filter(
                class_session_id=session_id, status='active'
            ).values_list('student_id', flat=True)
            recipients = list(User.objects.filter(id__in=enrolled_ids))
        elif target == 'overdue':
            from decimal import Decimal
            paid_subq = Payment.objects.filter(
                student=OuterRef('pk'),
                payment_type__in=['payment', 'credit'],
            ).values('student').annotate(s=Sum('amount')).values('s')
            charged_subq = Payment.objects.filter(
                student=OuterRef('pk'),
                payment_type__in=['charge', 'no_show_fee'],
            ).values('student').annotate(s=Sum('amount')).values('s')
            overdue_ids = (
                User.objects.filter(role='student', is_active=True)
                .annotate(
                    total_paid=Coalesce(Subquery(paid_subq), Decimal('0')),
                    total_charged=Coalesce(Subquery(charged_subq), Decimal('0')),
                )
                .filter(total_charged__gt=models.F('total_paid'))
                .values_list('id', flat=True)
            )
            recipients = list(User.objects.filter(id__in=overdue_ids))
        elif target == 'user_ids' and user_ids:
            recipients = list(User.objects.filter(id__in=user_ids))
        elif target == 'tags':
            tag_ids = request.data.get('tag_ids', [])
            if tag_ids:
                student_ids = StudentTag.objects.filter(
                    tag_id__in=tag_ids
                ).values_list('student_id', flat=True).distinct()
                recipients = list(User.objects.filter(id__in=student_ids, is_active=True))

        if not recipients:
            return Response({'detail': 'No matching recipients.', 'count': 0})

        action_label = request.data.get('action_label', '')
        action_url = request.data.get('action_url', '')
        notifications = [
            Notification(
                recipient=u,
                title=title,
                body=body,
                notification_type=request.data.get('notification_type', 'info'),
                action_label=action_label,
                action_url=action_url,
            )
            for u in recipients
        ]
        Notification.objects.bulk_create(notifications)
        for u in recipients:
            send_push_notification(u.id, title, body)

        if send_email:
            emails = [u.email for u in recipients if u.email]
            for email in emails:
                send_mail(
                    subject=title,
                    message=body,
                    from_email=django_settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=True,
                )

        return Response({'count': len(recipients), 'email_sent': send_email})


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids')
        qs = Notification.objects.filter(recipient=request.user)
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(read=True)
        return Response({'ok': True})


def send_push_notification(user_id, title, body, data=None):
    """Send Expo push notification to all registered devices for a user."""
    import urllib.request, json as _json
    from .models import DevicePushToken
    tokens = DevicePushToken.objects.filter(user_id=user_id).values_list('token', flat=True)
    if not tokens:
        return
    messages = [
        {'to': t, 'title': title, 'body': body, 'data': data or {}, 'sound': 'default'}
        for t in tokens
    ]
    try:
        req = urllib.request.Request(
            'https://exp.host/--/api/v2/push/send',
            data=_json.dumps(messages).encode(),
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
            method='POST',
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass  # never let push failures break the main request


from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.permissions import IsAuthenticated


@api_view(['POST', 'DELETE'])
@perm_classes([IsAuthenticated])
def push_token(request):
    import re
    from .models import DevicePushToken
    token = request.data.get('token', '').strip()
    platform = request.data.get('platform', 'ios')
    if not token:
        return Response({'detail': 'token required'}, status=400)
    # Accept Expo push tokens (ExponentPushToken[...]) and raw FCM/APNs tokens (hex strings)
    if not re.match(r'^ExponentPushToken\[.{10,}\]$|^[a-fA-F0-9:_\-]{20,250}$', token):
        return Response({'detail': 'invalid token format'}, status=400)
    if platform not in ('ios', 'android'):
        return Response({'detail': 'platform must be ios or android'}, status=400)
    if request.method == 'POST':
        DevicePushToken.objects.update_or_create(
            user=request.user, token=token,
            defaults={'platform': platform}
        )
        return Response({'status': 'registered'})
    else:
        DevicePushToken.objects.filter(user=request.user, token=token).delete()
        return Response({'status': 'unregistered'})
class EscalateNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        escalation_targets = User.objects.filter(
            role='admin', is_active=True, first_name__in=['Mimi', 'Chloe']
        )
        if not escalation_targets.exists():
            escalation_targets = User.objects.filter(role='admin', is_active=True)

        escalated_by = request.user.display_name
        for target in escalation_targets:
            Notification.objects.create(
                recipient=target,
                title=f"[Escalated] {notif.title}",
                body=f"{notif.body}\n\nEscalated by {escalated_by}.",
                notification_type=Notification.Type.WARNING,
            )
        notif.read = True
        notif.save(update_fields=['read'])
        return Response({'ok': True})


class InstructorAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        is_staff = request.user.role in ('admin', 'instructor', 'staff')
        instructor_id = request.query_params.get('instructor', request.user.id) if is_staff else request.user.id
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


class InstructorUnavailableDateView(generics.ListCreateAPIView):
    serializer_class = InstructorUnavailableDateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('admin', 'instructor', 'staff'):
            instructor_id = self.request.query_params.get('instructor', user.id)
            return InstructorUnavailableDate.objects.filter(instructor_id=instructor_id)
        return InstructorUnavailableDate.objects.filter(instructor=user)

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class InstructorUnavailableDateDetailView(generics.DestroyAPIView):
    serializer_class = InstructorUnavailableDateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InstructorUnavailableDate.objects.filter(instructor=self.request.user)


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
        obj, created = StudentForm.objects.update_or_create(
            student=request.user,
            form_type=form_type,
            defaults={
                'responses': responses,
                'completed': True,
                'completed_at': tz.now(),
            }
        )

        # Notify admins + run automations on first completion
        if created or not obj.completed:
            student = request.user
            form_label = dict(StudentForm.FormType.choices).get(form_type, form_type)
            admins = User.objects.filter(role='admin', is_active=True)
            Notification.objects.bulk_create([
                Notification(
                    recipient=admin,
                    title='Form submitted',
                    body=f'{student.display_name} completed the {form_label}.',
                    notification_type='form',
                )
                for admin in admins
            ], ignore_conflicts=True)

            from .automation_engine import run_custom_automations
            run_custom_automations('form_submitted', student, {'form_type': form_type, 'form_label': form_label})

        return Response(StudentFormSerializer(obj).data)


class StudentFormPendingRequiredView(APIView):
    """Returns form_type keys that are marked required in StudioSettings but not yet completed by the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        settings = StudioSettings.get()
        required_map = {
            'parq': settings.form_health_required,
            'waiver': settings.form_waiver_required,
            'photo_consent': settings.form_photo_consent_required,
            'season_agreement': settings.form_season_agreement_required,
        }
        required_types = [k for k, v in required_map.items() if v]
        if not required_types:
            return Response([])
        completed_types = set(
            StudentForm.objects.filter(
                student=request.user, form_type__in=required_types, completed=True,
            ).values_list('form_type', flat=True)
        )
        return Response([ft for ft in required_types if ft not in completed_types])


class InstructorPayRecordListView(generics.ListCreateAPIView):
    serializer_class = InstructorPayRecordSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [IsAdminOrInstructor()]

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
        previously_confirmed = False
        try:
            existing = StudentSkill.objects.get(student_id=user_pk, skill_name=skill_name)
            previously_confirmed = existing.teacher_confirmed
        except StudentSkill.DoesNotExist:
            pass

        obj, _ = StudentSkill.objects.update_or_create(
            student_id=user_pk,
            skill_name=skill_name,
            defaults=defaults,
        )

        if obj.teacher_confirmed and not previously_confirmed and request.user.role in ('admin', 'instructor'):
            Notification.objects.create(
                recipient_id=user_pk,
                title='Skill unlocked!',
                body=f'{skill_name} has been confirmed by your instructor.',
                notification_type='success',
            )

        return Response(StudentSkillSerializer(obj).data)


class CalculatePayView(APIView):
    """Return suggested pay amount for an instructor over a date range."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request, user_pk):
        from apps.classes.models import ClassOccurrence
        from datetime import date

        period_start = request.query_params.get('period_start')
        period_end = request.query_params.get('period_end')

        try:
            instructor = User.objects.get(pk=user_pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        qs = ClassOccurrence.objects.filter(class_session__instructor=instructor)
        if period_start:
            qs = qs.filter(date__gte=period_start)
        if period_end:
            qs = qs.filter(date__lte=period_end)

        occurrences = list(qs.prefetch_related('attendance'))
        class_count = len(occurrences)
        total_students = sum(o.attendance.filter(status='present').count() for o in occurrences)
        pay_rate = float(instructor.pay_rate or 0)
        suggested = round(pay_rate * class_count, 2)

        return Response({
            'class_count': class_count,
            'total_students': total_students,
            'pay_rate': pay_rate,
            'suggested_amount': suggested,
        })


class PendingSkillsView(APIView):
    """List all self-assessed-but-unconfirmed skills across all students."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        skills = (
            StudentSkill.objects
            .filter(self_assessed=True, teacher_confirmed=False)
            .select_related('student')
            .order_by('student__last_name', 'student__first_name', 'skill_name')
        )
        data = []
        seen = {}
        for s in skills:
            sid = s.student_id
            if sid not in seen:
                seen[sid] = {
                    'student_id': sid,
                    'student_name': s.student.get_full_name() or s.student.username,
                    'skills': [],
                }
                data.append(seen[sid])
            seen[sid]['skills'].append(StudentSkillSerializer(s).data)
        return Response(data)


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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = MediaItem.objects.select_related('uploaded_by')
        user = self.request.user
        if user.role == 'student':
            from apps.enrolments.models import Enrolment
            session_ids = Enrolment.objects.filter(
                student=user, status='active'
            ).values_list('class_session_id', flat=True)
            qs = qs.filter(session_id__in=session_ids)
        else:
            type_filter = self.request.query_params.get('type')
            if type_filter:
                qs = qs.filter(media_type=type_filter)
            level_filter = self.request.query_params.get('level')
            if level_filter:
                qs = qs.filter(level=level_filter)
        session_filter = self.request.query_params.get('session')
        if session_filter:
            qs = qs.filter(session_id=session_filter)
        return qs.order_by('session', 'available_from', 'name')

    def create(self, request, *args, **kwargs):
        if request.user.role not in ('admin', 'instructor', 'staff'):
            return Response({'detail': 'Forbidden.'}, status=403)
        return super().create(request, *args, **kwargs)

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


class EmailCampaignSendView(APIView):
    """Send a campaign email to all active students."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from django.core.mail import send_mail
        from django.conf import settings as django_settings
        from django.utils import timezone as tz

        try:
            campaign = EmailCampaign.objects.get(pk=pk)
        except EmailCampaign.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not campaign.subject:
            return Response({'detail': 'Subject is required before sending.'}, status=status.HTTP_400_BAD_REQUEST)
        if not campaign.body:
            return Response({'detail': 'Email body is required before sending.'}, status=status.HTTP_400_BAD_REQUEST)
        if campaign.status == 'sent':
            return Response({'detail': 'Campaign has already been sent.'}, status=status.HTTP_400_BAD_REQUEST)

        base_qs = User.objects.filter(role='student', is_active=True).exclude(email='')

        if campaign.list_name:
            email_list = EmailList.objects.filter(name__iexact=campaign.list_name).first()
            slug = (email_list.query_slug if email_list else '').lower()
            if slug == 'overdue':
                from decimal import Decimal
                from apps.payments.models import Payment
                paid_subq = Payment.objects.filter(
                    student=OuterRef('pk'), payment_type__in=['payment', 'credit'],
                ).values('student').annotate(s=Sum('amount')).values('s')
                charged_subq = Payment.objects.filter(
                    student=OuterRef('pk'), payment_type__in=['charge', 'no_show_fee'],
                ).values('student').annotate(s=Sum('amount')).values('s')
                overdue_ids = (
                    base_qs
                    .annotate(
                        total_paid=Coalesce(Subquery(paid_subq), Decimal('0')),
                        total_charged=Coalesce(Subquery(charged_subq), Decimal('0')),
                    )
                    .filter(total_charged__gt=models.F('total_paid'))
                    .values_list('id', flat=True)
                )
                base_qs = base_qs.filter(id__in=overdue_ids)
            elif slug == 'enrolled':
                from apps.enrolments.models import Enrolment
                enrolled_ids = Enrolment.objects.filter(status='active').values_list('student_id', flat=True)
                base_qs = base_qs.filter(id__in=enrolled_ids)
            # 'active' or unrecognised slug → keep base_qs (all active students)

        recipients = base_qs
        sent = 0
        for user in recipients:
            try:
                send_mail(
                    subject=campaign.subject,
                    message=campaign.body,
                    from_email=django_settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                sent += 1
            except Exception:
                pass

        campaign.status = 'sent'
        campaign.sent_at = tz.now()
        campaign.save(update_fields=['status', 'sent_at'])

        return Response({'status': 'sent', 'count': sent})


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
        is_staff = self.request.user.role in ('admin', 'instructor', 'staff')
        if not is_staff:
            return qs.filter(referrer=self.request.user)
        referrer_id = self.request.query_params.get('referrer')
        if referrer_id:
            qs = qs.filter(referrer_id=referrer_id)
        return qs


ADMIN_TOOLS = [
    {
        "name": "get_student_info",
        "description": "Look up a student by name and get their enrolments, balance, and recent attendance.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Student name (partial match ok)"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "list_class_students",
        "description": "List all students enrolled in a specific class.",
        "input_schema": {
            "type": "object",
            "properties": {
                "class_name": {"type": "string", "description": "Class name (partial match ok)"},
            },
            "required": ["class_name"],
        },
    },
    {
        "name": "update_attendance",
        "description": "Update a student's attendance record for a specific class occurrence. Use this to mark present, absent, late, no_show, or undo a marked absence.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "class_name": {"type": "string", "description": "Class name (partial match ok)"},
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                "status": {"type": "string", "enum": ["present", "absent", "late", "no_show"], "description": "New attendance status"},
            },
            "required": ["student_name", "date", "status"],
        },
    },
    {
        "name": "move_student_class",
        "description": "Move a student from one class to another by updating their enrolment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "from_class": {"type": "string", "description": "Current class name (optional)"},
                "to_class": {"type": "string", "description": "Target class name (partial match ok)"},
            },
            "required": ["student_name", "to_class"],
        },
    },
    {
        "name": "enrol_student",
        "description": "Enrol a student in a class session.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "class_name": {"type": "string", "description": "Class to enrol in (partial match ok)"},
                "enrolment_type": {"type": "string", "enum": ["full", "trial", "casual"], "description": "Type of enrolment, default full"},
            },
            "required": ["student_name", "class_name"],
        },
    },
    {
        "name": "cancel_enrolment",
        "description": "Cancel a student's enrolment in a class.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "class_name": {"type": "string", "description": "Class name (partial match ok)"},
            },
            "required": ["student_name", "class_name"],
        },
    },
    {
        "name": "take_payment",
        "description": "Record a payment made by a student (cash, card, etc).",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "amount": {"type": "number", "description": "Payment amount in dollars"},
                "description": {"type": "string", "description": "What the payment is for"},
                "method": {"type": "string", "description": "Payment method: cash, card, eftpos, bank_transfer"},
            },
            "required": ["student_name", "amount", "description"],
        },
    },
    {
        "name": "add_charge",
        "description": "Add a charge to a student's account (e.g. late cancel fee, no-show fee, lost key fee).",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "amount": {"type": "number", "description": "Charge amount in dollars"},
                "description": {"type": "string", "description": "What the charge is for"},
            },
            "required": ["student_name", "amount", "description"],
        },
    },
    {
        "name": "issue_makeup_credit",
        "description": "Issue a makeup credit to a student for an approved absence.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "reason": {"type": "string", "description": "Reason for the makeup credit"},
            },
            "required": ["student_name"],
        },
    },
    {
        "name": "list_todays_classes",
        "description": "List all class occurrences happening today with enrolled student counts.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "list_upcoming_classes",
        "description": "List class occurrences for the next 7 days.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "How many days ahead to look, default 7"},
            },
            "required": [],
        },
    },
    {
        "name": "check_waitlist",
        "description": "Check who is on the waitlist for a specific class.",
        "input_schema": {
            "type": "object",
            "properties": {
                "class_name": {"type": "string", "description": "Class name (partial match ok)"},
            },
            "required": ["class_name"],
        },
    },
    {
        "name": "cancel_away",
        "description": "Undo a student's marked absence — restore them to a class they marked away from. If the class is full, adds them to the waitlist.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "class_name": {"type": "string", "description": "Class name (partial match ok)"},
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
            },
            "required": ["student_name"],
        },
    },
    {
        "name": "book_practice_for_student",
        "description": "Book a practice time slot for a student.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                "studio_name": {"type": "string", "description": "Studio name (partial match ok, optional)"},
            },
            "required": ["student_name", "date"],
        },
    },
    {
        "name": "send_student_notification",
        "description": "Send an in-app notification to a student.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_name": {"type": "string", "description": "Student's name (partial match ok)"},
                "title": {"type": "string", "description": "Notification title"},
                "body": {"type": "string", "description": "Notification message body"},
            },
            "required": ["student_name", "title", "body"],
        },
    },
]

STUDENT_TOOLS = [
    {
        "name": "get_my_schedule",
        "description": "Get the student's upcoming class schedule with dates, times and studios.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_season_info",
        "description": "Get current and upcoming season dates and pricing information.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_practice_slots",
        "description": "Get available open practice time slots the student can book.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "book_practice",
        "description": "Book a practice time slot for the current student.",
        "input_schema": {
            "type": "object",
            "properties": {
                "slot_id": {"type": "integer", "description": "The ID of the practice slot to book"},
            },
            "required": ["slot_id"],
        },
    },
    {
        "name": "get_my_balance",
        "description": "Get the student's current account balance and recent transactions.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "contact_reception",
        "description": "Send an urgent message to reception staff. Use this for lockouts, emergencies, or anything needing immediate human attention.",
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "The urgent message to send to reception"},
            },
            "required": ["message"],
        },
    },
]

# Keep backwards-compatible alias
ASSISTANT_TOOLS = ADMIN_TOOLS


def execute_tool(tool_name, tool_input, acting_user=None):
    """Execute an assistant tool and return a readable result string."""
    import datetime as dt
    from apps.attendance.models import AttendanceRecord
    from apps.enrolments.models import Enrolment
    from apps.classes.models import ClassSession, ClassOccurrence, PracticeSlot, PracticeBooking, Season
    from apps.payments.models import Payment

    if tool_name == 'get_student_info':
        name = tool_input.get('name', '')
        students = User.objects.filter(
            Q(first_name__icontains=name) | Q(last_name__icontains=name) | Q(display_name__icontains=name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{name}'."
        student = students.first()
        # Active enrolments
        enrolments = Enrolment.objects.filter(student=student, status='active').select_related('class_session')
        enrolment_list = ', '.join(str(e.class_session) for e in enrolments) or 'None'
        # Balance
        paid = Payment.objects.filter(student=student, payment_type='payment').aggregate(total=Sum('amount'))['total'] or 0
        charged = Payment.objects.filter(student=student, payment_type__in=['charge', 'no_show_fee']).aggregate(total=Sum('amount'))['total'] or 0
        balance = float(paid) - float(charged)
        # Recent attendance
        recent_att = AttendanceRecord.objects.filter(student=student).select_related('occurrence__class_session').order_by('-occurrence__date')[:5]
        att_lines = [f"  - {r.occurrence.date} {r.occurrence.session}: {r.status}" for r in recent_att]
        att_str = '\n'.join(att_lines) if att_lines else '  None'
        return (
            f"Student: {student.display_name} ({student.email})\n"
            f"Active enrolments: {enrolment_list}\n"
            f"Balance: ${balance:.2f}\n"
            f"Recent attendance:\n{att_str}"
        )

    elif tool_name == 'list_class_students':
        class_name = tool_input.get('class_name', '')
        sessions = ClassSession.objects.filter(name__icontains=class_name)
        if not sessions.exists():
            return f"No class found matching '{class_name}'."
        session = sessions.first()
        enrolments = Enrolment.objects.filter(class_session=session, status='active').select_related('student')
        if not enrolments.exists():
            return f"No students enrolled in '{session.name}'."
        names = [f"  - {e.student.display_name} ({e.student.email})" for e in enrolments]
        return f"Students in {session.name} ({len(names)} enrolled):\n" + '\n'.join(names)

    elif tool_name == 'update_attendance':
        student_name = tool_input.get('student_name', '')
        class_name = tool_input.get('class_name', '')
        date_str = tool_input.get('date', '')
        new_status = tool_input.get('status', '')

        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()

        occ_qs = ClassOccurrence.objects.filter(date=date_str)
        if class_name:
            occ_qs = occ_qs.filter(class_session__name__icontains=class_name)
        if not occ_qs.exists():
            return f"No class occurrence found for date {date_str}" + (f" matching '{class_name}'" if class_name else '') + "."

        occurrence = occ_qs.first()
        record, created = AttendanceRecord.objects.get_or_create(
            occurrence=occurrence,
            student=student,
            defaults={'status': new_status},
        )
        if not created:
            old_status = record.status
            record.status = new_status
            record.save(update_fields=['status', 'updated_at'])
            return f"Updated {student.display_name}'s attendance for {occurrence} on {date_str}: {old_status} → {new_status}."
        return f"Created attendance record for {student.display_name} in {occurrence} on {date_str}: {new_status}."

    elif tool_name == 'move_student_class':
        student_name = tool_input.get('student_name', '')
        from_class = tool_input.get('from_class', '')
        to_class = tool_input.get('to_class', '')

        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()

        enrolment_qs = Enrolment.objects.filter(student=student, status='active')
        if from_class:
            enrolment_qs = enrolment_qs.filter(class_session__name__icontains=from_class)
        if not enrolment_qs.exists():
            return f"No active enrolment found for {student.display_name}" + (f" in class matching '{from_class}'" if from_class else '') + "."
        enrolment = enrolment_qs.first()

        new_sessions = ClassSession.objects.filter(name__icontains=to_class)
        if not new_sessions.exists():
            return f"No class found matching '{to_class}'."
        new_session = new_sessions.first()

        old_session_name = str(enrolment.class_session)
        enrolment.class_session = new_session
        enrolment.save(update_fields=['class_session'])
        return f"Moved {student.display_name} from '{old_session_name}' to '{new_session.name}'."

    elif tool_name == 'enrol_student':
        student_name = tool_input.get('student_name', '')
        class_name = tool_input.get('class_name', '')
        enrolment_type = tool_input.get('enrolment_type', 'full')
        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()
        sessions = ClassSession.objects.filter(name__icontains=class_name, is_active=True)
        if not sessions.exists():
            return f"No active class found matching '{class_name}'."
        session = sessions.first()
        if Enrolment.objects.filter(student=student, class_session=session, status='active').exists():
            return f"{student.display_name} is already enrolled in {session.name}."
        Enrolment.objects.create(
            student=student,
            class_session=session,
            status='active',
            enrolment_type=enrolment_type,
        )
        return f"Enrolled {student.display_name} in {session.name} ({enrolment_type})."

    elif tool_name == 'cancel_enrolment':
        student_name = tool_input.get('student_name', '')
        class_name = tool_input.get('class_name', '')
        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()
        enrolments = Enrolment.objects.filter(student=student, status='active', class_session__name__icontains=class_name)
        if not enrolments.exists():
            return f"No active enrolment found for {student.display_name} in '{class_name}'."
        enrolment = enrolments.first()
        class_label = str(enrolment.class_session)
        enrolment.status = 'cancelled'
        enrolment.save(update_fields=['status'])
        return f"Cancelled {student.display_name}'s enrolment in {class_label}."

    elif tool_name == 'take_payment':
        student_name = tool_input.get('student_name', '')
        amount = tool_input.get('amount', 0)
        description = tool_input.get('description', 'Payment')
        method = tool_input.get('method', 'cash')
        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()
        Payment.objects.create(
            student=student,
            payment_type=Payment.PaymentType.PAYMENT,
            amount=amount,
            description=description,
            reference=method,
            created_by=acting_user,
        )
        return f"Recorded ${amount:.2f} payment from {student.display_name} ({method}) for: {description}."

    elif tool_name == 'add_charge':
        student_name = tool_input.get('student_name', '')
        amount = tool_input.get('amount', 0)
        description = tool_input.get('description', 'Charge')
        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()
        Payment.objects.create(
            student=student,
            payment_type=Payment.PaymentType.CHARGE,
            amount=amount,
            description=description,
            created_by=acting_user,
        )
        return f"Added ${amount:.2f} charge to {student.display_name}'s account for: {description}."

    elif tool_name == 'issue_makeup_credit':
        student_name = tool_input.get('student_name', '')
        reason = tool_input.get('reason', 'Approved absence')
        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()
        from apps.attendance.models import MakeupCredit
        credit = MakeupCredit.objects.create(
            student=student,
            reason=reason,
            status='available',
            issued_by=acting_user,
        )
        return f"Issued a makeup credit to {student.display_name} (reason: {reason}). Credit ID: {credit.id}."

    elif tool_name == 'list_todays_classes':
        today = dt.date.today()
        occurrences = ClassOccurrence.objects.filter(date=today).select_related('session', 'session__studio').prefetch_related('attendance')
        if not occurrences.exists():
            return f"No classes scheduled for today ({today})."
        lines = [f"Classes today ({today}):"]
        for occ in occurrences:
            enrolled = Enrolment.objects.filter(class_session=occ.session, status='active').count()
            present = occ.attendance.filter(status='present').count()
            lines.append(f"  - {occ.session.name} @ {occ.session.start_time:%H:%M} in {occ.session.studio} — {enrolled} enrolled, {present} checked in")
        return '\n'.join(lines)

    elif tool_name == 'list_upcoming_classes':
        days = tool_input.get('days', 7)
        today = dt.date.today()
        end = today + dt.timedelta(days=days)
        occurrences = ClassOccurrence.objects.filter(date__range=[today, end]).select_related('session', 'session__studio').order_by('date', 'session__start_time')
        if not occurrences.exists():
            return f"No classes in the next {days} days."
        lines = [f"Upcoming classes (next {days} days):"]
        for occ in occurrences:
            enrolled = Enrolment.objects.filter(class_session=occ.session, status='active').count()
            lines.append(f"  - {occ.date} {occ.session.name} @ {occ.session.start_time:%H:%M} ({enrolled}/{occ.session.capacity}) in {occ.session.studio}")
        return '\n'.join(lines)

    elif tool_name == 'check_waitlist':
        class_name = tool_input.get('class_name', '')
        sessions = ClassSession.objects.filter(name__icontains=class_name, is_active=True)
        if not sessions.exists():
            return f"No class found matching '{class_name}'."
        session = sessions.first()
        waitlisted = Enrolment.objects.filter(class_session=session, status='waitlisted').select_related('student')
        if not waitlisted.exists():
            return f"No one is on the waitlist for {session.name}."
        names = [f"  {i+1}. {e.student.display_name} ({e.student.email})" for i, e in enumerate(waitlisted)]
        return f"Waitlist for {session.name} ({len(names)} people):\n" + '\n'.join(names)

    elif tool_name == 'cancel_away':
        student_name = tool_input.get('student_name', '')
        class_name = tool_input.get('class_name', '')
        date_str = tool_input.get('date', '')
        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()
        att_qs = AttendanceRecord.objects.filter(student=student, status='absent')
        if class_name:
            att_qs = att_qs.filter(occurrence__session__name__icontains=class_name)
        if date_str:
            att_qs = att_qs.filter(occurrence__date=date_str)
        att_qs = att_qs.select_related('occurrence__session')
        if not att_qs.exists():
            return f"No marked absence found for {student.display_name}" + (f" in '{class_name}'" if class_name else '') + "."
        record = att_qs.order_by('occurrence__date').first()
        occ = record.occurrence
        capacity = occ.session.capacity
        confirmed = AttendanceRecord.objects.filter(occurrence=occ).exclude(status='absent').exclude(student=student).count()
        if confirmed < capacity:
            record.delete()
            return f"Restored {student.display_name} to {occ.session.name} on {occ.date}. They're back in!"
        else:
            record.delete()
            Enrolment.objects.get_or_create(student=student, class_session=occ.session, status='waitlisted')
            return f"Class is full — added {student.display_name} to the waitlist for {occ.session.name} on {occ.date}."

    elif tool_name == 'book_practice_for_student':
        student_name = tool_input.get('student_name', '')
        date_str = tool_input.get('date', '')
        studio_name = tool_input.get('studio_name', '')
        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()
        slots_qs = PracticeSlot.objects.filter(date=date_str, is_active=True)
        if studio_name:
            slots_qs = slots_qs.filter(studio__name__icontains=studio_name)
        available = [s for s in slots_qs if s.spots_left > 0 and not PracticeBooking.objects.filter(slot=s, student=student, status='confirmed').exists()]
        if not available:
            return f"No available practice slots on {date_str}" + (f" at '{studio_name}'" if studio_name else '') + "."
        slot = available[0]
        PracticeBooking.objects.create(slot=slot, student=student, price_charged=0, is_free=False)
        return f"Booked {student.display_name} into practice at {slot.studio} on {slot.date} {slot.start_time:%H:%M}–{slot.end_time:%H:%M}."

    elif tool_name == 'send_student_notification':
        student_name = tool_input.get('student_name', '')
        title = tool_input.get('title', '')
        body = tool_input.get('body', '')
        students = User.objects.filter(
            Q(first_name__icontains=student_name) | Q(last_name__icontains=student_name) | Q(display_name__icontains=student_name),
            role='student',
        )
        if not students.exists():
            return f"No student found matching '{student_name}'."
        student = students.first()
        Notification.objects.create(recipient=student, title=title, body=body, notification_type=Notification.Type.INFO)
        return f"Notification sent to {student.display_name}: '{title}'."

    # ── Student tools ──────────────────────────────────────────────────────────

    elif tool_name == 'get_my_schedule':
        student = acting_user
        today = dt.date.today()
        enrolments = Enrolment.objects.filter(student=student, status='active').select_related('class_session', 'class_session__studio')
        if not enrolments.exists():
            return "You have no active enrolments."
        lines = ["Your enrolled classes:"]
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        for e in enrolments:
            s = e.class_session
            lines.append(f"  - {s.name} — {days[s.day_of_week]} {s.start_time:%H:%M} at {s.studio} ({s.duration_minutes} min)")
        # Upcoming occurrences
        upcoming = ClassOccurrence.objects.filter(
            session__enrolments__student=student,
            session__enrolments__status='active',
            date__gte=today,
            date__lte=today + dt.timedelta(days=14),
        ).select_related('session').order_by('date')[:6]
        if upcoming.exists():
            lines.append("\nNext 2 weeks:")
            for occ in upcoming:
                lines.append(f"  - {occ.date} {occ.session.name} @ {occ.session.start_time:%H:%M}")
        return '\n'.join(lines)

    elif tool_name == 'get_season_info':
        today = dt.date.today()
        seasons = Season.objects.filter(end_date__gte=today).order_by('start_date')[:3]
        if not seasons.exists():
            return "No upcoming seasons found. Contact the studio for schedule information."
        lines = []
        for s in seasons:
            status = "ACTIVE" if s.start_date <= today <= s.end_date else "UPCOMING"
            lines.append(f"{s.name} [{status}]: {s.start_date} to {s.end_date}")
            if s.notes:
                lines.append(f"  Notes: {s.notes}")
        lines.append("\nSeason pricing (pole classes):")
        lines.append("  1 class/week: $270 · 2: $440 · 3: $580 · 4: $700 · 5: $800 · 6: $900")
        lines.append("  Kiki/Unravel standalone: $250 · Add-on to pole: from $150 extra")
        return '\n'.join(lines)

    elif tool_name == 'get_practice_slots':
        today = dt.date.today()
        student = acting_user
        slots = PracticeSlot.objects.filter(date__gte=today, is_active=True).select_related('studio').order_by('date', 'start_time')[:10]
        if not slots.exists():
            return "No practice slots are currently available. Check back soon or contact the studio."
        lines = ["Available practice slots:"]
        for slot in slots:
            booked = slot.booked_count
            if slot.spots_left > 0:
                already = PracticeBooking.objects.filter(slot=slot, student=student, status='confirmed').exists()
                lines.append(f"  ID {slot.id}: {slot.date} {slot.start_time:%H:%M}–{slot.end_time:%H:%M} at {slot.studio} — {slot.spots_left} spots left{'  ✓ YOU ARE BOOKED' if already else ''}")
        return '\n'.join(lines) if len(lines) > 1 else "No available slots right now."

    elif tool_name == 'book_practice':
        slot_id = tool_input.get('slot_id')
        student = acting_user
        try:
            slot = PracticeSlot.objects.get(pk=slot_id, is_active=True)
        except PracticeSlot.DoesNotExist:
            return f"Practice slot {slot_id} not found."
        if slot.spots_left <= 0:
            return "That slot is fully booked."
        if PracticeBooking.objects.filter(slot=slot, student=student, status='confirmed').exists():
            return "You're already booked into that slot."
        today = dt.date.today()
        week_start = today - dt.timedelta(days=today.weekday())
        week_end = week_start + dt.timedelta(days=6)
        from apps.attendance.models import AttendanceRecord
        attended = AttendanceRecord.objects.filter(student=student, status='present', occurrence__date__range=[week_start, week_end]).count()
        is_free = attended >= 3
        from apps.enrolments.models import Enrolment as EnrolmentModel
        is_enrolled = EnrolmentModel.objects.filter(student=student, status='active').exists()
        rate = slot.ENROLLED_RATE if is_enrolled else slot.NON_ENROLLED_RATE
        price = 0 if is_free else round(slot.duration_hours * rate, 2)
        PracticeBooking.objects.create(slot=slot, student=student, price_charged=price, is_free=is_free)
        price_str = "free (3+ course classes this season!)" if is_free else f"${price:.0f} — pay at reception"
        return f"Booked! {slot.date} {slot.start_time:%H:%M}–{slot.end_time:%H:%M} at {slot.studio}. Cost: {price_str}."

    elif tool_name == 'get_my_balance':
        student = acting_user
        paid = Payment.objects.filter(student=student, payment_type='payment').aggregate(total=Sum('amount'))['total'] or 0
        charged = Payment.objects.filter(student=student, payment_type__in=['charge', 'no_show_fee']).aggregate(total=Sum('amount'))['total'] or 0
        balance = float(paid) - float(charged)
        recent = Payment.objects.filter(student=student).order_by('-created_at')[:5]
        lines = [f"Account balance: ${balance:+.2f}"]
        if recent.exists():
            lines.append("Recent activity:")
            for p in recent:
                lines.append(f"  - {p.created_at.date()} {p.description or p.payment_type}: ${p.amount:.2f}")
        return '\n'.join(lines)

    elif tool_name == 'contact_reception':
        message_body = tool_input.get('message', '')
        student = acting_user
        staff = User.objects.filter(role__in=('admin', 'instructor'), is_active=True)
        for member in staff:
            Notification.objects.create(
                recipient=member,
                title=f"Access Issue: {student.display_name}",
                body=f"{student.display_name} ({student.email}): {message_body}",
                notification_type=Notification.Type.WARNING,
            )
        return (
            "Here within 5 minutes of your class starting? Please use Kisi to access the studio. "
            "Later than that? The door is locked and you've missed your class — no exceptions. "
            "If you have any other enquiries, please contact us below and we'll get back to you ASAP."
        )

    return f"Unknown tool: {tool_name}"


class AssistantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Accept both 'message' and 'query' from different frontend callers
        message = (request.data.get('message') or request.data.get('query') or '').strip()
        if not message:
            return Response({'error': 'No message provided'}, status=400)

        api_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not ANTHROPIC_AVAILABLE or not api_key:
            return Response({'response': "I'm not fully set up yet — please contact the studio directly for help.", 'reply': "I'm not fully set up yet — please contact the studio directly for help."})

        import datetime as dt
        from apps.enrolments.models import Enrolment
        from apps.classes.models import Season

        user = request.user
        is_admin = user.role in ('admin', 'instructor', 'staff')
        studio = StudioSettings.get()

        # ── Admin system prompt ────────────────────────────────────────────────
        if is_admin:
            system_prompt = (
                f"You are the studio management assistant for {studio.studio_name}, a pole dance studio in Surry Hills, Sydney.\n"
                f"You help reception staff and admins manage the studio quickly — especially useful mid-class or behind the desk.\n\n"
                f"Studio: {studio.studio_name} · Level 1, 88 Kippax St, Surry Hills NSW 2010 · (02) 9160 0223\n"
                f"Studios: Rhapsody (14 poles), The Box (11 poles), Janitor's Closet (3 poles, private lessons)\n\n"
                f"You have tools to: look up students, view/update attendance, enrol/cancel students, move between classes, "
                f"take payments, add charges, issue makeup credits, book practice time, check waitlists, send notifications, and more.\n\n"
                f"Always use tools to get live data rather than guessing. Be concise — reception is busy.\n"
                f"Confirm what you've done after taking an action. If something is ambiguous, ask one clarifying question.\n"
                f"Today is {dt.date.today()}."
            )
            tools = ADMIN_TOOLS

        # ── Student system prompt ──────────────────────────────────────────────
        else:
            active_enrolments = Enrolment.objects.filter(student=user, status='active').select_related('class_session', 'class_session__studio')
            class_list = ', '.join(str(e.class_session) for e in active_enrolments) or 'none'
            today = dt.date.today()
            active_seasons = Season.objects.filter(start_date__lte=today, end_date__gte=today)
            season_str = ', '.join(f"{s.name} ({s.start_date} – {s.end_date})" for s in active_seasons) or 'no active season right now'
            upcoming_seasons = Season.objects.filter(start_date__gt=today).order_by('start_date')[:2]
            upcoming_str = ', '.join(f"{s.name} starts {s.start_date}" for s in upcoming_seasons) or 'none announced yet'

            system_prompt = (
                f"You are the friendly assistant for {studio.studio_name}, a pole dance studio. You're talking to {user.display_name}.\n\n"
                f"STUDIO INFO:\n"
                f"Address: Level 1, 88 Kippax St, Surry Hills NSW 2010\n"
                f"Phone: (02) 9160 0223 · Email: intrigued@dualitypole.com\n"
                f"Studios: Rhapsody (14 poles), The Box (11 poles), Janitor's Closet (3 poles — private lessons & comp prep)\n\n"
                f"SEASONS:\n"
                f"Current: {season_str}\n"
                f"Upcoming: {upcoming_str}\n\n"
                f"PRICING (per season):\n"
                f"1 class/week: $270 · 2: $440 · 3: $580 · 4: $700 · 5: $800 · 6: $900\n"
                f"Kiki/Unravel standalone: $250 · Add Kiki/Unravel to a pole package: from $150 extra\n\n"
                f"PRACTICE TIME:\n"
                f"Open practice bookable through the app. $20/hr if enrolled, $30/hr if not. FREE if enrolled in 3+ course classes this season.\n\n"
                f"POLICIES:\n"
                f"Cancel {studio.cancellation_window_hours}+ hours before class → you get a makeup credit to use later that season.\n"
                f"Cancel within {studio.cancellation_window_hours} hours → forfeit the class, no credit. No-show: ${studio.no_show_fee} fee.\n"
                f"Makeup credits are for TIMELY cancellations (not illness/injury) and expire within the same season.\n\n"
                f"{user.display_name}'s classes: {class_list}\n\n"
                f"IMPORTANT: If someone is locked out, can't get in, or has an urgent issue, use the contact_reception tool immediately.\n"
                f"Be warm, friendly, and concise. Use tools to get live data (schedule, balance, practice slots). "
                f"For anything you can't help with, direct them to call (02) 9160 0223 or email intrigued@dualitypole.com.\n"
                f"Today is {today}."
            )
            tools = STUDENT_TOOLS

        try:
            ai_client = anthropic.Anthropic(api_key=api_key)
            messages = [{'role': 'user', 'content': message}]

            ai_response = ai_client.messages.create(
                model='claude-haiku-4-5-20251001',
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
                tools=tools,
            )

            while ai_response.stop_reason == 'tool_use':
                tool_uses = [b for b in ai_response.content if b.type == 'tool_use']
                messages.append({'role': 'assistant', 'content': ai_response.content})
                tool_results = []
                for tool_use in tool_uses:
                    result = execute_tool(tool_use.name, tool_use.input, acting_user=user)
                    tool_results.append({
                        'type': 'tool_result',
                        'tool_use_id': tool_use.id,
                        'content': result,
                    })
                messages.append({'role': 'user', 'content': tool_results})
                ai_response = ai_client.messages.create(
                    model='claude-haiku-4-5-20251001',
                    max_tokens=1024,
                    system=system_prompt,
                    messages=messages,
                    tools=tools,
                )

            text_blocks = [b for b in ai_response.content if hasattr(b, 'text')]
            reply_text = text_blocks[0].text if text_blocks else "Done."

        except Exception as e:
            reply_text = "I'm having trouble connecting right now — please contact the studio directly for help."

        # Return both keys so both frontend callers work
        return Response({'response': reply_text, 'reply': reply_text})


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

        base_qs = User.objects.filter(role='student', is_active=True).exclude(email='')
        slug = (email_list.query_slug or '').lower()
        if slug == 'overdue':
            from decimal import Decimal
            from apps.payments.models import Payment as PaymentModel
            paid_subq = PaymentModel.objects.filter(
                student=OuterRef('pk'), payment_type__in=['payment', 'credit'],
            ).values('student').annotate(s=Sum('amount')).values('s')
            charged_subq = PaymentModel.objects.filter(
                student=OuterRef('pk'), payment_type__in=['charge', 'no_show_fee'],
            ).values('student').annotate(s=Sum('amount')).values('s')
            from decimal import Decimal as D
            overdue_ids = (
                base_qs
                .annotate(
                    total_paid=Coalesce(Subquery(paid_subq), D('0')),
                    total_charged=Coalesce(Subquery(charged_subq), D('0')),
                )
                .filter(total_charged__gt=models.F('total_paid'))
                .values_list('id', flat=True)
            )
            base_qs = base_qs.filter(id__in=overdue_ids)
        elif slug == 'enrolled':
            from apps.enrolments.models import Enrolment
            enrolled_ids = Enrolment.objects.filter(status='active').values_list('student_id', flat=True)
            base_qs = base_qs.filter(id__in=enrolled_ids)
        students = base_qs.order_by('last_name', 'first_name')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{email_list.name.replace(" ", "_")}_export.csv"'
        writer = csv.writer(response)
        writer.writerow(['First Name', 'Last Name', 'Email', 'Phone'])
        for s in students:
            writer.writerow([s.first_name, s.last_name, s.email, getattr(s, 'phone', '') or ''])
        return response


class MailchimpStatusView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        s = StudioSettings.get()
        if not s.mailchimp_api_key:
            return Response({'connected': False})
        from .mailchimp_service import check_status, get_list_info
        ok, info = check_status(s.mailchimp_api_key)
        if not ok:
            return Response({'connected': False, 'error': info.get('error')})
        result = {'connected': True, 'account_name': info.get('account_name'), 'account_email': info.get('email')}
        if s.mailchimp_list_id:
            ok2, linfo = get_list_info(s.mailchimp_api_key, s.mailchimp_list_id)
            if ok2:
                result['list_name'] = linfo.get('name')
                result['member_count'] = linfo.get('member_count')
        return Response(result)


class MailchimpSyncView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        s = StudioSettings.get()
        if not s.mailchimp_api_key or not s.mailchimp_list_id:
            return Response({'detail': 'Mailchimp API key and list ID required'}, status=400)
        from .mailchimp_service import sync_members
        students = list(
            User.objects.filter(role='student', is_active=True)
            .values('email', 'first_name', 'last_name')
        )
        added, updated, errors = sync_members(s.mailchimp_api_key, s.mailchimp_list_id, students)
        return Response({'added': added, 'updated': updated, 'errors': errors, 'total': len(students)})


class XeroConnectView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        s = StudioSettings.get()
        if not s.xero_client_id:
            return Response({'detail': 'Xero Client ID not configured in settings'}, status=400)
        redirect_uri = request.build_absolute_uri('/api/users/xero/callback/')
        from .xero_service import get_auth_url
        url = get_auth_url(s.xero_client_id, redirect_uri)
        return Response({'auth_url': url})


class XeroCallbackView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.shortcuts import redirect as django_redirect
        code = request.query_params.get('code')
        if not code:
            return django_redirect('/#/settings?xero=error')
        s = StudioSettings.get()
        redirect_uri = request.build_absolute_uri('/api/users/xero/callback/')
        try:
            from .xero_service import exchange_code, get_tenants
            from django.utils import timezone as tz
            from datetime import timedelta
            token_data = exchange_code(s.xero_client_id, s.xero_client_secret, code, redirect_uri)
            s.xero_access_token = token_data['access_token']
            s.xero_refresh_token = token_data.get('refresh_token', '')
            s.xero_token_expires_at = tz.now() + timedelta(seconds=token_data.get('expires_in', 1800))
            # Get first tenant
            tenants = get_tenants(s.xero_access_token)
            if tenants:
                s.xero_tenant_id = tenants[0]['tenantId']
            s.save()
            return django_redirect('/#/settings?tab=integrations&xero=connected')
        except Exception as e:
            return django_redirect(f'/#/settings?tab=integrations&xero=error')


class XeroStatusView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        s = StudioSettings.get()
        if not s.xero_access_token:
            return Response({'connected': False})
        try:
            from .xero_service import get_tenants, _get_valid_token
            token = _get_valid_token(s)
            tenants = get_tenants(token)
            tenant_name = tenants[0].get('tenantName') if tenants else 'Unknown'
            return Response({'connected': True, 'tenant_name': tenant_name})
        except Exception as e:
            return Response({'connected': False, 'error': str(e)})

    def delete(self, request):
        s = StudioSettings.get()
        s.xero_access_token = ''
        s.xero_refresh_token = ''
        s.xero_token_expires_at = None
        s.xero_tenant_id = ''
        s.save()
        return Response({'disconnected': True})


class XeroSyncView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        s = StudioSettings.get()
        if not s.xero_access_token:
            return Response({'detail': 'Xero not connected'}, status=400)
        from apps.payments.models import Payment
        from .xero_service import sync_payment
        from django.utils import timezone as tz
        from datetime import timedelta
        cutoff = tz.now() - timedelta(days=30)
        payments = Payment.objects.filter(
            created_at__gte=cutoff,
            payment_type=Payment.PaymentType.PAYMENT,
        ).select_related('student')
        synced = 0
        errors = 0
        for p in payments:
            try:
                sync_payment(s, p)
                synced += 1
            except Exception:
                errors += 1
        return Response({'synced': synced, 'errors': errors, 'total': payments.count()})


class ActionItemListView(generics.ListCreateAPIView):
    serializer_class = ActionItemSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = ActionItem.objects.all()
        if self.request.query_params.get('done') == 'true':
            qs = qs.filter(is_done=True)
        elif self.request.query_params.get('done') == 'false':
            qs = qs.filter(is_done=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ActionItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ActionItem.objects.all()
    serializer_class = ActionItemSerializer
    permission_classes = [IsAdminOrInstructor]


class ChallengeListView(generics.ListCreateAPIView):
    serializer_class = ChallengeSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Challenge.objects.all()
        if self.request.query_params.get('active') == 'true':
            qs = qs.filter(is_active=True)
        return qs


class ChallengeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    permission_classes = [IsAdminUser]


class ChallengeLeaderboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            challenge = Challenge.objects.get(pk=pk)
        except Challenge.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        entries = ChallengeProgress.objects.filter(
            challenge=challenge
        ).select_related('student').order_by('-current_value', 'id')[:50]
        data = ChallengeProgressSerializer(entries, many=True).data
        return Response(data)


class ChallengeOptInView(APIView):
    """Student opts in or out of a challenge."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            challenge = Challenge.objects.get(pk=pk, is_active=True)
        except Challenge.DoesNotExist:
            return Response({'detail': 'Challenge not found'}, status=404)
        action = request.data.get('action', 'in')
        if action == 'out':
            ChallengeProgress.objects.filter(challenge=challenge, student=request.user).delete()
            return Response({'status': 'opted_out'})
        # Opt in
        progress, created = ChallengeProgress.objects.get_or_create(
            challenge=challenge,
            student=request.user,
            defaults={'current_value': 0, 'completed': False},
        )
        # Recalculate immediately so existing attendance counts
        _recalculate_challenge_progress(challenge, request.user)
        progress.refresh_from_db()
        return Response({
            'status': 'opted_in',
            'current_value': progress.current_value,
            'completed': progress.completed,
        })


class ChallengeBulkProgressView(APIView):
    """Admin: recalculate progress for all opted-in students on a challenge."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            challenge = Challenge.objects.get(pk=pk)
        except Challenge.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        entries = ChallengeProgress.objects.filter(challenge=challenge).select_related('student')
        for entry in entries:
            _recalculate_challenge_progress(challenge, entry.student)
        return Response({'recalculated': entries.count()})


def _recalculate_challenge_progress(challenge, student):
    """Recalculate and save a student's progress on a challenge."""
    from apps.attendance.models import AttendanceRecord
    progress, _ = ChallengeProgress.objects.get_or_create(
        challenge=challenge, student=student, defaults={'current_value': 0}
    )

    if challenge.challenge_type == 'attendance_count':
        value = AttendanceRecord.objects.filter(
            student=student,
            status__in=('present', 'late'),
            occurrence__date__gte=challenge.start_date,
            occurrence__date__lte=challenge.end_date,
        ).count()

    elif challenge.challenge_type == 'style_variety':
        levels = AttendanceRecord.objects.filter(
            student=student,
            status__in=('present', 'late'),
            occurrence__date__gte=challenge.start_date,
            occurrence__date__lte=challenge.end_date,
        ).values_list('occurrence__session__level', flat=True).distinct()
        value = len([l for l in levels if l])

    elif challenge.challenge_type == 'streak':
        # Count consecutive weeks with at least one attendance
        from datetime import date, timedelta as td
        records = AttendanceRecord.objects.filter(
            student=student,
            status__in=('present', 'late'),
            occurrence__date__gte=challenge.start_date,
            occurrence__date__lte=challenge.end_date,
        ).values_list('occurrence__date', flat=True)
        weeks = set()
        for d in records:
            # ISO week number
            weeks.add(d.isocalendar()[:2])  # (year, week)
        # Count max consecutive weeks
        sorted_weeks = sorted(weeks)
        max_streak = streak = 0
        prev = None
        for yw in sorted_weeks:
            if prev is None:
                streak = 1
            else:
                # Check if consecutive
                prev_date = date.fromisocalendar(prev[0], prev[1], 1)
                curr_date = date.fromisocalendar(yw[0], yw[1], 1)
                if (curr_date - prev_date).days == 7:
                    streak += 1
                else:
                    streak = 1
            max_streak = max(max_streak, streak)
            prev = yw
        value = max_streak

    else:
        # custom — don't auto-update
        return

    progress.current_value = value
    if value >= challenge.target_value and not progress.completed:
        from django.utils import timezone as tz
        progress.completed = True
        progress.completed_at = tz.now()
        # Grant reward
        _grant_challenge_reward(challenge, student)
    progress.save()


def _grant_challenge_reward(challenge, student):
    if challenge.reward_type == 'credit' and challenge.reward_credit_amount:
        from apps.payments.models import Payment
        Payment.objects.create(
            student=student,
            payment_type='credit',
            amount=-abs(challenge.reward_credit_amount),
            description=f'Challenge reward: {challenge.title}',
        )
    from .models import Notification
    Notification.objects.create(
        recipient=student,
        title=f'Challenge complete — {challenge.title}!',
        body=(
            f'You completed the challenge! '
            + (f'You\'ve earned the "{challenge.reward_badge_name}" badge.' if challenge.reward_type == 'badge' and challenge.reward_badge_name else '')
            + (f'${challenge.reward_credit_amount} credit added to your account.' if challenge.reward_type == 'credit' else '')
        ),
        notification_type='challenge',
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        email = (request.data.get('email') or '').strip()
        password = request.data.get('password', '')

        errors = {}
        if not first_name:
            errors['first_name'] = ['This field is required.']
        if not last_name:
            errors['last_name'] = ['This field is required.']
        if not email:
            errors['email'] = ['This field is required.']
        elif User.objects.filter(email=email).exists():
            errors['email'] = ['A user with this email already exists.']
        if not password:
            errors['password'] = ['This field is required.']
        elif len(password) < 8:
            errors['password'] = ['Password must be at least 8 characters.']
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        base = re.sub(r'[^a-z0-9]', '', f"{first_name}{last_name}".lower()) or 'student'
        suffix = str(random.randint(10000, 99999))
        username = f"{base}{suffix}"
        while User.objects.filter(username=username).exists():
            suffix = str(random.randint(10000, 99999))
            username = f"{base}{suffix}"

        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role='student',
        )
        user.set_password(password)
        user.save()

        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminSetPasswordView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        password = request.data.get('password', '')
        if not password:
            return Response({'password': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({'password': ['Password must be at least 8 characters.']}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.set_password(password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'})
