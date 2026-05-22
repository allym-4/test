"""
Shared HTML email template for Duality Pole Studio.
Usage:
    from apps.email_utils import send_studio_email
    send_studio_email(
        to='instructor@example.com',
        subject='Your subject',
        heading='Heading text',
        body_html='<p>Body content with <strong>HTML</strong>.</p>',
        cta_label='Go somewhere',   # optional
        cta_url='https://...',       # optional
    )
"""

from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def _build_html(heading, body_html, cta_label=None, cta_url=None, subheading=None):
    cta_block = ''
    if cta_label and cta_url:
        cta_block = f"""
        <tr>
          <td style="padding-top:24px;">
            <a href="{cta_url}"
               style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;
                      font-size:14px;font-weight:600;padding:13px 28px;border-radius:8px;
                      letter-spacing:0.3px;">
              {cta_label} &rarr;
            </a>
          </td>
        </tr>"""

    subheading_block = ''
    if subheading:
        subheading_block = f"""
        <tr>
          <td style="padding-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#666666;line-height:1.6;">{subheading}</p>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 32px;border-radius:12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:'Arial Black',Arial,sans-serif;font-size:14px;
                                 letter-spacing:4px;color:#ccff00;font-weight:900;">DUALITY</span>
                    <span style="font-family:'Arial Black',Arial,sans-serif;font-size:14px;
                                 letter-spacing:4px;color:#ffffff;font-weight:900;"> POLE</span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#555555;letter-spacing:0.5px;text-transform:uppercase;">Studio Portal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background:#ffffff;padding:36px 32px;border-radius:0 0 12px 12px;
                       border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Heading -->
                <tr>
                  <td style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#111111;line-height:1.3;">{heading}</h1>
                  </td>
                </tr>

                {subheading_block}

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="height:1px;background:#f0f0f0;"></div>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="font-size:15px;color:#374151;line-height:1.7;">
                    {body_html}
                  </td>
                </tr>

                {cta_block}

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">
                Duality Pole Studio &nbsp;&bull;&nbsp; <a href="mailto:intrigued@dualitypole.com" style="color:#9ca3af;text-decoration:none;">intrigued@dualitypole.com</a>
              </p>
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                <a href="https://dualitypole.com" style="color:#9ca3af;text-decoration:none;">dualitypole.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_studio_email(to, subject, heading, body_html, plain_text=None,
                      cta_label=None, cta_url=None, subheading=None):
    """Send a branded HTML email. Falls back to plain_text if provided."""
    html = _build_html(heading, body_html, cta_label=cta_label, cta_url=cta_url, subheading=subheading)

    if plain_text is None:
        import re
        plain_text = re.sub(r'<[^>]+>', '', body_html).strip()
        if cta_label and cta_url:
            plain_text += f'\n\n{cta_label}: {cta_url}'
        plain_text += '\n\nDuality Pole Studio\nhttps://dualitypole.com'

    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to] if isinstance(to, str) else to,
    )
    msg.attach_alternative(html, 'text/html')
    msg.send(fail_silently=True)
