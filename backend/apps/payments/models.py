from django.db import models
from django.db.models import Sum
from apps.users.models import User


class Payment(models.Model):
    class PaymentType(models.TextChoices):
        PAYMENT = 'payment', 'Payment'
        CHARGE = 'charge', 'Charge'
        REFUND = 'refund', 'Refund'
        CREDIT = 'credit', 'Credit'
        NO_SHOW_FEE = 'no_show_fee', 'No-show Fee'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    payment_type = models.CharField(max_length=15, choices=PaymentType.choices)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    description = models.CharField(max_length=200)
    reference = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='payments_recorded'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.display_name} · {self.payment_type} · ${self.amount}'

    @property
    def is_credit(self):
        return self.payment_type in (self.PaymentType.PAYMENT, self.PaymentType.REFUND, self.PaymentType.CREDIT)


class PaymentPlan(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_plans')
    description = models.CharField(max_length=200)
    total_amount = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='payment_plans_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.display_name} · {self.description}'

    @property
    def amount_paid(self):
        return self.instalments.filter(status=PaymentPlanInstalment.Status.PAID).aggregate(
            total=Sum('amount')
        )['total'] or 0

    @property
    def amount_remaining(self):
        return self.total_amount - self.amount_paid


class PaymentPlanInstalment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'

    plan = models.ForeignKey(PaymentPlan, on_delete=models.CASCADE, related_name='instalments')
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f'{self.plan} · Instalment ${self.amount} due {self.due_date}'


class Package(models.Model):
    name = models.CharField(max_length=100)
    num_classes = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    expiry_days = models.PositiveIntegerField(default=90)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.num_classes} classes)'


class StudentPackage(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='packages')
    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='purchases')
    classes_remaining = models.PositiveIntegerField()
    purchased_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-purchased_at']

    def __str__(self):
        return f'{self.student} · {self.package} · {self.classes_remaining} remaining'


class MembershipType(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration = models.CharField(max_length=50)
    classes_per_week = models.CharField(max_length=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class GiftCard(models.Model):
    code = models.CharField(max_length=20, unique=True)
    value = models.DecimalField(max_digits=8, decimal_places=2)
    balance = models.DecimalField(max_digits=8, decimal_places=2)
    issued_to_name = models.CharField(max_length=100, blank=True)
    issued_to_email = models.EmailField(blank=True)
    purchased_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='gift_cards_purchased'
    )
    redeemed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='gift_cards_redeemed'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Gift Card {self.code} (${self.balance} remaining)'


class PromoCode(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Percentage'
        FIXED = 'fixed', 'Fixed Amount'

    class AppliesTo(models.TextChoices):
        ALL = 'all', 'All Classes'
        SEASON = 'season', 'Season Enrolment'
        CASUAL = 'casual', 'Casual / Drop-in'
        WORKSHOP = 'workshop', 'Workshops & Events'

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    applies_to = models.CharField(max_length=20, choices=AppliesTo.choices, default=AppliesTo.ALL)
    max_uses = models.PositiveIntegerField(null=True, blank=True)  # null = unlimited
    current_uses = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.code
