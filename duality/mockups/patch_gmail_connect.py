#!/usr/bin/env python3
"""
Add a Gmail / Google Workspace integration section to Settings.
Includes:
- Connect Gmail button with OAuth flow simulation
- Connected state showing account, SPF/DKIM status, test email
- Sending behaviour settings (signature, reply-to, daily limit)
- Mailchimp vs Gmail routing toggle per email type
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# Insert after the Xero integration section closing </div>
# Find the unique marker just after the Xero block ends

XERO_END = '''      </div>

      <!-- Cancellation Settings -->'''

GMAIL_SECTION = '''      </div>

      <!-- Gmail / Google Workspace Integration -->
      <div class="section" style="margin-top:20px;" id="settings-gmail">
        <div class="section-title" style="display:flex;align-items:center;gap:10px;">
          Gmail Integration
          <span id="gmail-status-tag" class="tag tag-grey">Not Connected</span>
        </div>
        <p style="font-size:13px;color:var(--grey);line-height:1.5;margin-bottom:16px;">Connect your Google Workspace account to send plain-text emails (chase reminders, re-engagement, check-ins) directly from your studio email. Emails land in Primary inbox — not Promotions or Spam.</p>

        <!-- NOT CONNECTED state -->
        <div id="gmail-disconnected">
          <div style="background:#1a1a1a;border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <div style="font-size:13px;font-weight:600;margin-bottom:6px;">Why connect Gmail?</div>
                <div style="font-size:12px;color:var(--grey);line-height:1.6;">
                  ✦ Emails come from <b style="color:var(--white);">mimi@dualitypole.com.au</b> — not via Mailchimp<br>
                  ✦ Plain text = lands in Primary, not spam<br>
                  ✦ Replies come back to your inbox<br>
                  ✦ Google handles SPF &amp; DKIM automatically<br>
                  ✦ Up to 2,000 emails/day included
                </div>
              </div>
              <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:14px 16px;min-width:200px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Use Gmail for</div>
                <div style="font-size:12px;color:var(--white);line-height:1.8;">
                  Chase reminders<br>Student re-engagement<br>Welfare check-ins<br>Waitlist notifications<br>Individual announcements
                </div>
                <div style="font-size:11px;color:var(--grey);margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">Keep Mailchimp for season announcements &amp; designed newsletters</div>
              </div>
            </div>
          </div>
          <button class="btn btn-lime" onclick="simulateGmailConnect()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Connect Google Workspace Account
          </button>
          <div style="font-size:12px;color:var(--grey);margin-top:10px;">You'll be redirected to Google to grant send-on-behalf-of permission. No password is stored — uses secure OAuth2.</div>
        </div>

        <!-- CONNECTED state (hidden until connected) -->
        <div id="gmail-connected" style="display:none;">
          <div style="background:#0f1600;border:1px solid var(--lime);border-radius:10px;padding:16px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:38px;height:38px;border-radius:50%;background:var(--lime);display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:15px;color:#000;flex-shrink:0;">M</div>
                <div>
                  <div style="font-size:14px;font-weight:600;">mimi@dualitypole.com.au</div>
                  <div style="font-size:12px;color:var(--grey);margin-top:2px;">Google Workspace · Connected 13 May 2026</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="disconnectGmail()">Disconnect</button>
            </div>
            <div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="color:var(--lime);">✓</span> SPF verified</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="color:var(--lime);">✓</span> DKIM active</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="color:var(--lime);">✓</span> DMARC pass</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--grey);">0 / 2,000 emails sent today</div>
            </div>
          </div>

          <!-- Sending settings -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
            <div>
              <div class="field">
                <label>Default sender name</label>
                <input type="text" value="Mimi — Duality Pole" />
              </div>
              <div class="field">
                <label>Reply-to address</label>
                <input type="text" value="mimi@dualitypole.com.au" />
              </div>
              <div class="field">
                <label>Email signature</label>
                <textarea rows="3" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;resize:vertical;box-sizing:border-box;">Mimi
Duality Pole — Surry Hills
dualitypole.com.au</textarea>
              </div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--grey);margin-bottom:12px;">Route via Gmail (not Mailchimp)</div>
              <div class="notif-row">
                <div><div style="font-weight:500;font-size:13px;">Chase reminders</div></div>
                <label class="toggle"><input type="checkbox" checked /><span class="toggle-slider"></span></label>
              </div>
              <div class="notif-row">
                <div><div style="font-weight:500;font-size:13px;">Re-engagement emails</div></div>
                <label class="toggle"><input type="checkbox" checked /><span class="toggle-slider"></span></label>
              </div>
              <div class="notif-row">
                <div><div style="font-weight:500;font-size:13px;">Welfare check-ins</div></div>
                <label class="toggle"><input type="checkbox" checked /><span class="toggle-slider"></span></label>
              </div>
              <div class="notif-row">
                <div><div style="font-weight:500;font-size:13px;">Waitlist notifications</div></div>
                <label class="toggle"><input type="checkbox" checked /><span class="toggle-slider"></span></label>
              </div>
              <div class="notif-row" style="border-bottom:none;">
                <div><div style="font-weight:500;font-size:13px;">Season announcements</div><div style="font-size:11px;color:var(--grey);margin-top:2px;">Keep on Mailchimp — designed template</div></div>
                <label class="toggle"><input type="checkbox" /><span class="toggle-slider"></span></label>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-sm" onclick="alert(\'Settings saved!\')">Save Settings</button>
            <button class="btn btn-ghost btn-sm" onclick="sendTestEmail()">Send Test Email</button>
          </div>
        </div>
      </div>

      <!-- Cancellation Settings -->'''

if XERO_END in html:
    html = html.replace(XERO_END, GMAIL_SECTION, 1)
    print('Inserted Gmail section after Xero')
else:
    print('ERROR: Xero end marker not found')

# ── Add Gmail JS (connect simulation, disconnect, test email) ─────────────────
GMAIL_JS = '''<script>
function simulateGmailConnect() {
  var btn = event.target.closest('button');
  btn.disabled = true;
  btn.textContent = 'Connecting…';
  setTimeout(function() {
    document.getElementById('gmail-disconnected').style.display = 'none';
    document.getElementById('gmail-connected').style.display = 'block';
    var tag = document.getElementById('gmail-status-tag');
    tag.textContent = 'Connected';
    tag.className = 'tag tag-lime';
    showToast('Gmail connected — mimi@dualitypole.com.au');
  }, 1800);
}
function disconnectGmail() {
  if (!confirm('Disconnect Gmail? Chase and re-engagement emails will stop sending until you reconnect.')) return;
  document.getElementById('gmail-disconnected').style.display = 'block';
  document.getElementById('gmail-connected').style.display = 'none';
  var tag = document.getElementById('gmail-status-tag');
  tag.textContent = 'Not Connected';
  tag.className = 'tag tag-grey';
}
function sendTestEmail() {
  var btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  setTimeout(function() {
    btn.disabled = false;
    btn.textContent = 'Send Test Email';
    showToast('Test email sent to mimi@dualitypole.com.au — check your inbox');
  }, 1400);
}
</script>
'''

html = html.replace('</body>', GMAIL_JS + '</body>', 1)
print('Added Gmail JS')

# ── Safety + validate ──────────────────────────────────────────────────────────
assert 'settings-gmail' in html
assert 'simulateGmailConnect' in html
assert 'disconnectGmail' in html
assert 'sendTestEmail' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkg{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkg{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: "+r.stderr[:300]}')
print('Written.')
