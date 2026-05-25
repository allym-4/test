from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        INSTRUCTOR = 'instructor', 'Instructor'
        ADMIN = 'admin', 'Admin'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    pronouns = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', null=True, blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    internal_notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    default_payment_method_id = models.CharField(max_length=100, blank=True)
    auto_charge_saved_card = models.BooleanField(default=False)
    booking_blocked = models.BooleanField(default=False)
    blocked_at = models.DateTimeField(null=True, blank=True, help_text='When booking_blocked was last set to True')

    bio = models.TextField(blank=True, help_text='Public bio shown on the Team page')
    instructor_tagline = models.CharField(max_length=200, blank=True, help_text='Short subtitle shown under the name on the Team page')
    instructor_instagram = models.CharField(max_length=100, blank=True, help_text='Instagram handle (without @)')

    pay_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Per-class pay rate for instructors')
    is_shadow_instructor = models.BooleanField(default=False, help_text='Shadow instructors earn $30/class instead of $40')
    cleared_to_teach = models.ManyToManyField(
        'classes.ClassSession', blank=True, related_name='cleared_instructors',
        help_text='Sessions this instructor is cleared to teach (admin-assigned)'
    )
    block_reason = models.TextField(blank=True, help_text='Reason for booking block (admin notes)')

    notification_preferences = models.JSONField(default=dict, blank=True)

    # Class roster visibility
    show_in_roster = models.BooleanField(default=False)
    roster_name = models.CharField(
        max_length=20,
        choices=[('first_name', 'First name'), ('nickname', 'Nickname')],
        default='first_name',
    )
    nickname = models.CharField(max_length=50, blank=True)
    level = models.CharField(max_length=50, blank=True)
    cleared_for_level = models.CharField(max_length=50, blank=True, help_text='Level student is cleared to attend (may differ from current level)')

    # Staff permission flags (only meaningful for instructor/admin/staff roles)
    perm_billing = models.BooleanField(default=False)
    perm_edit_profiles = models.BooleanField(default=False)
    perm_approve_plans = models.BooleanField(default=False)
    perm_bulk_email = models.BooleanField(default=False)
    perm_reports = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.role})'

    @property
    def display_name(self):
        return self.get_full_name() or self.username


class StaffNote(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='staff_notes')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='notes_authored')
    tag = models.CharField(max_length=50, blank=True)
    body = models.TextField()
    archived = models.BooleanField(default=False)
    recheck_date = models.DateField(null=True, blank=True)
    is_permanent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['archived', '-created_at']

    def __str__(self):
        return f'Note on {self.student} by {self.created_by} ({self.tag})'


class Lead(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        TRIAL_BOOKED = 'trial_booked', 'Trial Booked'
        FOLLOW_UP = 'follow_up', 'Follow-up'
        COLD = 'cold', 'Cold'
        ENROLLED = 'enrolled', 'Enrolled'

    class Source(models.TextChoices):
        INSTAGRAM = 'instagram', 'Instagram'
        GOOGLE = 'google', 'Google'
        REFERRAL = 'referral', 'Referral'
        WEBSITE = 'website', 'Website'
        WALKIN = 'walkin', 'Walk-in'
        OTHER = 'other', 'Other'

    name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.OTHER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    notes = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_contact_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.status})'


