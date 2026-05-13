#!/usr/bin/env python3
"""Patch admin-staff.html: daily notifications panel + student detail modal."""
import re

with open('admin-staff.html', 'r') as f:
    html = f.read()

# ── 1. Daily notifications panel ─────────────────────────────────────────────
NOTIF_PANEL = '''      <!-- Daily Notifications -->
      <div id="staff-notif-panel" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-family:'Archivo Black',sans-serif;font-size:14px;">Today's Action Items</div>
          <span style="font-size:12px;color:var(--grey);" id="staff-notif-count">5 pending</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <label id="sn-0" class="staff-notif-item" style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:10px 12px;background:#111;border-radius:8px;">
            <input type="checkbox" style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;" onchange="markStaffNotif(this,0)">
            <div>
              <div style="font-size:13px;font-weight:500;">Retail pickup: Jess Malone — Grip Aid 250ml</div>
              <div style="font-size:12px;color:var(--grey);">Ordered 10 May · Item ready at front desk</div>
            </div>
          </label>
          <label id="sn-1" class="staff-notif-item" style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:10px 12px;background:#111;border-radius:8px;">
            <input type="checkbox" style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;" onchange="markStaffNotif(this,1)">
            <div>
              <div style="font-size:13px;font-weight:500;">New student in Level 2: Sophie Lawson</div>
              <div style="font-size:12px;color:var(--grey);">Enrolled 11 May · First class today — please introduce yourself</div>
            </div>
          </label>
          <label id="sn-2" class="staff-notif-item" style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:10px 12px;background:#1a0a0a;border-radius:8px;border:1px solid #3a1a1a;">
            <input type="checkbox" style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;" onchange="markStaffNotif(this,2)">
            <div>
              <div style="font-size:13px;font-weight:500;color:#ffaaaa;">Injury check-in: Jess Malone — left shoulder</div>
              <div style="font-size:12px;color:var(--grey);">Flagged 9 May · Check before class — avoid inversions if pain present</div>
            </div>
          </label>
          <label id="sn-3" class="staff-notif-item" style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:10px 12px;background:#111;border-radius:8px;">
            <input type="checkbox" style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;" onchange="markStaffNotif(this,3)">
            <div>
              <div style="font-size:13px;font-weight:500;">Exemption request: Dana Park — catch-up Week 3</div>
              <div style="font-size:12px;color:var(--grey);">Requested 10 May · She'll be attending your 6:30pm as catch-up</div>
            </div>
          </label>
          <label id="sn-4" class="staff-notif-item" style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:10px 12px;background:#111;border-radius:8px;">
            <input type="checkbox" style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;" onchange="markStaffNotif(this,4)">
            <div>
              <div style="font-size:13px;font-weight:500;">Homework overdue: 3 students in Level 2 (Week 3)</div>
              <div style="font-size:12px;color:var(--grey);">Due 10 May · Dana Park, Amber Cole, Priya Nair</div>
            </div>
          </label>
        </div>
      </div>

'''

html = html.replace(
    '      <div class="kpi-grid">',
    NOTIF_PANEL + '      <div class="kpi-grid">'
)

# ── 2. Make student names in attendance rows clickable ────────────────────────
# Replace the att-name-text divs to add onclick
html = html.replace(
    '<div class="att-name-text">Jess Malone <span style="font-size:11px;color:var(--grey);font-weight:400;">she/her</span></div>',
    '<div class="att-name-text" style="cursor:pointer;text-decoration:underline dotted;" onclick="openStaffStudentDetail(\'Jess Malone\')">Jess Malone <span style="font-size:11px;color:var(--grey);font-weight:400;">she/her</span></div>'
)
html = html.replace(
    '<div class="att-name-text">Tara Bell <span style="font-size:11px;color:var(--grey);font-weight:400;">she/her</span></div>',
    '<div class="att-name-text" style="cursor:pointer;text-decoration:underline dotted;" onclick="openStaffStudentDetail(\'Tara Bell\')">Tara Bell <span style="font-size:11px;color:var(--grey);font-weight:400;">she/her</span></div>'
)
html = html.replace(
    '<div class="att-name-text">Dana Park <span style="font-size:11px;color:var(--grey);font-weight:400;">she/her</span></div>',
    '<div class="att-name-text" style="cursor:pointer;text-decoration:underline dotted;" onclick="openStaffStudentDetail(\'Dana Park\')">Dana Park <span style="font-size:11px;color:var(--grey);font-weight:400;">she/her</span></div>'
)
html = html.replace(
    '<div class="att-name-text">Nina Torres <span style="font-size:11px;color:var(--grey);font-weight:400;">she/her</span></div>',
    '<div class="att-name-text" style="cursor:pointer;text-decoration:underline dotted;" onclick="openStaffStudentDetail(\'Nina Torres\')">Nina Torres <span style="font-size:11px;color:var(--grey);font-weight:400;">she/her</span></div>'
)

