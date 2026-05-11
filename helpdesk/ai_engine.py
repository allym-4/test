"""Core AI logic: answer questions using Claude + the studio knowledge base."""

import logging
import os

import anthropic

from knowledge_base import load_knowledge

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """\
You are the friendly virtual help desk assistant for Duality Pole, a pole dancing studio in Surry Hills, Sydney.

Your job is to answer client questions accurately using only the studio knowledge provided below.
Be warm, helpful, and on-brand — Duality has a fun, inclusive, body-positive vibe.

RULES:
1. Answer only from the knowledge provided. Do not invent policies, prices, or class details.
2. If a question is clearly answered by the knowledge, answer it confidently.
3. If the question is NOT covered, or you are genuinely unsure, reply EXACTLY with:
   ESCALATE: <brief reason why you can't answer>
4. Keep answers concise and friendly. Use plain text (no markdown).
5. Always sign off as: — Duality Pole Help Desk

STUDIO KNOWLEDGE:
{knowledge}
"""

CONFIDENCE_THRESHOLD = "ESCALATE:"


def _build_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set.")
    return anthropic.Anthropic(api_key=api_key)


def answer_question(question: str) -> tuple[str, bool]:
    """
    Ask Claude to answer a client question.
    Returns (answer_text, was_confident).
    If was_confident is False, the caller should escalate to the studio owner.
    """
    knowledge = load_knowledge()
    system = SYSTEM_PROMPT.format(knowledge=knowledge)

    client = _build_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=system,
        messages=[{"role": "user", "content": question}],
    )

    answer = response.content[0].text.strip()
    confident = not answer.startswith(CONFIDENCE_THRESHOLD)

    if not confident:
        reason = answer[len(CONFIDENCE_THRESHOLD):].strip()
        logger.info("Escalating question. Reason: %s | Question: %s", reason, question[:120])

    return answer, confident
