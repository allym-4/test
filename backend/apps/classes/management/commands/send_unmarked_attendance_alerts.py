from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, datetime
import pytz


SYDNEY_TZ = pytz.timezone('Australia/Sydney')


class Command(BaseCommand):
    help = 'Notify instructors when a past class has no attendance marked'

    def handle(self, *args, **options):
        from apps.classes.models import ClassOccurrence
        from apps.users.models import Notification
        from apps.email_utils import send_studio_email

        now = timezone.now()
        today = now.astimezone(SYDNEY_TZ).date()
        lookback = today - timedelta(days=7)

        occurrences = ClassOccurrence.objects.filter(
            date__gte=lookback,
            date__lte=today,
            register_saved=False,
            status='scheduled',
        ).select_related('session', 'session__instructor', 'substitute_instructor')

        alerted = 0

        for occ in occurrences:
            class_start = SYDNEY_TZ.localize(
                datetime.combine(occ.date, occ.session.start_time)
            )
            if now < class_start + timedelta(hours=6):
                continue

            instructor = occ.substitute_instructor or occ.session.instructor
            if not instructor:
                continue

            already_notified = Notification.objects.filter(
                recipient=instructor,
                notification_type='reminder',
                title__contains='Attendance not marked',
                body__contains=occ.session.name,
                body__contains=str(occ.date),
            ).exists()
            if already_notified:
                continue

            day_str = occ.date.strftime('%-d %B')
            time_str = occ.session.start_time.strftime('%I:%M %p').lstrip('0')

            Notification.objects.create(
                recipient=instructor,
                title='Attendance not marked',
                body=(
                    f'The register for {occ.session.name} on {day_str} at {time_str} '
                    f'has not been saved. Please mark attendance as soon as possible.'
                ),
                notification_type='reminder',
                action_label='View Classes',
                action_url='/portal/classes',
            )

            if instructor.email:
                send_studio_email(
                    to=instructor.email,
                    subject=f'Reminder: mark attendance for {occ.session.name}',
                    heading='Attendance not marked',
                    subheading=f'Hi {instructor.first_name}, this is a reminder to save the register.',
                    body_html=f"""
                        <table width="100%" cellpadding="0" cellspacing="0"
                               style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
                          <tr>
                            <td style="padding:16px 20px;">
                              <p style="margin:0 0 2px;font-size:11px;text-transform:uppercase;
                                        letter-spacing:0.08em;color:#9ca3af;">Class</p>
                              <p style="margin:0;font-size:16px;font-weight:600;color:#111111;">{occ.session.name}</p>
                              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">{day_str} &nbsp;&bull;&nbsp; {time_str}</p>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:16px 0 0;font-size:14px;color:#6b7280;">
                          Once you've marked attendance, this reminder won't appear again.
                        </p>
                    """,
                    cta_label='Mark Attendance',
                    cta_url='https://dualitypole.com/classes',
                )

            alerted += 1

        self.stdout.write(f'Sent unmarked-attendance alerts for {alerted} class(es).')
