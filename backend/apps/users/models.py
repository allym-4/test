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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

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

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.status})'


class StudioSettings(models.Model):
    studio_name = models.CharField(max_length=100, default='Duality Pole Studio')
    email = models.EmailField(default='hello@dualitypole.com.au')
    phone = models.CharField(max_length=30, blank=True)
    instagram = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=50, default='Australia/Sydney')
    tagline = models.CharField(max_length=200, blank=True)
    primary_colour = models.CharField(max_length=20, default='#CCFF00')
    enquiries_email = models.EmailField(blank=True)
    urgent_email = models.EmailField(blank=True)
    cancellation_window_hours = models.PositiveIntegerField(default=24)
    no_show_fee = models.DecimalField(max_digits=6, decimal_places=2, default=20)
    late_cancel_fee = models.DecimalField(max_digits=6, decimal_places=2, default=10)
    credit_expiry_days = models.PositiveIntegerField(default=60)
    max_freeze_weeks = models.PositiveIntegerField(default=8)
    gst_registered = models.BooleanField(default=True)
    abn = models.CharField(max_length=30, blank=True)
    kisi_api_key = models.CharField(max_length=200, blank=True)
    kisi_org_id = models.CharField(max_length=100, blank=True)
    instagram_access_token = models.CharField(max_length=500, blank=True)
    instagram_page_id = models.CharField(max_length=100, blank=True)
    instagram_username = models.CharField(max_length=100, blank=True)
    meta_app_id = models.CharField(max_length=100, blank=True)
    price_casual = models.DecimalField(max_digits=8, decimal_places=2, default=40)
    price_season = models.DecimalField(max_digits=8, decimal_places=2, default=270)
    price_trial = models.DecimalField(max_digits=8, decimal_places=2, default=35)
    season_pricing_config = models.JSONField(default=list, blank=True)
    form_health_enabled = models.BooleanField(default=True)
    form_photo_consent_enabled = models.BooleanField(default=True)
    form_waiver_enabled = models.BooleanField(default=True)
    form_season_agreement_enabled = models.BooleanField(default=True)
    mailchimp_api_key = models.CharField(max_length=200, blank=True)
    mailchimp_list_id = models.CharField(max_length=100, blank=True)
    xero_client_id = models.CharField(max_length=200, blank=True)
    xero_client_secret = models.CharField(max_length=200, blank=True)
    xero_tenant_id = models.CharField(max_length=200, blank=True)
    xero_access_token = models.TextField(blank=True)
    xero_refresh_token = models.TextField(blank=True)
    xero_token_expires_at = models.DateTimeField(null=True, blank=True)

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

    title = models.CharField(max_length=200)
    body = models.TextField()
    note_type = models.CharField(max_length=20, choices=NoteType.choices, default=NoteType.ANNOUNCEMENT)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='announcements')
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title


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
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skill_records')
    skill_name = models.CharField(max_length=100)
    level = models.CharField(max_length=50)
    self_assessed = models.BooleanField(default=False)
    teacher_confirmed = models.BooleanField(default=False)
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
    url = models.URLField(blank=True)  # for external URLs
    level = models.CharField(max_length=50, blank=True)
    size_display = models.CharField(max_length=20, blank=True)  # e.g. "42 MB"
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='media_uploads')
    session = models.ForeignKey('classes.ClassSession', on_delete=models.SET_NULL, null=True, blank=True, related_name='media_items')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ActionItem(models.Model):
    icon = models.CharField(max_length=10, default='📌')
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    meta = models.CharField(max_length=100, blank=True)
    is_urgent = models.BooleanField(default=False)
    is_done = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='action_items_created')
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