class StudioSettings(models.Model):
    studio_name = models.CharField(max_length=100, default='Duality Pole Studio')
    email = models.EmailField(default='hello@dualitypole.com.au')
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=300, blank=True)
    website = models.URLField(blank=True)
    instagram = models.CharField(max_length=100, blank=True)
    trial_intro_headline = models.CharField(max_length=200, blank=True, default='Try Your First Class')
    trial_intro_body = models.TextField(blank=True, default='Your first class, no experience needed. Wear comfortable activewear, bring water — we\'ll do the rest.')
    timezone = models.CharField(max_length=50, default='Australia/Sydney')
    tagline = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    primary_colour = models.CharField(max_length=20, default='#CCFF00')
    enquiries_email = models.EmailField(blank=True)
    urgent_email = models.EmailField(blank=True)
    cancellation_window_hours = models.PositiveIntegerField(default=4)
    no_show_fee = models.DecimalField(max_digits=6, decimal_places=2, default=20)
    late_cancel_fee = models.DecimalField(max_digits=6, decimal_places=2, default=10)
    credit_expiry_days = models.PositiveIntegerField(default=60)
    max_freeze_weeks = models.PositiveIntegerField(default=8)
    gst_registered = models.BooleanField(default=True)
    abn = models.CharField(max_length=30, blank=True)
    kisi_api_key = models.CharField(max_length=200, blank=True)
    kisi_org_id = models.CharField(max_length=100, blank=True)
    kisi_enrolment_place_id = models.CharField(max_length=200, blank=True, help_text='Kisi place ID for the "Duality Babes" group — auto-granted on enrolment')
    kisi_practice_place_id = models.CharField(max_length=200, blank=True, help_text='Kisi place ID for the "Practice Time" group — auto-granted on practice booking')
    instagram_access_token = models.CharField(max_length=500, blank=True)
    instagram_page_id = models.CharField(max_length=100, blank=True)
    instagram_username = models.CharField(max_length=100, blank=True)
    meta_app_id = models.CharField(max_length=100, blank=True)
    price_casual = models.DecimalField(max_digits=8, decimal_places=2, default=40)
    price_casual_enrolled = models.DecimalField(max_digits=8, decimal_places=2, default=30)
    price_season = models.DecimalField(max_digits=8, decimal_places=2, default=270)
    price_trial = models.DecimalField(max_digits=8, decimal_places=2, default=35)
    price_class_pass = models.DecimalField(max_digits=8, decimal_places=2, default=120)
    class_pass_size = models.PositiveIntegerField(default=4)
    season_pricing_config = models.JSONField(default=list, blank=True)
    season_discount_tiers = models.JSONField(default=dict, blank=True)
    studio_code = models.JSONField(default=list, blank=True)
    form_health_enabled = models.BooleanField(default=True)
    form_photo_consent_enabled = models.BooleanField(default=True)
    form_waiver_enabled = models.BooleanField(default=True)
    form_season_agreement_enabled = models.BooleanField(default=True)
    form_health_required = models.BooleanField(default=False)
    form_photo_consent_required = models.BooleanField(default=False)
    form_waiver_required = models.BooleanField(default=True)
    form_season_agreement_required = models.BooleanField(default=False)
    mailchimp_api_key = models.CharField(max_length=200, blank=True)
    mailchimp_list_id = models.CharField(max_length=100, blank=True)
    xero_client_id = models.CharField(max_length=200, blank=True)
    xero_client_secret = models.CharField(max_length=200, blank=True)
    xero_tenant_id = models.CharField(max_length=200, blank=True)
    xero_access_token = models.TextField(blank=True)
    xero_refresh_token = models.TextField(blank=True)
    xero_token_expires_at = models.DateTimeField(null=True, blank=True)
    overdue_reminder_schedule = models.JSONField(
        default=list,
        blank=True,
        help_text='List of {days, send_email} dicts. days=0 means first reminder; for N>0, days since prev reminder.',
    )
    locker_carry_over_paused = models.BooleanField(
        default=False,
        help_text='When True, the automatic locker carry-over reminder is paused (e.g. capacity issue detected).',
    )

    class Meta:
        verbose_name = 'Studio Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Announcement(models.Model):
    class NoteType(models.TextChoices):
        ANNOUNCEMENT = 'announcement', 'Student Announcement'
        STAFF = 'staff', 'Staff Note'

    AUDIENCE_ALL = 'all'
    AUDIENCE_SPECIFIC = 'specific'
    AUDIENCE_ENROLLED = 'enrolled_season'
    AUDIENCE_LEVEL = 'level'
    AUDIENCE_CHOICES = [
        ('all', 'All students'),
        ('specific', 'Specific students'),
        ('enrolled_season', 'Enrolled in season'),
        ('level', 'Students at level(s)'),
    ]

    title = models.CharField(max_length=200)
    body = models.TextField()
    note_type = models.CharField(max_length=20, choices=NoteType.choices, default=NoteType.ANNOUNCEMENT)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='announcements')
    is_pinned = models.BooleanField(default=False)
    requires_acknowledgement = models.BooleanField(default=False)
    acknowledged_by = models.ManyToManyField(
        User, blank=True, related_name='acknowledged_announcements',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Modal pop-up fields
    show_as_modal = models.BooleanField(default=False)
    cta_label = models.CharField(max_length=80, blank=True)
    cta_url = models.CharField(max_length=500, blank=True)

    # Audience targeting
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    audience_students = models.ManyToManyField(
        'users.User', blank=True, related_name='targeted_announcements',
    )
    audience_season = models.ForeignKey(
        'classes.Season', null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
    audience_levels = models.JSONField(default=list, blank=True)
    modal_dismissed_by = models.ManyToManyField(
        'users.User', blank=True, related_name='dismissed_modal_announcements',
    )

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title

    def is_visible_to(self, user):
        if self.audience == 'all':
            return True
        if self.audience == 'specific':
            return self.audience_students.filter(pk=user.pk).exists()
        if self.audience == 'enrolled_season' and self.audience_season_id:
            from apps.enrolments.models import Enrolment
            return Enrolment.objects.filter(
                student=user, class_session__season=self.audience_season, status='active'
            ).exists()
        if self.audience == 'level':
            return user.level in (self.audience_levels or [])
        return False


class Product(models.Model):
    class Category(models.TextChoices):
        APPAREL = 'Apparel', 'Apparel'
        ACCESSORIES = 'Accessories', 'Accessories'
        EQUIPMENT = 'Equipment', 'Equipment'

    name = models.CharField(max_length=100)
    sku = models.CharField(max_length=50, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.ACCESSORIES)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class AutomationRule(models.Model):
    slug = models.CharField(max_length=50, unique=True)
    enabled = models.BooleanField(default=True)
    name = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=50, blank=True)
    conditions = models.JSONField(default=list, blank=True)
    actions = models.JSONField(default=list, blank=True)
    is_custom = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        ordering = ['slug']

    def __str__(self):
        return self.name or self.slug


class AutomationRun(models.Model):
    rule = models.ForeignKey(AutomationRule, on_delete=models.SET_NULL, null=True, related_name='runs')
    slug = models.CharField(max_length=50)  # store slug directly in case rule deleted
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='automation_runs')
    trigger_data = models.JSONField(default=dict, blank=True)
    actions_taken = models.JSONField(default=list, blank=True)  # list of action descriptions
    status = models.CharField(max_length=20, default='completed')  # completed | failed | skipped
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.slug} — {self.student} — {self.status}'


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending_pickup', 'Pending Pickup'
        PICKED_UP = 'picked_up', 'Picked Up'
        CANCELLED = 'cancelled', 'Cancelled'

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    student_name = models.CharField(max_length=100, blank=True)
    items = models.TextField()
    total = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    location = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        name = self.student_name or (self.student.display_name if self.student else 'Unknown')
        return f'Order #{self.pk} — {name}'


