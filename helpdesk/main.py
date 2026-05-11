"""
Duality Pole — Virtual Help Desk
FastAPI backend serving:
  POST /chat            — website chat widget
  POST /instagram       — Instagram DM webhook (verification + messages)
  GET  /instagram       — Instagram webhook verification handshake
  POST /admin/refresh-knowledge — re-scrape website knowledge
"""

import hashlib
import hmac
import logging
import os
import threading
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

load_dotenv()

from ai_engine import answer_question
from email_handler import poll_inbox_and_reply, send_fallback_alert
from knowledge_base import refresh_from_website

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
STUDIO_OWNER_EMAIL = os.environ.get("STUDIO_OWNER_EMAIL", "")
INSTAGRAM_VERIFY_TOKEN = os.environ.get("INSTAGRAM_VERIFY_TOKEN", "")
INSTAGRAM_PAGE_ACCESS_TOKEN = os.environ.get("INSTAGRAM_PAGE_ACCESS_TOKEN", "")
INSTAGRAM_APP_SECRET = os.environ.get("INSTAGRAM_APP_SECRET", "")


# ---------------------------------------------------------------------------
# Lifespan — start background email poller
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    if GMAIL_ADDRESS and GMAIL_APP_PASSWORD and STUDIO_OWNER_EMAIL:
        def _answer_fn(question: str):
            return answer_question(question)

        thread = threading.Thread(
            target=poll_inbox_and_reply,
            kwargs=dict(
                gmail_address=GMAIL_ADDRESS,
                app_password=GMAIL_APP_PASSWORD,
                owner_email=STUDIO_OWNER_EMAIL,
                answer_fn=_answer_fn,
                poll_interval_seconds=60,
            ),
            daemon=True,
        )
        thread.start()
        logger.info("Email poller thread started.")
    else:
        logger.warning("Gmail credentials not configured — email poller disabled.")
    yield


app = FastAPI(title="Duality Pole Help Desk", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.dualitypole.com", "http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------------------
# /chat — website chat widget endpoint
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
    escalated: bool


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    answer, confident = answer_question(req.message)

    if not confident:
        escalation_msg = (
            "Great question — this one's a bit outside what I can answer right now! "
            "I've flagged it for the Duality team and they'll follow up with you soon. "
            "For urgent queries, email intrigued@dualitypole.com or DM us on Instagram @dualitypole.\n\n"
            "— Duality Pole Help Desk"
        )
        if GMAIL_ADDRESS and GMAIL_APP_PASSWORD and STUDIO_OWNER_EMAIL:
            try:
                send_fallback_alert(
                    GMAIL_ADDRESS, GMAIL_APP_PASSWORD, STUDIO_OWNER_EMAIL,
                    client_message=req.message,
                    channel="Website Chat",
                )
            except Exception as exc:
                logger.error("Failed to send fallback alert: %s", exc)
        return ChatResponse(answer=escalation_msg, escalated=True)

    return ChatResponse(answer=answer, escalated=False)


# ---------------------------------------------------------------------------
# /instagram — Instagram DM webhook
# ---------------------------------------------------------------------------

def _verify_instagram_signature(body: bytes, signature_header: str) -> bool:
    if not INSTAGRAM_APP_SECRET or not signature_header:
        return True  # Skip verification if secret not configured
    expected = "sha256=" + hmac.new(
        INSTAGRAM_APP_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


async def _send_instagram_reply(recipient_id: str, message_text: str) -> None:
    """Send a message back to an Instagram user via the Messenger API."""
    import httpx

    url = f"https://graph.facebook.com/v19.0/me/messages"
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": message_text},
    }
    headers = {"Authorization": f"Bearer {INSTAGRAM_PAGE_ACCESS_TOKEN}"}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            logger.error("Instagram reply failed: %s %s", resp.status_code, resp.text)


@app.get("/instagram")
async def instagram_verify(request: Request):
    """Handle Meta webhook verification handshake."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == INSTAGRAM_VERIFY_TOKEN:
        logger.info("Instagram webhook verified.")
        return Response(content=challenge, media_type="text/plain")

    raise HTTPException(status_code=403, detail="Webhook verification failed.")


@app.post("/instagram")
async def instagram_webhook(request: Request):
    """Receive Instagram DM events and reply."""
    body = await request.body()
    sig = request.headers.get("X-Hub-Signature-256", "")

    if not _verify_instagram_signature(body, sig):
        raise HTTPException(status_code=403, detail="Invalid signature.")

    data = await request.json()

    for entry in data.get("entry", []):
        for messaging in entry.get("messaging", []):
            sender_id = messaging.get("sender", {}).get("id")
            message = messaging.get("message", {})
            text = message.get("text", "").strip()

            if not text or not sender_id:
                continue

            logger.info("Instagram DM from %s: %s", sender_id, text[:80])
            answer, confident = answer_question(text)

            if confident:
                reply = answer
            else:
                reply = (
                    "Hey! This one's a bit tricky for me to answer — "
                    "I've let the Duality team know and they'll be in touch soon! "
                    "You can also email intrigued@dualitypole.com for a quicker response. 💕"
                )
                if GMAIL_ADDRESS and GMAIL_APP_PASSWORD and STUDIO_OWNER_EMAIL:
                    try:
                        send_fallback_alert(
                            GMAIL_ADDRESS, GMAIL_APP_PASSWORD, STUDIO_OWNER_EMAIL,
                            client_message=text,
                            channel="Instagram DM",
                            client_identifier=f"Instagram user {sender_id}",
                        )
                    except Exception as exc:
                        logger.error("Failed to send fallback alert: %s", exc)

            await _send_instagram_reply(sender_id, reply)

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# /admin/refresh-knowledge
# ---------------------------------------------------------------------------

@app.post("/admin/refresh-knowledge")
async def refresh_knowledge():
    result = refresh_from_website()
    return {"result": result}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Duality Pole Help Desk"}
