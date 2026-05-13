#!/usr/bin/env python3
"""Patch admin-founder.html via line ranges (avoids quote-escaping issues)."""

with open('admin-founder.html', 'r') as f:
    lines = f.readlines()

# ── 1. Replace notification panel (lines 437-474, 0-indexed 436-473) ─────────
NEW_PANEL_LINES = '''      <!-- Daily Notifications -->
      <div id="daily-notifications" style="background:#111;border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-family:'Archivo Black',sans-serif;font-size:14px;">Today's Action Items</div>
            <span id="notif-badge" style="background:var(--lime);color:#000;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;font-size:11px;font-weight:700;">4</span>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost btn-xs" onclick="openModal('modal-action-log')">View log / + Add</button>
            <button class="btn btn-ghost btn-xs" onclick="toggleNotifList()">Hide</button>
          </div>
        </div>
        <div id="notif-list">
          <div class="notif-action-row" id="ni-0" data-label="New order — Ruby Kim: Pole Grip Aid (Medium)" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,0)" />
            <span style="font-size:18px;line-height:1;">🛍</span>
            <div style="flex:1;">
              <div style="font-size:13px;color:var(--white);">New order — prepare for pickup</div>
              <div style="font-size:12px;color:var(--grey);margin-top:2px;">Ruby Kim ordered Pole Grip Aid (Medium) — not yet collected</div>
            </div>
            <span style="font-size:11px;color:var(--grey);white-space:nowrap;margin-top:1px;">9:32am</span>
          </div>
          <div class="notif-action-row" id="ni-1" data-label="New order — Tara Bell: Duality Crop Top (S)" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,1)" />
            <span style="font-size:18px;line-height:1;">🛍</span>
            <div style="flex:1;">
              <div style="font-size:13px;color:var(--white);">New order — prepare for pickup</div>
              <div style="font-size:12px;color:var(--grey);margin-top:2px;">Tara Bell ordered Duality Crop Top (S) — not yet collected</div>
            </div>
            <span style="font-size:11px;color:var(--grey);white-space:nowrap;margin-top:1px;">8:14am</span>
          </div>
          <div class="notif-action-row" id="ni-2" data-label="New student today — Priya Sharma, Level 1 5:30pm" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,2)" />
            <span style="font-size:18px;line-height:1;">👋</span>
            <div style="flex:1;">
              <div style="font-size:13px;color:var(--white);">New student coming today — please greet</div>
              <div style="font-size:12px;color:var(--grey);margin-top:2px;">Priya Sharma · Level 1 at 5:30pm · Instructor: Chloe · Waiver not yet signed</div>
            </div>
            <span style="font-size:11px;color:var(--lime);white-space:nowrap;margin-top:1px;">Today</span>
          </div>
          <div class="notif-action-row" id="ni-3" data-label="Injury check-in overdue — Jess Malone" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,3)" />
            <span style="font-size:18px;line-height:1;">🩹</span>
            <div style="flex:1;">
              <div style="font-size:13px;color:var(--white);">Injury check-in overdue</div>
              <div style="font-size:12px;color:var(--grey);margin-top:2px;">Jess Malone · right shoulder impingement · check-in was due 17 May</div>
              <button class="btn btn-ghost btn-xs" style="margin-top:6px;" onclick="openStudentDetail(STUDENTS.find(s=>s.id==='jess'))">View Notes</button>
            </div>
            <span style="font-size:11px;color:var(--amber);white-space:nowrap;margin-top:1px;">Overdue</span>
          </div>
          <div class="notif-action-row" id="ni-4" data-label="Exemption request — Dana Park ($75 workshop)" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;">
            <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,4)" />
            <span style="font-size:18px;line-height:1;">💳</span>
            <div style="flex:1;">
              <div style="font-size:13px;color:var(--white);">Payment exemption request</div>
              <div style="font-size:12px;color:var(--grey);margin-top:2px;">Dana Park applied for exemption on $75 workshop fee</div>
              <button class="btn btn-ghost btn-xs" style="margin-top:6px;" onclick="openExemptionReview('Dana Park','$75 workshop fee')">Review request</button>
            </div>
            <span style="font-size:11px;color:var(--grey);white-space:nowrap;margin-top:1px;">2 hrs ago</span>
          </div>
        </div>
        <div id="notif-completed-section" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Completed today</div>
          <div id="notif-completed-list" style="display:flex;flex-direction:column;gap:6px;"></div>
        </div>
      </div>
'''.splitlines(keepends=True)

