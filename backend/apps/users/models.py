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
    price_casual = models.DecimalField(max_digits=8, decimal_places=2, default=35)
    price_season = models.DecimalField(max_digits=8, decimal_places=2, default=270)
    price_trial = models.DecimalField(max_digits=8, decimal_places=2, default=25)

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
    title = models.CharField(max_length=200)
    body = models.TextField()
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

    class Meta:
        ordering = ['slug']

    def __str__(self):
        return self.slug


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


class StudentForm(models.Model):
    class FormType(models.TextChoices):
        PARQ = 'parq', 'PAR-Q Health Questionnaire'
        WAIVER = 'waiver', 'Liability Waiver'
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
