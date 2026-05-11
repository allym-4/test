"""Gmail utilities: send fallback alerts to the studio owner and auto-reply to client emails."""

import imaplib
import smtplib
import email
import time
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from datetime import datetime

logger = logging.getLogger(__name__)


def _smtp_connection(gmail_address: str, app_password: str) -> smtplib.SMTP_SSL:
    smtp = smtplib.SMTP_SSL("smtp.gmail.com", 465)
    smtp.login(gmail_address, app_password)
    return smtp


def send_fallback_alert(
    gmail_address: str,
    app_password: str,
    owner_email: str,
    client_message: str,
    channel: str,
    client_identifier: str = "Unknown",
) -> None:
    """Email the studio owner when the bot can't answer a question."""
    subject = f"[Help Desk] Unanswered question via {channel}"
    body = f"""\
Hi Duality team,

A client asked a question the help desk couldn't confidently answer.

Channel:  {channel}
Client:   {client_identifier}
Time:     {datetime.now().strftime("%d %b %Y %H:%M")}

--- Their message ---
{client_message}
--------------------

Please follow up directly when you get a chance.

— Duality Help Desk Bot
"""
    msg = MIMEText(body, "plain")
    msg["Subject"] = subject
    msg["From"] = gmail_address
    msg["To"] = owner_email

    with _smtp_connection(gmail_address, app_password) as smtp:
        smtp.sendmail(gmail_address, owner_email, msg.as_string())
    logger.info("Fallback alert sent to %s", owner_email)


def send_reply(
    gmail_address: str,
    app_password: str,
    to_address: str,
    subject: str,
    body: str,
    reply_to_message_id: str | None = None,
) -> None:
    """Send an email reply from the studio Gmail account."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject if subject.startswith("Re:") else f"Re: {subject}"
    msg["From"] = f"Duality Pole <{gmail_address}>"
    msg["To"] = to_address
    if reply_to_message_id:
        msg["In-Reply-To"] = reply_to_message_id
        msg["References"] = reply_to_message_id

    msg.attach(MIMEText(body, "plain"))

    with _smtp_connection(gmail_address, app_password) as smtp:
        smtp.sendmail(gmail_address, to_address, msg.as_string())
    logger.info("Reply sent to %s", to_address)


# ---------------------------------------------------------------------------
# Inbox poller
# ---------------------------------------------------------------------------

def _decode_header_value(value: str) -> str:
    parts = decode_header(value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(part)
    return "".join(decoded)


def _get_text_body(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and not part.get("Content-Disposition"):
                payload = part.get_payload(decode=True)
                return payload.decode(part.get_content_charset() or "utf-8", errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            return payload.decode(msg.get_content_charset() or "utf-8", errors="replace")
    return ""


def poll_inbox_and_reply(
    gmail_address: str,
    app_password: str,
    owner_email: str,
    answer_fn,  # Callable[[str], tuple[str, bool]]  — returns (answer_text, was_confident)
    poll_interval_seconds: int = 60,
) -> None:
    """
    Continuously poll the Gmail inbox for unread emails and auto-reply.
    answer_fn(question) -> (answer, confident): call the AI and return the answer + whether
    it was confident enough to answer without escalating.
    """
    logger.info("Email poller started. Checking every %ds.", poll_interval_seconds)

    while True:
        try:
            with imaplib.IMAP4_SSL("imap.gmail.com") as imap:
                imap.login(gmail_address, app_password)
                imap.select("INBOX")

                _, message_numbers = imap.search(None, "UNSEEN")
                for num in message_numbers[0].split():
                    _, msg_data = imap.fetch(num, "(RFC822)")
                    raw = msg_data[0][1]
                    msg = email.message_from_bytes(raw)

                    from_addr = _decode_header_value(msg.get("From", ""))
                    subject = _decode_header_value(msg.get("Subject", "(no subject)"))
                    message_id = msg.get("Message-ID")
                    body = _get_text_body(msg)

                    if not body.strip():
                        continue

                    logger.info("Processing email from %s: %s", from_addr, subject)

                    answer, confident = answer_fn(body)

                    if confident:
                        reply_body = (
                            f"{answer}\n\n"
                            "—\n"
                            "Duality Pole Help Desk\n"
                            "intrigued@dualitypole.com | (02) 9160 0223\n"
                            "Level 1, 88 Kippax St, Surry Hills NSW 2010"
                        )
                        send_reply(
                            gmail_address, app_password,
                            to_address=from_addr,
                            subject=subject,
                            body=reply_body,
                            reply_to_message_id=message_id,
                        )
                    else:
                        # Auto-acknowledge to the client, alert the owner
                        ack_body = (
                            "Hi there,\n\n"
                            "Thanks for reaching out to Duality Pole! We've received your message "
                            "and one of our team will get back to you shortly.\n\n"
                            "In the meantime, you might find what you need in our Student Handbook:\n"
                            "https://www.dualitypole.com/student-handbook\n\n"
                            "—\n"
                            "Duality Pole\n"
                            "intrigued@dualitypole.com | (02) 9160 0223"
                        )
                        send_reply(
                            gmail_address, app_password,
                            to_address=from_addr,
                            subject=subject,
                            body=ack_body,
                            reply_to_message_id=message_id,
                        )
                        send_fallback_alert(
                            gmail_address, app_password, owner_email,
                            client_message=body,
                            channel="Email",
                            client_identifier=from_addr,
                        )

        except Exception as exc:
            logger.error("Email poller error: %s", exc)

        time.sleep(poll_interval_seconds)
