# Instagram DM Webhook Setup

To enable auto-replies to Instagram DMs, you need a Meta (Facebook) Developer app.
This is a one-time setup that takes about 20–30 minutes.

## Steps

### 1. Create a Meta Developer App
1. Go to https://developers.facebook.com and log in with the Facebook account linked to your Duality page.
2. Click **My Apps → Create App**.
3. Select **Business** as the app type.
4. Fill in the name (e.g. "Duality Help Desk") and contact email.

### 2. Add Instagram Messaging to the App
1. In your app dashboard, click **Add Products**.
2. Find **Instagram** and click **Set Up**.
3. Under **Instagram → Settings**, link your Instagram Business account (you may need to connect it to a Facebook Page first).

### 3. Set Up the Webhook
1. In the left menu: **Instagram → Webhooks**.
2. Click **Add Callback URL**.
3. Callback URL: `https://your-helpdesk-server.com/instagram`
4. Verify Token: use the same value you set in `.env` as `INSTAGRAM_VERIFY_TOKEN`
5. Click **Verify and Save** — your server must be running for this step.
6. Subscribe to the **messages** field.

### 4. Get Your Page Access Token
1. Go to **Instagram → Roles → Generate Access Token**.
2. Select your Instagram account and grant the required permissions.
3. Copy the token and set it as `INSTAGRAM_PAGE_ACCESS_TOKEN` in your `.env`.

### 5. Get Your App Secret
1. Go to **Settings → Basic**.
2. Copy the **App Secret** and set it as `INSTAGRAM_APP_SECRET` in your `.env`.

### 6. Enable Live Mode
Once testing is done, switch your app from **Development** to **Live** mode
so that any Instagram user (not just test users) can trigger the webhook.

---

## Notes
- Your server must be publicly accessible (HTTPS) for Meta to reach it.
- Use a service like [Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io) to deploy — all have free tiers.
- Alternatively, use [ngrok](https://ngrok.com) for local testing.
- The Instagram webhook only fires for Direct Messages sent to your business account.
