# Duality Pole — Virtual Help Desk

Answers client questions automatically across three channels:
- **Website chat widget** (floating chat bubble)
- **Email** (auto-replies via Gmail, alerts you when the bot can't answer)
- **Instagram DMs** (webhook auto-replies)

Powered by Claude AI (Anthropic) using your studio's own knowledge base.

---

## Project Structure

```
helpdesk/
├── main.py                  # FastAPI app — all endpoints
├── ai_engine.py             # Claude AI question-answering logic
├── email_handler.py         # Gmail send/receive/poll
├── knowledge_base.py        # Load & refresh studio knowledge
├── knowledge/
│   └── studio_knowledge.md  # ← YOUR STUDIO CONTENT (edit this!)
├── widget/
│   └── chat-widget.html     # Embeddable chat widget (copy the <script> tag)
├── handlers/
│   └── instagram_setup.md   # Step-by-step Instagram webhook setup
├── .env.example             # Copy to .env and fill in
└── requirements.txt
```

---

## Quick Start

### 1. Install dependencies
```bash
cd helpdesk
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your API keys (see below)
```

### 3. Update your knowledge base
Edit `knowledge/studio_knowledge.md` with your studio's current info.
Keep it updated — the bot answers directly from this file.

### 4. Run the server
```bash
uvicorn main:app --reload --port 8000
```

Server runs at `http://localhost:8000`.

---

## Environment Variables (.env)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Get from https://console.anthropic.com |
| `GMAIL_ADDRESS` | Your studio Gmail address |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not your login password — see below) |
| `STUDIO_OWNER_EMAIL` | Where fallback alerts get sent (can be the same as GMAIL_ADDRESS) |
| `INSTAGRAM_VERIFY_TOKEN` | Any random string you choose (used to verify the Meta webhook) |
| `INSTAGRAM_PAGE_ACCESS_TOKEN` | From Meta Developer portal |
| `INSTAGRAM_APP_SECRET` | From Meta Developer portal |

### Getting a Gmail App Password
1. Go to your Google Account → Security.
2. Enable **2-Step Verification** (required).
3. Go to **App Passwords** → create one for "Mail".
4. Copy the 16-character password into `GMAIL_APP_PASSWORD`.

---

## Embedding the Chat Widget on Your Website

1. Open `widget/chat-widget.html`.
2. Copy everything between the `COPY EVERYTHING FROM HERE` comments (the `<script>` block).
3. Paste it just before `</body>` in your website's HTML.
4. Update `HELPDESK_URL` to your deployed server's URL.

If your site is on Squarespace/Wix, paste the script into a **Code Block** or **Embed** element.

---

## Deploying to Production

The server needs to be publicly accessible (HTTPS required for Instagram webhooks).

Recommended free/cheap options:
- **[Railway](https://railway.app)** — easiest, free tier available
- **[Render](https://render.com)** — free tier, sleeps after inactivity
- **[Fly.io](https://fly.io)** — generous free tier

Basic deployment (Railway example):
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## How It Works

1. **Client sends a message** (chat widget, email, or Instagram DM).
2. **Claude reads your knowledge base** and tries to answer.
3. If confident → replies directly with the answer.
4. If not confident → sends the client a polite "we'll get back to you" message and **emails you** with their question.

### Refreshing Knowledge
If you update your website, you can refresh the scraped content:
```bash
curl -X POST http://localhost:8000/admin/refresh-knowledge
```
Or just edit `knowledge/studio_knowledge.md` directly — that's always the most reliable method.

---

## Instagram DM Setup
See `handlers/instagram_setup.md` for step-by-step instructions.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Chat widget — `{"message": "..."}` → `{"answer": "...", "escalated": false}` |
| `GET` | `/instagram` | Instagram webhook verification handshake |
| `POST` | `/instagram` | Instagram DM events |
| `POST` | `/admin/refresh-knowledge` | Re-scrape website and update knowledge |
| `GET` | `/health` | Health check |
