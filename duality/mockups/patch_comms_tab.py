#!/usr/bin/env python3
"""Add Comms history tab to student profile (after Notes tab)."""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ── 1. Add tab button after Notes tab ────────────────────────────────────────
OLD_NOTES_TAB = '        <div class="subtab" id="sd-tab-notes" onclick="switchSubTab(this,\'sd-notes\')">Notes</div>'
NEW_NOTES_TAB = '''        <div class="subtab" id="sd-tab-notes" onclick="switchSubTab(this,\'sd-notes\')">Notes</div>
        <div class="subtab" id="sd-tab-comms" onclick="switchSubTab(this,\'sd-comms\');loadCommsTab()">Comms</div>'''

assert OLD_NOTES_TAB in html, 'Notes tab not found'
html = html.replace(OLD_NOTES_TAB, NEW_NOTES_TAB, 1)
print('Added Comms tab button')

# ── 2. Add Comms subscreen after the Notes subscreen closing </div> ───────────
# Find end of sd-notes subscreen — look for next screen-level comment/div after it
OLD_AFTER_NOTES = '      <!-- DOCUMENTS TAB -->'
NEW_AFTER_NOTES = '''      <!-- COMMS TAB -->
      <div id="sd-comms" class="subscreen">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;gap:6px;">
            <button class="btn btn-lime btn-xs comms-filter active" onclick="filterComms(this,\'all\')">All</button>
            <button class="btn btn-ghost btn-xs comms-filter" onclick="filterComms(this,\'email\')">Emails</button>
            <button class="btn btn-ghost btn-xs comms-filter" onclick="filterComms(this,\'dm\')">DMs</button>
            <button class="btn btn-ghost btn-xs comms-filter" onclick="filterComms(this,\'sms\')">SMS</button>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openQuickMessageModal()">+ Send message</button>
        </div>
        <div id="sd-comms-list"><div style="text-align:center;padding:40px;color:var(--grey);font-size:13px;">Loading communications...</div></div>
      </div>

      <!-- DOCUMENTS TAB -->'''

assert OLD_AFTER_NOTES in html, 'DOCUMENTS TAB comment not found'
html = html.replace(OLD_AFTER_NOTES, NEW_AFTER_NOTES, 1)
print('Added Comms subscreen HTML')