# ── 3. Student detail modal ───────────────────────────────────────────────────
STUDENT_DETAIL_MODAL = '''
<!-- Staff: Student Detail Modal -->
<div class="modal-overlay" id="modal-staff-student-detail">
  <div class="modal modal-lg" style="max-width:640px;">
    <div class="modal-title">
      <span id="staff-sd-name">Jess Malone</span>
      <span id="staff-sd-badge" style="font-size:11px;background:var(--lav);color:#000;border-radius:5px;padding:2px 8px;margin-left:10px;font-family:'Archivo Black',sans-serif;vertical-align:middle;">Level 2</span>
      <button class="modal-close" onclick="closeModal('modal-staff-student-detail')">✕</button>
    </div>

    <!-- Quick stats -->
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px;">
      <div style="background:#111;border-radius:8px;padding:10px 16px;min-width:90px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;color:var(--grey);margin-bottom:4px;">Balance</div>
        <div id="staff-sd-balance" style="font-family:'Archivo Black',sans-serif;font-size:18px;color:var(--red);">-$120</div>
      </div>
      <div style="background:#111;border-radius:8px;padding:10px 16px;min-width:90px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;color:var(--grey);margin-bottom:4px;">Classes Booked</div>
        <div style="font-family:'Archivo Black',sans-serif;font-size:18px;color:var(--lime);">12</div>
      </div>
      <div style="background:#111;border-radius:8px;padding:10px 16px;min-width:90px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;color:var(--grey);margin-bottom:4px;">Attended</div>
        <div style="font-family:'Archivo Black',sans-serif;font-size:18px;">10</div>
      </div>
      <div style="background:#111;border-radius:8px;padding:10px 16px;min-width:90px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;color:var(--grey);margin-bottom:4px;">No-shows</div>
        <div style="font-family:'Archivo Black',sans-serif;font-size:18px;color:var(--amber);">2</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="subtab-bar" style="margin-bottom:16px;">
      <button class="subtab-btn active" id="staff-sd-tab-bookings" onclick="switchStaffSdTab('bookings')">Bookings</button>
      <button class="subtab-btn" id="staff-sd-tab-payments" onclick="switchStaffSdTab('payments')">Payments &amp; Charges</button>
      <button class="subtab-btn" id="staff-sd-tab-notes" onclick="switchStaffSdTab('notes')">Notes</button>
    </div>

    <!-- Bookings tab -->
    <div id="staff-sd-sub-bookings" class="staff-sd-sub active">
      <div class="tbl-section">
        <table>
          <thead><tr><th>Date</th><th>Class</th><th>Type</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>12 May 2025</td><td>Level 2 — Mon 6:30pm</td><td><span class="tag tag-lav" style="font-size:10px;">Course</span></td><td><span class="tag tag-lime">Booked</span></td></tr>
            <tr><td>8 May 2025</td><td>Level 2 — Thu 6:30pm</td><td><span class="tag tag-lav" style="font-size:10px;">Course</span></td><td><span class="tag tag-lime">Attended</span></td></tr>
            <tr><td>5 May 2025</td><td>Level 2 — Mon 6:30pm</td><td><span class="tag tag-lav" style="font-size:10px;">Course</span></td><td><span class="tag tag-red">No-show</span></td></tr>
            <tr><td>1 May 2025</td><td>Level 2 — Thu 6:30pm</td><td><span class="tag tag-lav" style="font-size:10px;">Course</span></td><td><span class="tag tag-lime">Attended</span></td></tr>
            <tr><td>28 Apr 2025</td><td>Level 2 — Mon 6:30pm</td><td><span class="tag tag-lav" style="font-size:10px;">Course</span></td><td><span class="tag tag-lime">Attended</span></td></tr>
            <tr><td>21 Apr 2025</td><td>High Tricks — Mon 7:30pm</td><td><span class="tag tag-grey" style="font-size:10px;">Casual</span></td><td><span class="tag tag-red">No-show</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payments & Charges tab -->
    <div id="staff-sd-sub-payments" class="staff-sd-sub" style="display:none;">
      <div class="tbl-section">
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>7 Apr 2025</td><td>Season 4 — Level 2</td><td style="color:var(--lime);">+$270</td><td><span class="tag tag-lime">Paid</span></td></tr>
            <tr><td>5 May 2025</td><td>No-show fee — Mon Level 2</td><td style="color:var(--red);">-$20</td><td><span class="tag tag-amber">Owing</span></td></tr>
            <tr><td>21 Apr 2025</td><td>No-show fee — High Tricks</td><td style="color:var(--red);">-$20</td><td><span class="tag tag-amber">Owing</span></td></tr>
            <tr><td>21 Apr 2025</td><td>Grip Aid 250ml (retail)</td><td style="color:var(--red);">-$45</td><td><span class="tag tag-amber">Owing</span></td></tr>
            <tr><td>10 Feb 2025</td><td>Season 3 — Level 2</td><td style="color:var(--lime);">+$270</td><td><span class="tag tag-lime">Paid</span></td></tr>
            <tr><td>15 Nov 2024</td><td>Season 2 — Level 2</td><td style="color:var(--lime);">+$270</td><td><span class="tag tag-lime">Paid</span></td></tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;padding:10px 14px;background:#111;border-radius:8px;font-size:13px;display:flex;align-items:center;justify-content:space-between;">
        <span style="color:var(--grey);">Total owing</span>
        <span style="font-family:'Archivo Black',sans-serif;color:var(--red);">$120.00</span>
      </div>
    </div>

    <!-- Notes tab -->
    <div id="staff-sd-sub-notes" class="staff-sd-sub" style="display:none;">
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="background:#1a0a0a;border:1px solid #3a1a1a;border-radius:10px;padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:10px;background:#3a0000;color:#ff8888;border-radius:4px;padding:2px 7px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Injury</span>
            <span style="font-size:11px;color:var(--grey);">Added 9 May 2025 · by Mimi</span>
            <span style="font-size:10px;background:var(--card);color:var(--amber);border-radius:4px;padding:2px 6px;margin-left:auto;">Permanent</span>
          </div>
          <div style="font-size:13px;line-height:1.6;">Left shoulder — avoid overhead inversions and butterfly variations. Monitor for pain in class. Has been signed off by physio for pole but needs checking in before inversions.</div>
        </div>
        <div style="background:#1a1a2a;border:1px solid #2a2a4a;border-radius:10px;padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:10px;background:#0a0a3a;color:#aaaaff;border-radius:4px;padding:2px 7px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Personality &amp; Vibe</span>
            <span style="font-size:11px;color:var(--grey);">Added 3 Mar 2025 · by Chloe</span>
          </div>
          <div style="font-size:13px;line-height:1.6;">Very enthusiastic — tends to rush technique. Responds well to individual attention and clear rationale for why technique matters. Encourage slow practice.</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:10px;background:#1a1a1a;color:var(--grey);border-radius:4px;padding:2px 7px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">General</span>
            <span style="font-size:11px;color:var(--grey);">Added 12 May 2025 · by Chloe</span>
          </div>
          <div style="font-size:13px;line-height:1.6;">Mentioned she's going to Bali in June — may miss 2 weeks. Said she'll let us know dates.</div>
        </div>
      </div>
      <div style="margin-top:12px;text-align:center;font-size:12px;color:var(--grey);">Full notes visible to all instructors. To add or edit notes, contact the studio owner.</div>
    </div>

    <div class="modal-footer" style="margin-top:20px;">
      <button class="btn btn-ghost" onclick="closeModal('modal-staff-student-detail')">Close</button>
    </div>
  </div>
</div>

'''