# Lines 437–474 = indices 436–473 inclusive
lines[436:474] = NEW_PANEL_LINES

# ── 2. Replace markNotifDone JS function (was lines 6872-6881) ────────────────
# After inserting the panel, lines shift. Re-find the function.
content = ''.join(lines)

OLD_FN = '''function markNotifDone(cb) {
  const row = cb.closest('.notif-action-row');
  if (cb.checked) {
    row.style.opacity = '0.4';
    row.style.textDecoration = 'line-through';
  } else {
    row.style.opacity = '';
    row.style.textDecoration = '';
  }
}'''

NEW_FN = '''var _notifPending = 4;
var _notifCompleted = [];

function markNotifDone(cb, idx) {
  var row = document.getElementById('ni-' + idx);
  if(!row) return;
  var label = row.getAttribute('data-label') || ('Item ' + idx);
  if(cb.checked) {
    row.style.display = 'none';
    _notifPending = Math.max(0, _notifPending - 1);
    var now = new Date();
    var h = now.getHours(); var m = String(now.getMinutes()).padStart(2,'0');
    var timeStr = (h % 12 || 12) + ':' + m + (h < 12 ? 'am' : 'pm');
    _notifCompleted.push({label: label, time: timeStr, idx: idx, cb: cb});
    _renderCompleted();
  } else {
    row.style.display = '';
    _notifPending++;
    _notifCompleted = _notifCompleted.filter(function(c){ return c.idx !== idx; });
    _renderCompleted();
  }
  var badge = document.getElementById('notif-badge');
  if(badge) {
    badge.textContent = _notifPending;
    badge.style.background = _notifPending === 0 ? 'var(--grey)' : 'var(--lime)';
  }
}

function _renderCompleted() {
  var sec = document.getElementById('notif-completed-section');
  var list = document.getElementById('notif-completed-list');
  if(!sec || !list) return;
  if(_notifCompleted.length === 0) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  list.innerHTML = _notifCompleted.map(function(c) {
    return '<div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--grey);padding:4px 0;">' +
      '<span style="color:var(--lime);">✓</span>' +
      '<span style="flex:1;">' + c.label + '</span>' +
      '<span>' + c.time + ' · you</span></div>';
  }).join('');
}

function toggleNotifList() {
  var list = document.getElementById('notif-list');
  if(list) list.style.display = list.style.display === 'none' ? '' : 'none';
}

function openExemptionReview(student, amount) {
  var nameEl = document.getElementById('exempt-student-name');
  var amtEl = document.getElementById('exempt-amount');
  if(nameEl) nameEl.textContent = student;
  if(amtEl) amtEl.textContent = amount;
  openModal('modal-exemption-review');
}

function submitExemptionDecision() {
  var decision = document.querySelector('input[name="exempt-decision"]:checked');
  var val = decision ? decision.value : 'approve';
  var msgs = {
    approve: 'Exemption approved — credit applied to account.',
    partial: 'Partial approval — payment plan set up. Student will be notified.',
    deny: 'Request denied — student notified.'
  };
  alert(msgs[val] || 'Decision recorded.');
  closeModal('modal-exemption-review');
}

function switchLogTab(tab) {
  ['today','history','add'].forEach(function(t) {
    var btn = document.getElementById('log-tab-' + t);
    var sub = document.getElementById('log-sub-' + t);
    if(btn) btn.classList.toggle('active', t === tab);
    if(sub) sub.style.display = t === tab ? '' : 'none';
  });
  if(tab === 'today') _syncLogToday();
}

function _syncLogToday() {
  var pendingEl = document.getElementById('log-pending-list');
  var doneEl = document.getElementById('log-done-list');
  var doneEmpty = document.getElementById('log-done-empty');
  if(!pendingEl) return;
  var allItems = [
    {idx:0, label:'New order — prepare for pickup: Ruby Kim, Pole Grip Aid (Medium)'},
    {idx:1, label:'New order — prepare for pickup: Tara Bell, Duality Crop Top (S)'},
    {idx:2, label:'New student coming today — Priya Sharma, Level 1 5:30pm (Chloe to greet)'},
    {idx:3, label:'Injury check-in overdue — Jess Malone, right shoulder'},
    {idx:4, label:'Payment exemption request — Dana Park, $75 workshop fee'}
  ];
  var doneIdxs = _notifCompleted.map(function(c){ return c.idx; });
  var pending = allItems.filter(function(i){ return doneIdxs.indexOf(i.idx) === -1; });
  pendingEl.innerHTML = pending.length ? pending.map(function(i){
    return '<div style="display:flex;align-items:center;gap:10px;font-size:13px;padding:8px 10px;background:#1a1a1a;border-radius:7px;">' +
      '<span style="width:8px;height:8px;border-radius:50%;background:var(--lime);display:inline-block;flex-shrink:0;"></span>' +
      '<span style="flex:1;">' + i.label + '</span></div>';
  }).join('') : '<div style="font-size:13px;color:var(--grey);padding:8px 0;">All done ✓</div>';
  if(_notifCompleted.length) {
    doneEl.innerHTML = _notifCompleted.map(function(c){
      return '<div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--grey);padding:6px 10px;background:#111;border-radius:7px;">' +
        '<span style="color:var(--lime);">✓</span>' +
        '<span style="flex:1;text-decoration:line-through;">' + c.label + '</span>' +
        '<span>' + c.time + ' · you</span></div>';
    }).join('');
    if(doneEmpty) doneEmpty.style.display = 'none';
  } else {
    doneEl.innerHTML = '';
    if(doneEmpty) doneEmpty.style.display = '';
  }
}

function addManualActionItem() {
  var desc = document.getElementById('new-item-desc');
  var assign = document.getElementById('new-item-assign');
  if(!desc || !desc.value.trim()) { alert('Please enter a description.'); return; }
  var label = desc.value.trim();
  if(assign && assign.value !== 'Anyone on duty') label += ' — assign: ' + assign.value;
  var idx = 100 + Math.floor(Math.random() * 900);
  var row = document.createElement('div');
  row.className = 'notif-action-row';
  row.id = 'ni-' + idx;
  row.setAttribute('data-label', label);
  row.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);';
  row.innerHTML = '<input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,' + idx + ')" />' +
    '<span style="font-size:18px;line-height:1;">📋</span>' +
    '<div style="flex:1;"><div style="font-size:13px;color:var(--white);">' + label + '</div>' +
    '<div style="font-size:12px;color:var(--grey);margin-top:2px;">Added manually</div></div>' +
    '<span style="font-size:11px;color:var(--grey);white-space:nowrap;margin-top:1px;">Now</span>';
  var notifList = document.getElementById('notif-list');
  if(notifList) notifList.insertBefore(row, notifList.lastElementChild);
  _notifPending++;
  var badge = document.getElementById('notif-badge');
  if(badge) { badge.textContent = _notifPending; badge.style.background = 'var(--lime)'; }
  desc.value = '';
  closeModal('modal-action-log');
}'''