# ── 3. Add JS for comms tab ────────────────────────────────────────────────────
COMMS_JS = r"""<script>
var STUDENT_COMMS = {
  'jess': [
    {type:'email', dir:'out', auto:'Overdue Balance Chase', subject:'Your Duality balance — quick reminder', time:'Mon 11 May, 9:02am', status:'opened', channel:'gmail'},
    {type:'email', dir:'out', auto:'Class Reminder', subject:'See you tomorrow, Jess!', time:'Sun 10 May, 5:00pm', status:'opened', channel:'gmail'},
    {type:'dm', dir:'in', text:'Hey Mimi, just checking — does the Saturday class run this week?', time:'Sat 9 May, 11:14am', status:'read'},
    {type:'dm', dir:'out', text:'Hi Jess! Yes we are on — see you there 😊', time:'Sat 9 May, 11:22am', status:'read'},
    {type:'email', dir:'out', auto:'No-show Fee Notification', subject:'No-show fee — Level 2 Mon 6:30pm', time:'Tue 6 May, 8:45am', status:'opened', channel:'gmail'},
    {type:'email', dir:'out', auto:'Class Reminder', subject:'See you tomorrow, Jess!', time:'Mon 5 May, 5:00pm', status:'opened', channel:'gmail'},
    {type:'email', dir:'out', auto:'Booking Confirmation', subject:'Your booking is confirmed!', time:'Fri 2 May, 3:22pm', status:'opened', channel:'mailchimp'},
  ],
  'belle': [
    {type:'email', dir:'out', auto:'Booking Confirmation', subject:'Your booking is confirmed!', time:'Today 9:14am', status:'opened', channel:'mailchimp'},
    {type:'dm', dir:'in', text:'Hi! Can I swap to the 7pm class instead next week?', time:'Yesterday 4:30pm', status:'unread'},
    {type:'email', dir:'out', auto:'No-show Fee Notification', subject:'No-show fee — Level 1 Sat 10am', time:'Mon 5 May, 9:01am', status:'no open', channel:'gmail'},
    {type:'email', dir:'out', auto:'Booking Confirmation', subject:'Your booking is confirmed!', time:'Fri 2 May, 2:11pm', status:'opened', channel:'mailchimp'},
  ],
};

var _commsFilter = 'all';

function loadCommsTab() {
  var student = _currentStudent;
  if (!student) return;
  var key = student.id || (student.name||'').split(' ')[0].toLowerCase();
  var comms = STUDENT_COMMS[key] || generateGenericComms(student);
  renderCommsTab(comms, _commsFilter);
}

function generateGenericComms(student) {
  return [
    {type:'email', dir:'out', auto:'Booking Confirmation', subject:'Your booking is confirmed!', time:'Mon 11 May, 3:10pm', status:'opened', channel:'mailchimp'},
    {type:'email', dir:'out', auto:'Class Reminder', subject:'See you tomorrow, ' + (student.name||'').split(' ')[0] + '!', time:'Sun 10 May, 5:00pm', status:'opened', channel:'gmail'},
    {type:'email', dir:'out', auto:'Re-engagement — 3 weeks', subject:'We miss you at Duality!', time:'2 May, 9:00am', status:'no open', channel:'gmail'},
  ];
}

function renderCommsTab(comms, filter) {
  var el = document.getElementById('sd-comms-list');
  if (!el) return;
  var filtered = filter === 'all' ? comms : comms.filter(function(c){ return c.type === filter; });
  if (filtered.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--grey);font-size:13px;">No ' + filter + ' communications found.</div>';
    return;
  }
  var html = '';
  filtered.forEach(function(c) {
    var isIn = c.dir === 'in';
    var typeColor = c.type === 'email' ? (c.channel === 'gmail' ? 'var(--lime)' : 'var(--amber)') : c.type === 'dm' ? 'var(--lav)' : '#00d4ff';
    var typeLabel = c.type === 'email' ? (c.channel === 'gmail' ? 'Email · Gmail' : 'Email · Mailchimp') : c.type === 'dm' ? 'Instagram DM' : 'SMS';
    var statusColor = c.status === 'opened' ? 'var(--lime)' : c.status === 'unread' ? 'var(--amber)' : 'var(--grey)';
    html += '<div style="background:#1a1a1a;border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:8px;">';
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">';
    html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
    html += '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:' + typeColor + '22;color:' + typeColor + ';border:1px solid ' + typeColor + '33;">' + typeLabel + '</span>';
    html += '<span style="font-size:11px;color:var(--grey);">' + (isIn ? 'Received' : (c.auto ? 'Automated · ' + c.auto : 'Manual')) + '</span>';
    html += '</div>';
    html += '<span style="font-size:11px;color:#555;white-space:nowrap;">' + c.time + '</span>';
    html += '</div>';
    if (c.subject) {
      html += '<div style="font-size:13px;font-weight:500;margin-top:6px;">' + c.subject + '</div>';
    }
    if (c.text) {
      html += '<div style="font-size:13px;margin-top:6px;color:var(--white);">"' + c.text + '"</div>';
    }
    if (c.status) {
      html += '<div style="font-size:11px;margin-top:6px;color:' + statusColor + ';">' + c.status.charAt(0).toUpperCase() + c.status.slice(1) + '</div>';
    }
    html += '</div>';
  });
  el.innerHTML = html;
}

function filterComms(btn, filter) {
  _commsFilter = filter;
  document.querySelectorAll('.comms-filter').forEach(function(b) {
    b.className = 'btn btn-ghost btn-xs comms-filter';
  });
  btn.className = 'btn btn-lime btn-xs comms-filter active';
  var student = _currentStudent;
  if (!student) return;
  var key = student.id || (student.name||'').split(' ')[0].toLowerCase();
  var comms = STUDENT_COMMS[key] || generateGenericComms(student);
  renderCommsTab(comms, filter);
}
</script>
"""

html = html.replace('</body>', COMMS_JS + '</body>', 1)
print('Added Comms JS')

# ── Safety ─────────────────────────────────────────────────────────────────────
assert 'sd-comms' in html
assert 'loadCommsTab' in html
assert 'renderCommsTab' in html
assert 'STUDENT_COMMS' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkct{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkct{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:300]}')
print('Written.')
