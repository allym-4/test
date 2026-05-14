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