# Insert before <!-- ===== MODALS ===== -->
html = html.replace(
    '<!-- ===== MODALS ===== -->',
    STUDENT_DETAIL_MODAL + '<!-- ===== MODALS ===== -->'
)

# ── 4. JS functions ───────────────────────────────────────────────────────────
JS = '''
var _staffSdData = {};
function openStaffStudentDetail(name) {
  var balances = {'Jess Malone':'-$120','Tara Bell':'$0','Dana Park':'-$75','Nina Torres':'$0'};
  var levels = {'Jess Malone':'Level 2','Tara Bell':'Level 2','Dana Park':'Level 2 (Drop-in)','Nina Torres':'Level 2'};
  document.getElementById('staff-sd-name').textContent = name;
  var badge = document.getElementById('staff-sd-badge');
  badge.textContent = levels[name] || 'Student';
  var bal = balances[name] || '$0';
  var balEl = document.getElementById('staff-sd-balance');
  balEl.textContent = bal;
  balEl.style.color = bal.startsWith('-') ? 'var(--red)' : 'var(--lime)';
  switchStaffSdTab('bookings');
  openModal('modal-staff-student-detail');
}

function switchStaffSdTab(tab) {
  ['bookings','payments','notes'].forEach(function(t) {
    var btn = document.getElementById('staff-sd-tab-' + t);
    var sub = document.getElementById('staff-sd-sub-' + t);
    if(btn) btn.classList.toggle('active', t === tab);
    if(sub) sub.style.display = t === tab ? '' : 'none';
  });
}

var _staffNotifPending = 5;
function markStaffNotif(cb, idx) {
  var row = document.getElementById('sn-' + idx);
  if(cb.checked) {
    row.style.opacity = '0.45';
    row.style.textDecoration = 'line-through';
    _staffNotifPending = Math.max(0, _staffNotifPending - 1);
  } else {
    row.style.opacity = '';
    row.style.textDecoration = '';
    _staffNotifPending++;
  }
  var el = document.getElementById('staff-notif-count');
  if(el) el.textContent = _staffNotifPending + ' pending';
  if(_staffNotifPending === 0 && el) el.textContent = 'All done ✓';
}
'''

html = html.replace(
    'function openModal(id) {',
    JS + '\nfunction openModal(id) {'
)

with open('admin-staff.html', 'w') as f:
    f.write(html)

print('admin-staff.html patched OK')
