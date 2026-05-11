"""Loads studio knowledge from the markdown file and optionally refreshes from the website."""

import os
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

KNOWLEDGE_FILE = Path(__file__).parent / "knowledge" / "studio_knowledge.md"
STUDIO_URLS = [
    "https://www.dualitypole.com",
    "https://www.dualitypole.com/student-handbook",
]


def load_knowledge() -> str:
    """Return the current knowledge base text."""
    if KNOWLEDGE_FILE.exists():
        return KNOWLEDGE_FILE.read_text(encoding="utf-8")
    return ""


def _scrape_url(url: str) -> str:
    """Attempt to scrape plain text from a URL. Returns empty string on failure."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; DualityPoleHelpDesk/1.0)"
        )
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
    except Exception:
        return ""

    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "head"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    # Collapse excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text.strip())
    return text


def refresh_from_website() -> str:
    """
    Try to scrape the studio website and append any new content to the knowledge file.
    Returns a status message.
    """
    scraped_sections = []
    for url in STUDIO_URLS:
        content = _scrape_url(url)
        if content:
            scraped_sections.append(f"## Scraped from {url}\n\n{content}")

    if not scraped_sections:
        return "Could not scrape website (site may block bots). Add content manually to knowledge/studio_knowledge.md."

    scraped_block = "\n\n---\n\n".join(scraped_sections)
    header = "\n\n---\n\n# Auto-scraped Website Content\n\n"
    existing = KNOWLEDGE_FILE.read_text(encoding="utf-8") if KNOWLEDGE_FILE.exists() else ""

    # Replace any previous auto-scraped block
    if "# Auto-scraped Website Content" in existing:
        existing = existing.split("# Auto-scraped Website Content")[0].rstrip()

    updated = existing + header + scraped_block
    KNOWLEDGE_FILE.write_text(updated, encoding="utf-8")
    return f"Refreshed knowledge from {len(scraped_sections)} page(s)."
