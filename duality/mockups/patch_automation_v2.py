#!/usr/bin/env python3
"""
Automation enhancements:
1. Add Birthday Reminder + Payment Failed automations to AUTOMATIONS array
2. Add Flow | History toggle to canvas header
3. Add per-automation stats bar (open rate, conversion)
4. Add frequency cap field to each automation
5. Add "Send test" button in email node edit modal
6. Add unsubscribe/suppression note to canvas
7. Render run history log in History view
"""
import re, subprocess

with open('admin-founder.html') as f:
    lines = f.readlines()
html = ''.join(lines)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add birthday + payment-failed to AUTOMATIONS array
# ─────────────────────────────────────────────────────────────────────────────
OLD_LAST_AUTO = """  {
    id:'referral', name:'Referral Reminder', cat:'Re-engagement',
    enabled:false, lastRun:'Never', runCount:0,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'4 weeks into season — referral code unused'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Share Duality with a friend!', template:'referral'},
    ]
  },
];"""

NEW_LAST_AUTO = """  {
    id:'referral', name:'Referral Reminder', cat:'Re-engagement',
    enabled:false, lastRun:'Never', runCount:0, freqCap:7,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'4 weeks into season — referral code unused'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Share Duality with a friend!', template:'referral'},
    ]
  },
  {
    id:'birthday', name:'Birthday Email', cat:'Re-engagement',
    enabled:true, lastRun:'Today', runCount:12, freqCap:365,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'Student birthday (sent morning of)'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Happy birthday, {first_name}! 🎉', template:'birthday'},
    ]
  },
  {
    id:'payment-failed', name:'Payment Failed', cat:'Billing & Fees',
    enabled:true, lastRun:'Yesterday', runCount:8, freqCap:3,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'Scheduled payment instalment fails'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Payment issue — action needed', template:'payment-failed'},
      {type:'delay', label:'Wait', detail:'3 days'},
      {type:'condition', label:'Condition', detail:'Payment still failed?', yes:'Continue', no:'Stop — resolved'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Second attempt failed — please update payment method', template:'payment-failed-2'},
    ]
  },
];"""

assert OLD_LAST_AUTO in html, 'OLD_LAST_AUTO not found'
html = html.replace(OLD_LAST_AUTO, NEW_LAST_AUTO, 1)
print('Added birthday + payment-failed automations')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add freqCap to all existing automations that don't have it
# ─────────────────────────────────────────────────────────────────────────────
import re as _re
def add_freq_cap(html):
    # Add freqCap:7 to any automation object that has runCount but no freqCap
    # Pattern: runCount:NNN, followed by nodes (no freqCap between)
    def replacer(m):
        s = m.group(0)
        if 'freqCap' in s:
            return s
        return s.replace('\n    nodes:', '\n    freqCap:7,\n    nodes:')
    # Match individual automation objects
    return _re.sub(r'\{[^{}]*?runCount:\d+[^{}]*?nodes:', replacer, html, flags=_re.DOTALL)

html = add_freq_cap(html)
print('Added freqCap to all automations')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Replace renderAutoList to show freq cap + add History toggle to openAutomation
# ─────────────────────────────────────────────────────────────────────────────
OLD_CANVAS_HEADER = """  document.getElementById('flow-canvas-header').style.padding = '14px 20px';
  renderFlowCanvas(auto);
}"""

# Find openAutomation function and inject stats + history toggle into canvas header render
OLD_OPEN_AUTO = """function openAutomation(id) {
  _activeAutoId = id;
  renderAutoList();
  var auto = AUTOMATIONS.find(function(a){return a.id===id;});
  if (!auto) return;
  document.getElementById('flow-canvas-title').textContent = auto.name;
  document.getElementById('flow-canvas-sub').textContent = auto.cat + ' · ' + auto.runCount + ' runs total';
  var statusEl = document.getElementById('flow-canvas-status');
  statusEl.textContent = auto.enabled ? 'Active' : 'Paused';
  statusEl.style.background = auto.enabled ? '#0f1600' : '#1a1a1a';
  statusEl.style.color = auto.enabled ? 'var(--lime)' : 'var(--grey)';
  statusEl.style.border = '1px solid ' + (auto.enabled ? 'var(--lime)' : '#444');
  var cb = document.getElementById('flow-toggle-cb');
  if (cb) cb.checked = auto.enabled;
  renderFlowCanvas(auto);
}"""

