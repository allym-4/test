#!/usr/bin/env python3
"""
1. Fix Messages tab filtering (All/Unread/Unknown)
   - Add data-unread and data-unknown attrs to msg-row divs
   - Replace stub setMsgTab with real filter logic

2. Update Automations screen
   - Add Gmail/Mailchimp routing badge to every automation row
   - Add Gmail connection status banner at top
   - Link "Manage" to Settings > Gmail section
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1a. Add data attributes to msg-row divs
# ─────────────────────────────────────────────────────────────────────────────
ROW_ATTRS = [
    ('data-convo="belle"',    'data-unread="true"  data-unknown="false"'),
    ('data-convo="unknown1"', 'data-unread="true"  data-unknown="true"'),
    ('data-convo="jade"',     'data-unread="true"  data-unknown="false"'),
    ('data-convo="ruby"',     'data-unread="false" data-unknown="false"'),
    ('data-convo="unknown2"', 'data-unread="false" data-unknown="true"'),
    ('data-convo="stella"',   'data-unread="false" data-unknown="false"'),
    ('data-convo="dana"',     'data-unread="false" data-unknown="false"'),
]
for convo_attr, new_attrs in ROW_ATTRS:
    html = html.replace(
        f'class="msg-row" {convo_attr}',
        f'class="msg-row" {convo_attr} {new_attrs}',
        1
    )
    # Also handle the first row which has class="msg-row active"
    html = html.replace(
        f'class="msg-row active" {convo_attr}',
        f'class="msg-row active" {convo_attr} {new_attrs}',
        1
    )
print('Added data-unread / data-unknown attrs to msg rows')

# ─────────────────────────────────────────────────────────────────────────────
# 1b. Replace stub setMsgTab with real filter + fix openConvo to remove dot properly
# ─────────────────────────────────────────────────────────────────────────────
OLD_SET_MSG_TAB = """function setMsgTab(btn, filter) {
  document.querySelectorAll('.msg-tab').forEach(function(b) {
    b.style.color = 'var(--grey)'; b.style.borderBottomColor = 'transparent';
  });
  btn.style.color = 'var(--lime)'; btn.style.borderBottomColor = 'var(--lime)';
}"""

NEW_SET_MSG_TAB = """function setMsgTab(btn, filter) {
  document.querySelectorAll('.msg-tab').forEach(function(b) {
    b.style.color = 'var(--grey)'; b.style.borderBottomColor = 'transparent';
  });
  btn.style.color = 'var(--lime)'; btn.style.borderBottomColor = 'var(--lime)';
  document.querySelectorAll('.msg-row').forEach(function(row) {
    var show = true;
    if (filter === 'unread')  show = row.getAttribute('data-unread')  === 'true';
    if (filter === 'unknown') show = row.getAttribute('data-unknown') === 'true';
    row.style.display = show ? 'flex' : 'none';
  });
}"""

if OLD_SET_MSG_TAB in html:
    html = html.replace(OLD_SET_MSG_TAB, NEW_SET_MSG_TAB, 1)
    print('Replaced setMsgTab with real filter logic')
else:
    print('WARNING: setMsgTab not found exactly')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Update Automations screen — add Gmail banner + per-row "via" badge
# ─────────────────────────────────────────────────────────────────────────────

# 2a. Add banner at top of Automations screen (after page-header)
OLD_NOTIF_HEADER = '''<div class="page-header"><div><div class="page-title">Automations</div><div class="page-sub">Email, SMS and push notification triggers</div></div><button class="btn btn-lime" onclick="openModal(\'modal-edit-automation\')">+ Add Automation</button></div>'''

NEW_NOTIF_HEADER = '''<div class="page-header"><div><div class="page-title">Automations</div><div class="page-sub">Email, SMS and push notification triggers</div></div><button class="btn btn-lime" onclick="openModal(\'modal-edit-automation\')">+ Add Automation</button></div>

      <!-- Gmail connection banner -->
      <div style="background:#0f1600;border:1px solid var(--lime);border-radius:10px;padding:14px 16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <div>
            <div style="font-size:13px;font-weight:600;">Gmail connected — <span style="color:var(--lime);">mimi@dualitypole.com.au</span></div>
            <div style="font-size:12px;color:var(--grey);margin-top:2px;">Personal &amp; transactional emails send via Gmail · Bulk campaigns via Mailchimp</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="showScreen(\'settings\');setTimeout(function(){document.getElementById(\'settings-gmail\').scrollIntoView({behavior:\'smooth\'})},300)">Manage Gmail →</button>
      </div>'''

if OLD_NOTIF_HEADER in html:
    html = html.replace(OLD_NOTIF_HEADER, NEW_NOTIF_HEADER, 1)
    print('Added Gmail banner to Automations')
else:
    print('WARNING: Automations header not found')

# 2b. Add "via" badge to each automation row
# Format: find each automation title and inject a badge after the subtitle div

def add_via_badge(html, title_text, via, color):
    """Inject a sending-channel badge after the subtitle of an automation row."""
    if via == 'gmail':
        badge = (
            '<div style="display:inline-flex;align-items:center;gap:4px;margin-top:5px;'
            'background:#0f1600;border:1px solid var(--lime);border-radius:4px;'
            'padding:2px 7px;font-size:10px;color:var(--lime);">'
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">'
            '<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>'
            '<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>'
            '<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>'
            '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>'
            '</svg>via Gmail</div>'
        )
    else:
        badge = (
            '<div style="display:inline-flex;align-items:center;gap:4px;margin-top:5px;'
            'background:#1a1200;border:1px solid var(--amber);border-radius:4px;'
            'padding:2px 7px;font-size:10px;color:var(--amber);">via Mailchimp</div>'
        )

    search = f'>{title_text}</div>'
    idx = html.find(search)
    if idx == -1:
        print(f'  WARNING: automation not found: {title_text}')
        return html
    # Find the end of the subtitle div that follows
    sub_start = html.find('<div style="font-size:11px;color:var(--grey)', idx)
    sub_end = html.find('</div>', sub_start) + 6
    html = html[:sub_end] + badge + html[sub_end:]
    print(f'  Badge added: {title_text[:40]} → {via}')
    return html

AUTOMATION_ROUTES = [
    ('Booking Confirmation',              'mailchimp', 'amber'),
    ('Class Reminder — 24h before',       'gmail',     'lime'),
    ('First Class Welcome Email',         'gmail',     'lime'),
    ('Waitlist Promotion',                'gmail',     'lime'),
    ('No-show Fee Notification',          'gmail',     'lime'),
    ('Overdue Balance Reminder',          'gmail',     'lime'),
    ('Season Re-enrolment Reminder',      'mailchimp', 'amber'),
    ('Lapsed Student — 3 weeks no booking','gmail',    'lime'),
    ('Lapsed Student — 6 weeks no booking','gmail',    'lime'),
    ('Lapsed Student — 12 weeks',         'gmail',     'lime'),
    ('Post-season check-in',              'gmail',     'lime'),
    ('Referral reminder',                 'gmail',     'lime'),
]
for title, via, color in AUTOMATION_ROUTES:
    html = add_via_badge(html, title, via, color)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Safety + validate
# ─────────────────────────────────────────────────────────────────────────────
assert 'data-unread="true"' in html
assert 'data-unknown="true"' in html
assert 'filter === \'unread\'' in html
assert 'filter === \'unknown\'' in html
assert 'settings-gmail' in html
assert 'via Gmail' in html
assert 'via Mailchimp' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkma{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkma{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:300]}')
print('Written.')