if OLD_FN in content:
    content = content.replace(OLD_FN, NEW_FN)
    print('JS function replaced OK')
else:
    print('ERROR: markNotifDone function not found — check exact text')

# ── 3. Insert modals before </body> ──────────────────────────────────────────
EXEMPTION_AND_LOG_MODALS = '''
<!-- Exemption Review Modal -->
<div class="modal-overlay" id="modal-exemption-review">
  <div class="modal" style="max-width:480px;">
    <div class="modal-title">Payment Exemption Request <button class="modal-close" onclick="closeModal('modal-exemption-review')">✕</button></div>
    <div style="background:#1a1a1a;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
      <div style="font-size:12px;color:var(--grey);margin-bottom:4px;">Student</div>
      <div style="font-size:14px;font-weight:600;" id="exempt-student-name">Dana Park</div>
      <div style="font-size:12px;color:var(--grey);margin-top:10px;margin-bottom:4px;">Amount requested</div>
      <div style="font-size:14px;" id="exempt-amount">$75 workshop fee</div>
      <div style="font-size:12px;color:var(--grey);margin-top:10px;margin-bottom:4px;">Reason provided</div>
      <div style="font-size:13px;color:#ccc;">Financial hardship — requested partial credit or payment plan</div>
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:10px;">Decision</div>
      <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;margin-bottom:8px;padding:10px 12px;background:#111;border-radius:8px;">
        <input type="radio" name="exempt-decision" value="approve" checked style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;">
        <div><div style="font-size:13px;font-weight:500;">Approve — apply full credit to account</div></div>
      </label>
      <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;margin-bottom:8px;padding:10px 12px;background:#111;border-radius:8px;">
        <input type="radio" name="exempt-decision" value="partial" style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;">
        <div><div style="font-size:13px;font-weight:500;">Approve partial — set up payment plan</div></div>
      </label>
      <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:10px 12px;background:#111;border-radius:8px;">
        <input type="radio" name="exempt-decision" value="deny" style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;">
        <div><div style="font-size:13px;font-weight:500;">Deny — notify student</div></div>
      </label>
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Note to student (optional)</div>
      <textarea rows="2" placeholder="Add a message for the student..." style="width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;resize:vertical;line-height:1.5;box-sizing:border-box;"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-exemption-review')">Cancel</button>
      <button class="btn btn-lime" style="flex:1" onclick="submitExemptionDecision()">Confirm Decision</button>
    </div>
  </div>
</div>

<!-- Action Items Log Modal -->
<div class="modal-overlay" id="modal-action-log">
  <div class="modal modal-lg" style="max-width:640px;">
    <div class="modal-title">Action Items Log <button class="modal-close" onclick="closeModal('modal-action-log')">✕</button></div>
    <div class="subtab-bar" style="margin-bottom:16px;">
      <button class="subtab-btn active" id="log-tab-today" onclick="switchLogTab('today')">Today</button>
      <button class="subtab-btn" id="log-tab-history" onclick="switchLogTab('history')">History</button>
      <button class="subtab-btn" id="log-tab-add" onclick="switchLogTab('add')">+ Add item</button>
    </div>
    <div id="log-sub-today">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Pending</div>
      <div id="log-pending-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;"></div>
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Completed</div>
      <div id="log-done-list" style="display:flex;flex-direction:column;gap:6px;"></div>
      <div id="log-done-empty" style="font-size:13px;color:var(--grey);padding:8px 0;">No items completed yet today.</div>
    </div>
    <div id="log-sub-history" style="display:none;">
      <div class="tbl-section">
        <table>
          <thead><tr><th>Date</th><th>Item</th><th>Completed by</th><th>Time</th></tr></thead>
          <tbody>
            <tr><td style="color:var(--grey);">12 May</td><td>New order — Jess Malone: Pole Shorts (M)</td><td>Mimi</td><td style="color:var(--grey);">10:14am</td></tr>
            <tr><td style="color:var(--grey);">11 May</td><td>Injury check-in — Ruby Kim</td><td>Chloe</td><td style="color:var(--grey);">6:45pm</td></tr>
            <tr><td style="color:var(--grey);">11 May</td><td>New order — Nina Torres: Grip Aid (Small)</td><td>Mimi</td><td style="color:var(--grey);">9:02am</td></tr>
            <tr><td style="color:var(--grey);">10 May</td><td>Exemption request — Amber Cole ($40)</td><td>Mimi</td><td style="color:var(--grey);">2:30pm</td></tr>
            <tr><td style="color:var(--grey);">9 May</td><td>New student today — Zoe Clarke, Level 1</td><td>Chloe</td><td style="color:var(--grey);">5:28pm</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div id="log-sub-add" style="display:none;">
      <div style="margin-bottom:14px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Type</div>
        <select id="new-item-type" style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;">
          <option value="general">General task</option>
          <option value="retail">Retail / pickup</option>
          <option value="student">Student related</option>
          <option value="injury">Injury / health</option>
          <option value="payment">Payment / billing</option>
        </select>
      </div>
      <div style="margin-bottom:14px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Description</div>
        <input type="text" id="new-item-desc" placeholder="Describe the action item..." style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;box-sizing:border-box;" />
      </div>
      <div style="margin-bottom:18px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Assign to</div>
        <select id="new-item-assign" style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;">
          <option>Anyone on duty</option>
          <option>Mimi</option>
          <option>Chloe</option>
          <option>Viv</option>
          <option>Bambi</option>
          <option>Violet</option>
        </select>
      </div>
      <button class="btn btn-lime" style="width:100%;" onclick="addManualActionItem()">Add Action Item</button>
    </div>
    <div class="modal-footer" style="margin-top:20px;">
      <button class="btn btn-ghost" onclick="closeModal('modal-action-log')">Close</button>
    </div>
  </div>
</div>

'''

content = content.replace('</body>', EXEMPTION_AND_LOG_MODALS + '</body>', 1)

with open('admin-founder.html', 'w') as f:
    f.write(content)

if 'New order — prepare for pickup' in content and 'modal-action-log' in content:
    print('admin-founder.html patched OK')
else:
    print('ERROR: check file')