NEW_OPEN_AUTO = """var _canvasView = 'flow'; // 'flow' or 'history'

function openAutomation(id) {
  _activeAutoId = id;
  _canvasView = 'flow';
  renderAutoList();
  var auto = AUTOMATIONS.find(function(a){return a.id===id;});
  if (!auto) return;
  document.getElementById('flow-canvas-title').textContent = auto.name;
  document.getElementById('flow-canvas-sub').textContent = auto.cat + ' \xb7 ' + auto.runCount + ' runs total';
  var statusEl = document.getElementById('flow-canvas-status');
  statusEl.textContent = auto.enabled ? 'Active' : 'Paused';
  statusEl.style.background = auto.enabled ? '#0f1600' : '#1a1a1a';
  statusEl.style.color = auto.enabled ? 'var(--lime)' : 'var(--grey)';
  statusEl.style.border = '1px solid ' + (auto.enabled ? 'var(--lime)' : '#444');
  var cb = document.getElementById('flow-toggle-cb');
  if (cb) cb.checked = auto.enabled;
  renderFlowCanvas(auto);
  renderAutoStats(auto);
}

function renderAutoStats(auto) {
  var statsEl = document.getElementById('flow-canvas-stats');
  if (!statsEl) return;
  var openRate   = auto.id === 'booking-confirm' ? '68%' : auto.id === 'class-reminder' ? '72%' : auto.id === 'lapsed-3w' ? '41%' : auto.id === 'overdue-chase' ? '58%' : auto.id === 'birthday' ? '84%' : '49%';
  var convRate   = auto.id === 'lapsed-3w' ? '18%' : auto.id === 'lapsed-6w' ? '11%' : auto.id === 'overdue-chase' ? '63%' : auto.id === 'season-reenrol' ? '71%' : auto.id === 'birthday' ? '22%' : '--';
  var capLabel   = auto.freqCap ? 'Max 1 per ' + auto.freqCap + ' days' : 'No cap';
  statsEl.innerHTML =
    '<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;padding:10px 20px;border-bottom:1px solid var(--border);background:#0d0d0d;">' +
    '<div style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="color:var(--grey);">Open rate</span> <span style="font-weight:600;color:var(--white);">' + openRate + '</span></div>' +
    '<div style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="color:var(--grey);">Conversion</span> <span style="font-weight:600;color:var(--lime);">' + convRate + '</span></div>' +
    '<div style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="color:var(--grey);">Frequency cap</span> <span style="font-weight:600;color:var(--white);">' + capLabel + '</span> <button onclick="editFreqCap()" style="background:transparent;border:1px solid #333;border-radius:4px;color:var(--grey);font-size:10px;padding:1px 7px;cursor:pointer;">Edit</button></div>' +
    '<div style="margin-left:auto;display:flex;gap:6px;">' +
    '<button onclick="setCanvasView(\'flow\')"  class="btn btn-sm" id="cv-btn-flow"    style="font-size:11px;background:' + (_canvasView==='flow'?'var(--lime)':'transparent') + ';color:' + (_canvasView==='flow'?'#000':'var(--grey)') + ';border:1px solid ' + (_canvasView==='flow'?'var(--lime)':'#333') + ';">Flow</button>' +
    '<button onclick="setCanvasView(\'history\')" class="btn btn-sm" id="cv-btn-history" style="font-size:11px;background:' + (_canvasView==='history'?'var(--lime)':'transparent') + ';color:' + (_canvasView==='history'?'#000':'var(--grey)') + ';border:1px solid ' + (_canvasView==='history'?'var(--lime)':'#333') + ';">History</button>' +
    '</div></div>';
}

function setCanvasView(view) {
  _canvasView = view;
  var auto = AUTOMATIONS.find(function(a){return a.id===_activeAutoId;});
  if (!auto) return;
  renderAutoStats(auto);
  if (view === 'flow') renderFlowCanvas(auto);
  else renderHistoryLog(auto);
}

var AUTO_HISTORY = {
  'booking-confirm': [
    {time:'Today 9:14am', student:'Belle Harrison', status:'sent', detail:'Opened · Clicked booking link'},
    {time:'Today 8:52am', student:'Jade Li', status:'sent', detail:'Opened'},
    {time:'Yesterday 6:30pm', student:'Ruby Chen', status:'sent', detail:'Opened · Clicked booking link'},
    {time:'Yesterday 5:11pm', student:'Dana Park', status:'sent', detail:'No open recorded'},
    {time:'Mon 11 May', student:'Stella Nguyen', status:'sent', detail:'Opened'},
  ],
  'overdue-chase': [
    {time:'Mon 11 May', student:'Jess Malone', status:'sent', detail:'Opened · Balance paid same day'},
    {time:'Mon 11 May', student:'Kylie Rhodes', status:'sent', detail:'Opened · Still outstanding'},
    {time:'Sat 9 May', student:'Amy Turner', status:'bounced', detail:'Email bounced — invalid address'},
  ],
  'lapsed-3w': [
    {time:'Yesterday', student:'Olivia Wang', status:'sent', detail:'Opened · Re-booked within 48h ✓'},
    {time:'Mon 11 May', student:'Tara Singh', status:'sent', detail:'No open recorded'},
    {time:'Mon 11 May', student:'Mia Russo', status:'sent', detail:'Opened · No booking yet'},
  ],
  'birthday': [
    {time:'Today', student:'Jess Malone', status:'sent', detail:'Opened — replied "Thank you Mimi!" ♥'},
    {time:'5 May', student:'Claire Wu', status:'sent', detail:'Opened'},
  ],
  'payment-failed': [
    {time:'Yesterday', student:'Kylie Rhodes', status:'sent', detail:'Opened — payment retried, failed again'},
    {time:'3 May', student:'Sam Torres', status:'sent', detail:'Opened — updated card, resolved'},
  ],
};

function renderHistoryLog(auto) {
  var canvas = document.getElementById('flow-canvas');
  if (!canvas) return;
  var runs = AUTO_HISTORY[auto.id] || [];
  var html = '<div style="padding:4px 0;">';
  if (runs.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--grey);font-size:13px;">No runs yet for this automation.</div>';
  } else {
    html += '<div style="font-size:11px;color:var(--grey);margin-bottom:12px;">Showing last ' + runs.length + ' runs</div>';
    runs.forEach(function(r) {
      var statusColor = r.status === 'sent' ? 'var(--lime)' : r.status === 'bounced' ? '#ff6666' : 'var(--amber)';
      var statusBg    = r.status === 'sent' ? '#0f1600' : r.status === 'bounced' ? '#1a0000' : '#1a0f00';
      html += '<div style="background:#1a1a1a;border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">';
      html += '<div style="width:8px;height:8px;border-radius:50%;background:' + statusColor + ';flex-shrink:0;"></div>';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
      html += '<span style="font-size:13px;font-weight:500;">' + r.student + '</span>';
      html += '<span style="font-size:11px;padding:1px 7px;border-radius:4px;background:' + statusBg + ';color:' + statusColor + ';border:1px solid ' + statusColor + ';">' + r.status + '</span>';
      html += '</div>';
      html += '<div style="font-size:12px;color:var(--grey);margin-top:2px;">' + r.detail + '</div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#555;white-space:nowrap;">' + r.time + '</div>';
      html += '</div>';
    });
    html += '<div style="text-align:center;margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="showToast(\'Full export coming soon\')">Export all runs ↓</button></div>';
  }
  html += '</div>';
  canvas.innerHTML = html;
}

function editFreqCap() {
  var auto = AUTOMATIONS.find(function(a){return a.id===_activeAutoId;});
  if (!auto) return;
  var cur = auto.freqCap || 7;
  var val = prompt('Minimum days between sends to the same student (frequency cap):', cur);
  if (val === null) return;
  var n = parseInt(val);
  if (isNaN(n) || n < 1) { showToast('Enter a valid number of days'); return; }
  auto.freqCap = n;
  renderAutoStats(auto);
  showToast('Frequency cap updated to ' + n + ' days');
}"""