class Notification(models.Model):
    class Type(models.TextChoices):
        REMINDER = 'reminder', 'Reminder'
        WAITLIST = 'waitlist', 'Waitlist'
        PAYMENT = 'payment', 'Payment'
        FORM = 'form', 'Form'
        INFO = 'info', 'Info'
        MESSAGE = 'message', 'Message'
        CANCELLATION = 'cancellation', 'Cancellation'
        WARNING = 'warning', 'Warning'
        SUCCESS = 'success', 'Success'
        BILLING = 'billing', 'Billing'

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    body = models.TextField()
    notification_type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    read = models.BooleanField(default=False)
    action_label = models.CharField(max_length=50, blank=True)
    action_url = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.recipient.display_name}: {self.title}'


class InstructorAvailability(models.Model):
    DAY_CHOICES = [(i, d) for i, d in enumerate(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])]
    SLOT_CHOICES = [('morning','Morning (9am–12pm)'),('afternoon','Afternoon (12pm–5pm)'),('evening','Evening (5pm–10pm)')]
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability_slots')
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    slot = models.CharField(max_length=20, choices=SLOT_CHOICES)
    available = models.BooleanField(default=True)
    class Meta:
        unique_together = [('instructor','day_of_week','slot')]
        ordering = ['day_of_week','slot']
    def __str__(self):
        return f'{self.instructor.display_name} — day {self.day_of_week} {self.slot}'


class InstructorUnavailableDate(models.Model):
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='unavailable_dates')
    date_from = models.DateField()
    date_to = models.DateField()
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date_from']

    def __str__(self):
        return f'{self.instructor.display_name} unavailable {self.date_from} – {self.date_to}'


class StudentForm(models.Model):
    class FormType(models.TextChoices):
        PARQ = 'parq', 'PAR-Q Health Questionnaire'
        WAIVER = 'waiver', 'Liability Waiver'
        PHOTO_CONSENT = 'photo_consent', 'Photo & Video Consent'
        SEASON_AGREEMENT = 'season_agreement', 'Season Agreement'
        SURVEY = 'survey', 'Survey'
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forms')
    form_type = models.CharField(max_length=20, choices=FormType.choices)
    completed = models.BooleanField(default=False)
    responses = models.JSONField(default=dict, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = [('student','form_type')]
        ordering = ['completed','form_type']
    def __str__(self):
        return f'{self.student.display_name} — {self.form_type}'


class InstructorPayRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'

    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pay_records')
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.instructor.display_name} — ${self.amount} ({self.status})'


class StudentSkill(models.Model):
    class InstructorStatus(models.TextChoices):
        PENDING = 'pending', 'Pending Review'
        APPROVED = 'approved', 'Approved'
        NOT_QUITE = 'not_quite', 'Not Quite Yet'
        NOT_APPROVED = 'not_approved', 'Not Approved'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skill_records')
    skill_name = models.CharField(max_length=100)
    level = models.CharField(max_length=50)
    self_assessed = models.BooleanField(default=False)
    teacher_confirmed = models.BooleanField(default=False)
    instructor_status = models.CharField(
        max_length=20, choices=InstructorStatus.choices, default=InstructorStatus.PENDING
    )
    is_focus = models.BooleanField(default=False)  # skill added outside student's enrolled level
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('student', 'skill_name')]
        ordering = ['level', 'skill_name']

    def __str__(self):
        return f'{self.student.display_name} — {self.skill_name}'


