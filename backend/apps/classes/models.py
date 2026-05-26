from django.db import models
from apps.users.models import User


class Studio(models.Model):
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    kisi_place_id = models.CharField(max_length=100, blank=True)
    capacity = models.CharField(max_length=50, blank=True)
    poles = models.CharField(max_length=100, blank=True)
    features = models.JSONField(default=list, blank=True)
    photo = models.ImageField(upload_to='studios/', null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ClassCategory(models.Model):
    name = models.CharField(max_length=50)
    colour = models.CharField(max_length=20, default='#ccff00')
    is_visible = models.BooleanField(default=True)
    is_addon_type = models.BooleanField(default=False)  # True for Kiki, Unravel, etc.
    standalone_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # e.g. 250 for Kiki/Unravel
    # Default upsell shown to students booking any class in this category
    upsell_headline = models.CharField(max_length=200, blank=True)
    upsell_body = models.TextField(blank=True)
    upsell_target_category = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='upsell_sources',
        help_text='Category to suggest when a student books a class in this category.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ClassSession(models.Model):
    """A recurring class slot — e.g. Level 2 Mon 6:30pm at The Box."""

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, 'Monday'
        TUESDAY = 1, 'Tuesday'
        WEDNESDAY = 2, 'Wednesday'
        THURSDAY = 3, 'Thursday'
        FRIDAY = 4, 'Friday'
        SATURDAY = 5, 'Saturday'
        SUNDAY = 6, 'Sunday'

    class SessionType(models.TextChoices):
        COURSE = 'course', 'Course'
        CASUAL = 'casual', 'Casual'

    name = models.CharField(max_length=100)
    level = models.CharField(max_length=50, blank=True)
    instructor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='class_sessions')
    studio = models.ForeignKey(Studio, on_delete=models.SET_NULL, null=True)
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    start_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=55)
    capacity = models.PositiveIntegerField(default=12)
    session_type = models.CharField(max_length=10, choices=SessionType.choices, default=SessionType.COURSE)
    is_active = models.BooleanField(default=True)
    category = models.ForeignKey(
        ClassCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions'
    )
    season = models.ForeignKey(
        'Season', on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions'
    )
    catchup_cutoff_weeks = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='No catch-up bookings accepted after this many weeks into the season. Leave blank to allow catch-ups any time.'
    )
    first_timer_headline = models.CharField(
        max_length=200, blank=True,
        help_text='Short headline shown to students booking this class for the first time.'
    )
    first_timer_body = models.TextField(
        blank=True,
        help_text='Detailed info shown to first-time students after they book this class.'
    )
    description = models.TextField(blank=True)
    skill_level = models.ForeignKey(
        'users.SkillLevel', on_delete=models.SET_NULL, null=True, blank=True, related_name='class_sessions'
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f'{self.name} — {self.get_day_of_week_display()} {self.start_time:%H:%M} · {self.studio}'

    @property
    def enrolled_count(self):
        return self.enrolments.filter(status='active').count()


class ClassOccurrence(models.Model):
    """A specific dated instance of a ClassSession."""

    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name='occurrences')
    date = models.DateField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.SCHEDULED)
    substitute_instructor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='substitute_occurrences'
    )
    notes = models.TextField(blank=True)
    register_saved = models.BooleanField(default=False)
    cover_needed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date']
        unique_together = [('session', 'date')]

    def __str__(self):
        return f'{self.session.name} — {self.date}'


class ClassUpsell(models.Model):
    source_session = models.ForeignKey(
        ClassSession, on_delete=models.CASCADE, related_name='upsells'
    )
    suggested_session = models.ForeignKey(
        ClassSession, on_delete=models.CASCADE, related_name='upsell_suggestions'
    )
    headline = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        unique_together = [('source_session', 'suggested_session')]

    def __str__(self):
        return f'Upsell: {self.source_session.name} → {self.suggested_session.name}'


class Season(models.Model):
    class Status(models.TextChoices):
        UPCOMING = 'upcoming', 'Upcoming'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'

    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.UPCOMING)
    bookings_open = models.BooleanField(default=False)
    # go_live_at: if set, bookings auto-open at this UTC datetime; overrides bookings_open=False
    go_live_at = models.DateTimeField(null=True, blank=True)
    # bookings_enabled: admin kill-switch for season enrolments (does not affect casuals)
    bookings_enabled = models.BooleanField(default=True)
    archived = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # Per-season discount tiers: {"2": 100, "3": 130, ...} — discount off base price for nth class
    # If blank, falls back to StudioSettings.season_discount_tiers then system default
    discount_tiers = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name


