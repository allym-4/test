#!/usr/bin/env python3
"""
1. Add Waitlist screen to nav + build the screen
2. Add Bulk Quick Message modal (accessible from student list + comms tab)
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1a. Add Waitlist to nav (after Classes nav item)
# ─────────────────────────────────────────────────────────────────────────────
OLD_NAV_CLASSES = '    <div class="nav-item" onclick="showScreen(\'classes\')"><span class="nav-icon">📅</span> Classes</div>'
NEW_NAV_CLASSES = '''    <div class="nav-item" onclick="showScreen('classes')"><span class="nav-icon">📅</span> Classes</div>
    <div class="nav-item" onclick="showScreen('waitlist')"><span class="nav-icon">⏳</span> Waitlist</div>'''

assert OLD_NAV_CLASSES in html, 'Classes nav item not found'
html = html.replace(OLD_NAV_CLASSES, NEW_NAV_CLASSES, 1)
print('Added Waitlist nav item')

# 1b. Insert Waitlist screen before screen-retail
OLD_BEFORE_RETAIL = '    <div id="screen-retail" class="screen">'
NEW_BEFORE_RETAIL = '''    <!-- ===== WAITLIST ===== -->
    <div id="screen-waitlist" class="screen">
      <div class="page-header">
        <div><div class="page-title">Waitlist</div><div class="page-sub">Students waiting for spots across all classes this season</div></div>
        <button class="btn btn-lime" onclick="showToast('Waitlist notifications sent to all eligible students')">Notify all eligible &#8594;</button>
      </div>

      <!-- Summary strip -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
        <div class="section" style="padding:14px 16px;">
          <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Total Waitlisted</div>
          <div style="font-family:\'Archivo Black\',sans-serif;font-size:24px;">23</div>
        </div>
        <div class="section" style="padding:14px 16px;">
          <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Classes with Waitlist</div>
          <div style="font-family:\'Archivo Black\',sans-serif;font-size:24px;">4</div>
        </div>
        <div class="section" style="padding:14px 16px;">
          <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Promoted This Season</div>
          <div style="font-family:\'Archivo Black\',sans-serif;font-size:24px;color:var(--lime);">8</div>
        </div>
        <div class="section" style="padding:14px 16px;">
          <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Avg Wait Time</div>
          <div style="font-family:\'Archivo Black\',sans-serif;font-size:24px;">9 days</div>
        </div>
      </div>

      <!-- Per-class waitlists -->
      <div id="waitlist-classes"></div>
    </div>

    <div id="screen-retail" class="screen">'''

assert OLD_BEFORE_RETAIL in html, 'screen-retail not found'
html = html.replace(OLD_BEFORE_RETAIL, NEW_BEFORE_RETAIL, 1)
print('Added Waitlist screen HTML')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add Bulk Quick Message modal (before </body>)
# ─────────────────────────────────────────────────────────────────────────────
BULK_MSG_MODAL = '''<!-- Bulk / Quick Message modal -->
<div class="modal-overlay" id="modal-quick-message">
  <div class="modal" style="width:520px;max-width:95vw;">
    <div class="modal-title">Send Message <button class="modal-close" onclick="closeModal(\'modal-quick-message\')">&#10005;</button></div>
    <div class="field">
      <label>To</label>
      <select id="qm-to" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">
        <option value="class-l1-mon">Level 1 — Mon 5:30pm (12 students)</option>
        <option value="class-l2-mon">Level 2 — Mon 6:30pm (9 students)</option>
        <option value="class-ht">High Tricks — Mon 7:30pm (8 students)</option>
        <option value="class-dance">Dance — Fri 6:00pm (14 students)</option>
        <option value="all-enrolled">All enrolled students (138)</option>
        <option value="all-overdue">Students with overdue balance (3)</option>
        <option value="all-lapsed">Lapsed students — 3+ weeks (12)</option>
        <option value="custom">Custom list...</option>
      </select>
    </div>
    <div class="field">
      <label>Channel</label>
      <div style="display:flex;gap:8px;">
        <button id="qm-ch-email" onclick="qmSetChannel(\'email\')" class="btn btn-lime btn-sm" style="flex:1;">&#9993; Email (Gmail)</button>
        <button id="qm-ch-push" onclick="qmSetChannel(\'push\')" class="btn btn-ghost btn-sm" style="flex:1;">&#128241; Push</button>
        <button id="qm-ch-sms" onclick="qmSetChannel(\'sms\')" class="btn btn-ghost btn-sm" style="flex:1;">&#128172; SMS</button>
      </div>
    </div>
    <div id="qm-subject-wrap" class="field">
      <label>Subject</label>
      <input type="text" id="qm-subject" placeholder="e.g. Class update for this week" />
    </div>
    <div class="field">
      <label>Message</label>
      <textarea id="qm-body" rows="5" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;resize:vertical;box-sizing:border-box;" placeholder="Type your message here... Use {first_name} to personalise."></textarea>
    </div>
    <div style="font-size:11px;color:var(--grey);margin-bottom:16px;padding:8px 12px;background:#1a1a1a;border-radius:6px;">
      Available merge tags: {first_name} &nbsp;{full_name} &nbsp;{class_name} &nbsp;{balance}
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-lime" onclick="sendQuickMessage()">Send now</button>
      <button class="btn btn-ghost" onclick="closeModal(\'modal-quick-message\')">Cancel</button>
    </div>
  </div>
</div>

</body>'''

html = html.replace('</body>', BULK_MSG_MODAL, 1)
print('Added Bulk Quick Message modal')

# ─────────────────────────────────────────────────────────────────────────────
# 3. JS for Waitlist screen + Quick Message modal
# ─────────────────────────────────────────────────────────────────────────────
WAITLIST_JS = r"""<script>
// ── Waitlist data ─────────────────────────────────────────────────────────────
var WAITLISTS = [
  {
    classId:'l1-mon', className:'Level 1 — Mon 5:30pm', instructor:'Chloe',
    capacity:12, enrolled:12, spotsOpening:'1 cancellation pending',
    entries:[
      {name:'Nina Patel',   joinedWaitlist:'2 May', waitDays:11, email:'nina@gmail.com',   notified:false},
      {name:'Zoe Hart',     joinedWaitlist:'4 May', waitDays:9,  email:'zoe@email.com',    notified:false},
      {name:'Ivy Lam',      joinedWaitlist:'7 May', waitDays:6,  email:'ivy@email.com',    notified:false},
    ]
  },
  {
    classId:'dance-fri', className:'Dance — Fri 6:00pm', instructor:'Bambi',
    capacity:14, enrolled:14, spotsOpening:'Consistently full — consider second class',
    entries:[
      {name:'Amber Ross',   joinedWaitlist:'1 May', waitDays:12, email:'amber@email.com',  notified:true},
      {name:'Lucy Chen',    joinedWaitlist:'3 May', waitDays:10, email:'lucy@email.com',   notified:false},
      {name:'Priya Mehta',  joinedWaitlist:'5 May', waitDays:8,  email:'priya@email.com',  notified:false},
      {name:'Sarah Blake',  joinedWaitlist:'8 May', waitDays:5,  email:'sarah@email.com',  notified:false},
    ]
  },
  {
    classId:'l2-mon', className:'Level 2 — Mon 6:30pm', instructor:'Chloe',
    capacity:10, enrolled:9, spotsOpening:'1 spot available now',
    entries:[
      {name:'Mia Torres',   joinedWaitlist:'6 May', waitDays:7,  email:'mia@email.com',    notified:false},
      {name:'Kai Nguyen',   joinedWaitlist:'9 May', waitDays:4,  email:'kai@email.com',    notified:false},
    ]
  },
  {
    classId:'virgin-6', className:'Virgin 6 — Sat 10:00am', instructor:'Maz',
    capacity:8, enrolled:8, spotsOpening:'None — attendance has been low recently',
    entries:[
      {name:'Jess Malone',  joinedWaitlist:'3 May', waitDays:10, email:'jess@gmail.com',   notified:false},
    ]
  },
];

