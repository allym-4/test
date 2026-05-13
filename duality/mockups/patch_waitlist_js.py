#!/usr/bin/env python3
"""Inject waitlist + quick message JS (clean version)."""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# Remove the broken block injected by the inline python
# Find and remove it
marker_start = html.rfind('<script>\nvar WAITLISTS')
marker_end   = html.rfind('</script>\n</body>')
if marker_start != -1 and marker_end != -1:
    html = html[:marker_start] + '</body>'
    print('Removed broken JS block')

WAITLIST_JS = """<script>
var WAITLISTS = [
  {classId:'l1-mon', className:'Level 1 — Mon 5:30pm', instructor:'Chloe', capacity:12, enrolled:12,
   spotsOpening:'1 cancellation pending',
   entries:[{name:'Nina Patel',since:'2 May',days:11,notified:false},{name:'Zoe Hart',since:'4 May',days:9,notified:false},{name:'Ivy Lam',since:'7 May',days:6,notified:false}]},
  {classId:'dance-fri', className:'Dance — Fri 6:00pm', instructor:'Bambi', capacity:14, enrolled:14,
   spotsOpening:'Consistently full — consider a second class',
   entries:[{name:'Amber Ross',since:'1 May',days:12,notified:true},{name:'Lucy Chen',since:'3 May',days:10,notified:false},{name:'Priya Mehta',since:'5 May',days:8,notified:false},{name:'Sarah Blake',since:'8 May',days:5,notified:false}]},
  {classId:'l2-mon', className:'Level 2 — Mon 6:30pm', instructor:'Chloe', capacity:10, enrolled:9,
   spotsOpening:'1 spot available now',
   entries:[{name:'Mia Torres',since:'6 May',days:7,notified:false},{name:'Kai Nguyen',since:'9 May',days:4,notified:false}]},
  {classId:'virgin-6', className:'Virgin 6 — Sat 10:00am', instructor:'Maz', capacity:8, enrolled:8,
   spotsOpening:'Attendance low — monitor before promoting',
   entries:[{name:'Jess Malone',since:'3 May',days:10,notified:false}]},
];

function renderWaitlistScreen() {
  var el = document.getElementById('waitlist-classes');
  if (!el) return;
  var h = '';
  WAITLISTS.forEach(function(wl) {
    h += '<div class="section" style="margin-bottom:16px;padding:0;">';
    h += '<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">';
    h += '<div>';
    h += '<div style="font-family:var(--font-black,sans-serif);font-size:14px;">' + wl.className + '</div>';
    h += '<div style="font-size:12px;color:var(--grey);margin-top:3px;">' + wl.instructor + ' &nbsp;\xb7&nbsp; ' + wl.enrolled + '/' + wl.capacity + ' enrolled &nbsp;\xb7&nbsp; <span style="color:var(--amber);">' + wl.spotsOpening + '</span></div>';
    h += '</div>';
    h += '<div style="display:flex;gap:8px;">';
    h += '<span style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:6px;background:#1a1200;border:1px solid var(--amber);color:var(--amber);">' + wl.entries.length + ' waiting</span>';
    h += '<button class="btn btn-ghost btn-sm" data-cid="' + wl.classId + '" onclick="notifyWaitlist(this.dataset.cid)">Notify next</button>';
    h += '</div></div>';
    h += '<table style="width:100%;"><thead><tr><th>#</th><th>Student</th><th>Since</th><th>Days waiting</th><th>Status</th><th></th></tr></thead><tbody>';
    wl.entries.forEach(function(e, i) {
      h += '<tr>';
      h += '<td style="color:var(--grey);">' + (i+1) + '</td>';
      h += '<td style="font-weight:500;">' + e.name + '</td>';
      h += '<td style="color:var(--grey);">' + e.since + '</td>';
      h += '<td>' + e.days + ' days</td>';
      h += '<td>' + (e.notified ? '<span class="tag tag-lime">Notified</span>' : '<span class="tag tag-grey">Waiting</span>') + '</td>';
      h += '<td style="text-align:right;">';
      h += '<button class="btn btn-ghost btn-xs" data-cid="' + wl.classId + '" data-i="' + i + '" onclick="promoteWaitlist(this.dataset.cid,+this.dataset.i)">Promote</button> ';
      h += '<button class="btn btn-ghost btn-xs" data-cid="' + wl.classId + '" data-i="' + i + '" onclick="removeWaitlist(this.dataset.cid,+this.dataset.i)">Remove</button>';
      h += '</td></tr>';
    });
    h += '</tbody></table></div>';
  });
  el.innerHTML = h;
}

function notifyWaitlist(classId) {
  var wl = WAITLISTS.find(function(w){return w.classId===classId;});
  if (!wl) return;
  var next = wl.entries.find(function(e){return !e.notified;});
  if (!next) { showToast('All students already notified'); return; }
  next.notified = true;
  renderWaitlistScreen();
  showToast('Notification sent to ' + next.name);
}
function promoteWaitlist(classId, idx) {
  var wl = WAITLISTS.find(function(w){return w.classId===classId;});
  if (!wl) return;
  var s = wl.entries.splice(idx, 1)[0];
  wl.enrolled = Math.min(wl.enrolled + 1, wl.capacity);
  renderWaitlistScreen();
  showToast(s.name + ' promoted into ' + wl.className);
}
function removeWaitlist(classId, idx) {
  var wl = WAITLISTS.find(function(w){return w.classId===classId;});
  if (!wl) return;
  var s = wl.entries.splice(idx, 1)[0];
  renderWaitlistScreen();
  showToast(s.name + ' removed from waitlist');
}

var _qmChannel = 'email';
function openQuickMessageModal() { openModal('modal-quick-message'); }
function qmSetChannel(ch) {
  _qmChannel = ch;
  ['email','push','sms'].forEach(function(c) {
    var btn = document.getElementById('qm-ch-' + c);
    if (btn) { btn.className = 'btn ' + (c===ch ? 'btn-lime' : 'btn-ghost') + ' btn-sm'; btn.style.flex = '1'; }
  });
  var sw = document.getElementById('qm-subject-wrap');
  if (sw) sw.style.display = (ch === 'email') ? 'block' : 'none';
}
function sendQuickMessage() {
  var body = document.getElementById('qm-body');
  if (!body || !body.value.trim()) { showToast('Please write a message first'); return; }
  var to = document.getElementById('qm-to');
  var label = to ? to.options[to.selectedIndex].text : 'selected students';
  closeModal('modal-quick-message');
  body.value = '';
  showToast('Message sent to ' + label);
}
(function() {
  var orig = window.showScreen;
  window.showScreen = function(id) { orig(id); if (id === 'waitlist') setTimeout(renderWaitlistScreen, 10); };
})();
</script>
"""

html = html.replace('</body>', WAITLIST_JS + '</body>', 1)

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_cw2_{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_cw2_{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:200]}')
print('Done')