assert OLD_OPEN_AUTO in html, 'OLD_OPEN_AUTO not found'
html = html.replace(OLD_OPEN_AUTO, NEW_OPEN_AUTO, 1)
print('Replaced openAutomation with stats + history toggle version')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add stats div to the canvas HTML (between header and canvas)
# ─────────────────────────────────────────────────────────────────────────────
OLD_CANVAS_HTML = '''          <div id="flow-canvas" style="flex:1;padding:24px;overflow-y:auto;"></div>'''
NEW_CANVAS_HTML = '''          <div id="flow-canvas-stats"></div>
          <div id="flow-canvas" style="flex:1;padding:24px;overflow-y:auto;"></div>'''

assert OLD_CANVAS_HTML in html, 'flow-canvas div not found'
html = html.replace(OLD_CANVAS_HTML, NEW_CANVAS_HTML, 1)
print('Added flow-canvas-stats div')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Add "Send test email" button to email node edit modal body
# ─────────────────────────────────────────────────────────────────────────────
OLD_EMAIL_BADGE = """    body += '<div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--grey);line-height:1.8;">';
    body += '<span style="font-weight:600;color:var(--white);">Merge tags: </span>';
    body += '{first_name} &nbsp;{full_name} &nbsp;{class_name} &nbsp;{class_date} &nbsp;{instructor} &nbsp;{balance} &nbsp;{season} &nbsp;{referral_code}';
    body += '</div>';"""