function renderWaitlistScreen() {
  var el = document.getElementById('waitlist-classes');
  if (!el) return;
  var html = '';
  WAITLISTS.forEach(function(wl) {
    html += '<div class="section" style="margin-bottom:16px;padding:0;">';
    html += '<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">';
    html += '<div>';
    html += '<div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">' + wl.className + '</div>';
    html += '<div style="font-size:12px;color:var(--grey);margin-top:3px;">' + wl.instructor + ' &nbsp;·&nbsp; ' + wl.enrolled + '/' + wl.capacity + ' enrolled &nbsp;·&nbsp; <span style="color:var(--amber);">' + wl.spotsOpening + '</span></div>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<span style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:6px;background:#1a1200;border:1px solid var(--amber);color:var(--amber);">' + wl.entries.length + ' waiting</span>';
    html += '<button class="btn btn-ghost btn-sm" onclick="notifyWaitlist(\'' + wl.classId + '\')">Notify next in line</button>';
    html += '</div>';
    html += '</div>';
    html += '<table style="width:100%"><thead><tr><th>#</th><th>Student</th><th>On waitlist since</th><th>Days waiting</th><th>Status</th><th></th></tr></thead><tbody>';
    wl.entries.forEach(function(e, i) {
      html += '<tr>';
      html += '<td style="color:var(--grey);width:32px;">' + (i+1) + '</td>';
      html += '<td style="font-weight:500;">' + e.name + '</td>';
      html += '<td style="color:var(--grey);">' + e.joinedWaitlist + '</td>';
      html += '<td>' + e.waitDays + ' days</td>';
      html += '<td>' + (e.notified ? '<span class="tag tag-lime">Notified</span>' : '<span class="tag tag-grey">Waiting</span>') + '</td>';
      html += '<td style="text-align:right;"><button class="btn btn-ghost btn-xs" onclick="promoteStudent(\'' + wl.classId + '\',' + i + ')">Promote</button> <button class="btn btn-ghost btn-xs" onclick="removeFromWaitlist(\'' + wl.classId + '\',' + i + ')">Remove</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += '</div>';
  });
  el.innerHTML = html;
}

function notifyWaitlist(classId) {
  var wl = WAITLISTS.find(function(w){return w.classId===classId;});
  if (!wl || !wl.entries.length) return;
  var next = wl.entries.find(function(e){return !e.notified;});
  if (!next) { showToast('All students already notified'); return; }
  next.notified = true;
  renderWaitlistScreen();
  showToast('Notification sent to ' + next.name);
}

function promoteStudent(classId, idx) {
  var wl = WAITLISTS.find(function(w){return w.classId===classId;});
  if (!wl) return;
  var student = wl.entries[idx];
  wl.entries.splice(idx, 1);
  wl.enrolled = Math.min(wl.enrolled + 1, wl.capacity);
  renderWaitlistScreen();
  showToast(student.name + ' promoted into ' + wl.className);
}

function removeFromWaitlist(classId, idx) {
  var wl = WAITLISTS.find(function(w){return w.classId===classId;});
  if (!wl) return;
  var student = wl.entries[idx];
  wl.entries.splice(idx, 1);
  renderWaitlistScreen();
  showToast(student.name + ' removed from waitlist');
}

// ── Quick Message modal ───────────────────────────────────────────────────────
var _qmChannel = 'email';

function openQuickMessageModal(presetTo) {
  if (presetTo) {
    var sel = document.getElementById('qm-to');
    if (sel) {
      for (var i=0; i<sel.options.length; i++) {
        if (sel.options[i].value === presetTo) { sel.selectedIndex = i; break; }
      }
    }
  }
  openModal('modal-quick-message');
}

function qmSetChannel(ch) {
  _qmChannel = ch;
  ['email','push','sms'].forEach(function(c) {
    var btn = document.getElementById('qm-ch-' + c);
    if (btn) btn.className = 'btn ' + (c===ch?'btn-lime':'btn-ghost') + ' btn-sm';
    if (btn) btn.style.flex = '1';
  });
  var subWrap = document.getElementById('qm-subject-wrap');
  if (subWrap) subWrap.style.display = ch==='email' ? 'block' : 'none';
}

function sendQuickMessage() {
  var to = document.getElementById('qm-to');
  var body = document.getElementById('qm-body');
  if (!body || !body.value.trim()) { showToast('Please write a message first'); return; }
  var label = to ? to.options[to.selectedIndex].text : 'selected students';
  closeModal('modal-quick-message');
  body.value = '';
  showToast('Message sent to ' + label);
}

// Hook waitlist render into showScreen
(function() {
  var orig = window.showScreen;
  window.showScreen = function(id) {
    orig(id);
    if (id === 'waitlist') setTimeout(renderWaitlistScreen, 10);
  };
})();
</script>
"""

html = html.replace('</body>', WAITLIST_JS + '</body>', 1)
print('Added Waitlist + Quick Message JS')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add "Quick message" button to Messages screen header
# ─────────────────────────────────────────────────────────────────────────────
OLD_MSG_HEADER = '<div class="page-title">Messages</div><div class="page-sub">Instagram DMs centralised with student context</div></div>'
NEW_MSG_HEADER = '<div class="page-title">Messages</div><div class="page-sub">Instagram DMs centralised with student context</div></div><button class="btn btn-ghost btn-sm" onclick="openQuickMessageModal()">+ Bulk message</button>'

assert OLD_MSG_HEADER in html, 'Messages header not found'
html = html.replace(OLD_MSG_HEADER, NEW_MSG_HEADER, 1)
print('Added Bulk message button to Messages screen')

# Safety
assert 'screen-waitlist' in html
assert 'WAITLISTS' in html
assert 'renderWaitlistScreen' in html
assert 'modal-quick-message' in html
assert 'sendQuickMessage' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkwl{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkwl{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:300]}')
print('Written.')
