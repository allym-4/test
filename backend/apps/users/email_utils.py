from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings


def send_branded_email(to_email, subject, template_name, context):
    """Send a branded HTML email with plain-text fallback."""
    context.setdefault('subject', subject)
    html_content = render_to_string(f'emails/{template_name}.html', context)
    plain_content = context.get('plain_text', '')
    if not plain_content:
        # Fallback: strip basic HTML tags
        import re
        plain_content = re.sub(r'<[^>]+>', '', html_content)
        plain_content = re.sub(r'\n\s*\n', '\n\n', plain_content).strip()

    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    msg.attach_alternative(html_content, 'text/html')
    msg.send(fail_silently=True)