NEW_EMAIL_BADGE = """    body += '<div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--grey);line-height:1.8;">';
    body += '<span style="font-weight:600;color:var(--white);">Merge tags: </span>';
    body += '{first_name} &nbsp;{full_name} &nbsp;{class_name} &nbsp;{class_date} &nbsp;{instructor} &nbsp;{balance} &nbsp;{season} &nbsp;{referral_code}';
    body += '</div>';
    body += '<div style="margin-top:12px;padding:12px 14px;background:#0f1600;border:1px solid var(--lime);border-radius:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">';
    body += '<div style="font-size:12px;color:var(--grey);">Send a test to <span style="color:var(--white);">mimi@dualitypole.com.au</span></div>';
    body += '<button class="btn btn-ghost btn-sm" onclick="sendTestFromNode()" style="font-size:11px;">Send test email</button>';
    body += '</div>';
    body += '<div style="margin-top:8px;font-size:11px;color:var(--grey);padding:8px 12px;background:#1a1200;border:1px solid #333;border-radius:6px;">&#9888; Unsubscribed students are automatically excluded from this automation.</div>';"""

assert OLD_EMAIL_BADGE in html, 'OLD_EMAIL_BADGE not found'
html = html.replace(OLD_EMAIL_BADGE, NEW_EMAIL_BADGE, 1)
print('Added send test + unsubscribe note to email node edit')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Add sendTestFromNode JS function before closing </script> of auto block
# ─────────────────────────────────────────────────────────────────────────────
OLD_INIT_AUTO = """(function initAutomations() {"""
NEW_INIT_AUTO = """function sendTestFromNode() {
  var subjectEl = document.getElementById('ne-subject');
  var subject = subjectEl ? subjectEl.value : '(no subject)';
  showToast('Test email sent to mimi@dualitypole.com.au — check inbox');
}

(function initAutomations() {"""

assert OLD_INIT_AUTO in html, 'initAutomations not found'
html = html.replace(OLD_INIT_AUTO, NEW_INIT_AUTO, 1)
print('Added sendTestFromNode function')

# ─────────────────────────────────────────────────────────────────────────────
# Safety
# ─────────────────────────────────────────────────────────────────────────────
assert 'birthday' in html
assert 'payment-failed' in html
assert 'renderHistoryLog' in html
assert 'renderAutoStats' in html
assert 'sendTestFromNode' in html
assert 'editFreqCap' in html
assert 'flow-canvas-stats' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkav2_{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkav2_{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:400]}')
print('Written.')