class Tag(models.Model):
    name = models.CharField(max_length=50)
    colour = models.CharField(max_length=20, default='#ccff00')
    auto_rule = models.CharField(max_length=100, blank=True)
    is_manual = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class StudentTag(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='student_tags')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('student', 'tag')]

    def __str__(self):
        return f'{self.student.display_name} — {self.tag.name}'


class SkillLevel(models.Model):
    name = models.CharField(max_length=50)
    order = models.PositiveIntegerField(default=0)
    class_category = models.ForeignKey(
        'classes.ClassCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='skill_levels',
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class SkillGroup(models.Model):
    level = models.ForeignKey(SkillLevel, on_delete=models.CASCADE, related_name='groups')
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.level.name} — {self.name}'


class SkillDefinition(models.Model):
    group = models.ForeignKey(SkillGroup, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class EmailCampaign(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SCHEDULED = 'scheduled', 'Scheduled'
        SENT = 'sent', 'Sent'

    name = models.CharField(max_length=200)
    subject = models.CharField(max_length=200, blank=True)
    list_name = models.CharField(max_length=100, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT)
    sent_at = models.DateTimeField(null=True, blank=True)
    open_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='campaigns')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class EmailList(models.Model):
    name = models.CharField(max_length=100)
    is_auto = models.BooleanField(default=False)
    query_slug = models.CharField(max_length=50, blank=True)  # for auto lists
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class AssistantMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assistant_messages')
    role = models.CharField(max_length=10)  # 'user' | 'assistant'
    content = models.TextField()
    escalated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.user} [{self.role}] {self.created_at.date()}'


class Referral(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        CREDITED = 'credited', 'Credited'

    referrer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals_made')
    referee_email = models.EmailField()
    referee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='referred_by')
    credit_amount = models.DecimalField(max_digits=8, decimal_places=2, default=50)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.referrer.display_name} → {self.referee_email}'


class MediaItem(models.Model):
    class MediaType(models.TextChoices):
        VIDEO = 'video', 'Video'
        IMAGE = 'image', 'Image'
        PDF = 'pdf', 'PDF'

    name = models.CharField(max_length=200)
    media_type = models.CharField(max_length=10, choices=MediaType.choices)
    file = models.FileField(upload_to='media/', null=True, blank=True)
    url = models.URLField(blank=True)
    level = models.CharField(max_length=50, blank=True)
    size_display = models.CharField(max_length=20, blank=True)
    available_from = models.DateField(null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='media_uploads')
    session = models.ForeignKey('classes.ClassSession', on_delete=models.SET_NULL, null=True, blank=True, related_name='media_items')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Challenge(models.Model):
    class ChallengeType(models.TextChoices):
        ATTENDANCE_COUNT = 'attendance_count', 'Attend X classes'
        STYLE_VARIETY = 'style_variety', 'Try X different class styles'
        STREAK = 'streak', 'X weeks in a row'
        CUSTOM = 'custom', 'Custom (manual completion)'

    class RewardType(models.TextChoices):
        BADGE = 'badge', 'Badge'
        CREDIT = 'credit', 'Account credit'
        NONE = 'none', 'No reward'

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    challenge_type = models.CharField(max_length=30, choices=ChallengeType.choices, default=ChallengeType.ATTENDANCE_COUNT)
    target_value = models.PositiveIntegerField(default=1, help_text='Number to reach (classes, styles, or weeks)')
    start_date = models.DateField()
    end_date = models.DateField()
    reward_type = models.CharField(max_length=20, choices=RewardType.choices, default=RewardType.BADGE)
    reward_badge_name = models.CharField(max_length=100, blank=True)
    reward_credit_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.title


class ChallengeProgress(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='progress')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenge_progress')
    current_value = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('challenge', 'student')]
        ordering = ['-current_value']

    def __str__(self):
        return f'{self.student.display_name} — {self.challenge.title}: {self.current_value}'


class DevicePushToken(models.Model):
    class Platform(models.TextChoices):
        IOS = 'ios', 'iOS'
        ANDROID = 'android', 'Android'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_tokens')
    token = models.CharField(max_length=500)
    platform = models.CharField(max_length=10, choices=Platform.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('user', 'token')]


class ActionItem(models.Model):
    icon = models.CharField(max_length=10, default='📌')
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    meta = models.CharField(max_length=100, blank=True)
    due_date = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='action_items_assigned')
    is_urgent = models.BooleanField(default=False)
    is_done = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='action_items_created')
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