class Locker(models.Model):
    LOCKER_TYPE_CHOICES = [
        ('complimentary', 'Complimentary'),
        ('paid', 'Paid'),
    ]
    PAYMENT_TYPE_CHOICES = [
        ('4_class_perk', '4-Class Perk'),
        ('cash', 'Cash'),
        ('card', 'Card'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('unpaid', 'Unpaid'),
        ('waived', 'Waived'),
        ('invoiced', 'Invoiced'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending_return', 'Pending Return'),
    ]

    number = models.PositiveIntegerField(unique=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='lockers')
    notes = models.TextField(blank=True)
    expires_at = models.DateField(null=True, blank=True)
    assigned_at = models.DateField(null=True, blank=True)
    key_issued = models.BooleanField(default=False)
    key_returned = models.BooleanField(default=False)
    key_lost = models.BooleanField(default=False)
    locker_type = models.CharField(max_length=20, choices=LOCKER_TYPE_CHOICES, default='complimentary')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, blank=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    key_lost_fee_paid = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        ordering = ['number']

    def __str__(self):
        return f'Locker #{self.number}'


class PracticeSlot(models.Model):
    """A bookable practice time slot in a studio."""

    studio = models.ForeignKey(Studio, on_delete=models.CASCADE, related_name='practice_slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    capacity = models.PositiveIntegerField(default=6)
    is_active = models.BooleanField(default=True)
    notes = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    ENROLLED_RATE = 20   # $/hr for enrolled students
    NON_ENROLLED_RATE = 30  # $/hr for non-enrolled

    class Meta:
        ordering = ['date', 'start_time']
        unique_together = [('studio', 'date', 'start_time')]

    def __str__(self):
        return f'{self.studio} practice — {self.date} {self.start_time:%H:%M}–{self.end_time:%H:%M}'

    @property
    def duration_hours(self):
        from datetime import datetime
        start = datetime.combine(self.date, self.start_time)
        end = datetime.combine(self.date, self.end_time)
        return (end - start).seconds / 3600

    @property
    def booked_count(self):
        return self.bookings.filter(status='confirmed').count()

    @property
    def spots_left(self):
        return max(0, self.capacity - self.booked_count)


class PracticeBooking(models.Model):
    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'

    slot = models.ForeignKey(PracticeSlot, on_delete=models.CASCADE, related_name='bookings')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='practice_bookings')
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.CONFIRMED)
    price_charged = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_free = models.BooleanField(default=False)
    payment_type = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('slot', 'student')]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.display_name} → {self.slot}'


class PracticeCredit(models.Model):
    """A prepaid practice session credit for a student."""
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        USED = 'used', 'Used'
        EXPIRED = 'expired', 'Expired'

    student = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='practice_credits')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    notes = models.CharField(max_length=200, blank=True)  # e.g. "4-session prepay pack"
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='practice_credits_issued')
    used_for_booking = models.OneToOneField(PracticeBooking, on_delete=models.SET_NULL, null=True, blank=True, related_name='practice_credit')
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Practice credit for {self.student.display_name} ({self.status})'


class CasualBooking(models.Model):
    """A booking for a specific class occurrence — used for casual drop-ins and catch-ups."""

    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', 'Confirmed'
        WAITLISTED = 'waitlisted', 'Waitlisted'
        CANCELLED = 'cancelled', 'Cancelled'

    occurrence = models.ForeignKey(ClassOccurrence, on_delete=models.CASCADE, related_name='casual_bookings')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='casual_bookings')
    enrolment_type = models.CharField(
        max_length=12,
        choices=[('casual', 'Casual'), ('catchup', 'Catchup'), ('classpass', 'Class Pass')],
        default='casual',
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.CONFIRMED)
    price_charged = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_free = models.BooleanField(default=False)
    waitlist_offered_at = models.DateTimeField(null=True, blank=True)
    waitlist_expires_at = models.DateTimeField(null=True, blank=True)
    displacement_offered_at = models.DateTimeField(null=True, blank=True)
    displacement_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('occurrence', 'student')]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.display_name} → {self.occurrence} ({self.enrolment_type})'


class ClassChatMessage(models.Model):
    session = models.ForeignKey('ClassSession', on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='class_chat_messages')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender} → session {self.session_id}: {self.body[:40]}'


class KisiGrant(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kisi_grants')
    studio = models.ForeignKey(Studio, on_delete=models.SET_NULL, null=True, blank=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    kisi_link_id = models.CharField(max_length=100, blank=True)
    link_sent = models.BooleanField(default=False)
    unlocked = models.BooleanField(default=False)
    revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.display_name} → {self.studio} {self.valid_from:%d %b %H:%M}–{self.valid_until:%H:%M}'


class Workshop(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    instructor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='workshops')
    studio = models.ForeignKey('Studio', on_delete=models.SET_NULL, null=True, blank=True, related_name='workshops')
    price = models.DecimalField(max_digits=8, decimal_places=2)
    capacity = models.PositiveIntegerField(default=12)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'start_time']

    def __str__(self):
        return f'{self.name} — {self.date}'

    @property
    def enrolled_count(self):
        return self.bookings.filter(status='confirmed').count()

    @property
    def spots_left(self):
        return max(0, self.capacity - self.enrolled_count)


class WorkshopBooking(models.Model):
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name='bookings')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workshop_bookings')
    status = models.CharField(max_length=20, default='confirmed', choices=[('confirmed', 'Confirmed'), ('waitlisted', 'Waitlisted'), ('cancelled', 'Cancelled')])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('workshop', 'student')]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student} → {self.workshop}'


class SeasonNotificationInterest(models.Model):
    """Records interest in being notified when casual/trial bookings open for an upcoming season."""
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='notification_interests')
    email = models.EmailField()
    first_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('season', 'email')]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} → {self.season}'
