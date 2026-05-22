from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from datetime import timedelta, datetime
import pytz


SYDNEY_TZ = pytz.timezone('Australia/Sydney')


def _html_email(instructor_name, class_name, day_str, time_str):
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;">
              <span style="font-family:'Arial Black',Arial,sans-serif;font-size:15px;letter-spacing:4px;color:#ccff00;">DUALITY</span>
              <span style="font-family:'Arial Black',Arial,sans-serif;font-size:15px;letter-spacing:4px;color:#ffffff;"> POLE</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111111;border:1px solid #222222;border-radius:12px;padding:32px;">

              <!-- Icon + heading -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:20px;">
                    <div style="display:inline-block;background:rgba(204,255,0,0.1);border:1px solid rgba(204,255,0,0.25);border-radius:8px;padding:10px 14px;font-size:20px;line-height:1;">📋</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Attendance not marked</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0;font-size:14px;color:#888888;line-height:1.5;">Hi {instructor_name}, this is a reminder to save the register.</p>
                  </td>
                </tr>
              </table>

              <!-- Class detail pill -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555555;">Class</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#ffffff;">{class_name}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#888888;">{day_str} &nbsp;·&nbsp; {time_str}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="https://dualitypole.com/classes"
                       style="display:block;background:#ccff00;color:#000000;text-align:center;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.5px;padding:14px 24px;border-radius:8px;">
                      Mark Attendance →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#444444;">Duality Pole Studio &nbsp;·&nbsp; intrigued@dualitypole.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


class Command(BaseCommand):
    help = 'Notify instructors when a past class has no attendance marked'

    def handle(self, *args, **options):
        from apps.classes.models import ClassOccurrence
        from apps.users.models import Notification

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
                action_url='/classes',
            )

            if instructor.email:
                plain = (
                    f'Hi {instructor.first_name},\n\n'
                    f'The register for {occ.session.name} on {day_str} at {time_str} '
                    f"hasn't been saved yet.\n\n"
                    f'Please log in and mark attendance as soon as possible.\n\n'
                    f'Duality Pole Studio\n'
                    f'https://dualitypole.com/classes'
                )
                html = _html_email(instructor.first_name, occ.session.name, day_str, time_str)
                msg = EmailMultiAlternatives(
                    subject=f'Reminder: mark attendance for {occ.session.name}',
                    body=plain,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[instructor.email],
                )
                msg.attach_alternative(html, 'text/html')
                msg.send(fail_silently=True)

            alerted += 1

        self.stdout.write(f'Sent unmarked-attendance alerts for {alerted} class(es).')
