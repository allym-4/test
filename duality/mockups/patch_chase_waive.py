#!/usr/bin/env python3
"""
Fix Chase and Waive buttons throughout billing screens.
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ─── 1. Fix Chase buttons in billing-outstanding (alert -> openChaseModal) ───
CHASE_FIXES = [
    ("alert('Chase sent to Jess Malone')",   "openChaseModal('Jess Malone','Season 4 — Level 2 (balance)','$120',1)"),
    ("alert('Chase sent to Kylie Rhodes')",  "openChaseModal('Kylie Rhodes','Season 4 + no-show fees','$95',2)"),
    ("alert('Chase sent to Dana Park')",     "openChaseModal('Dana Park','Choreo Intensive Workshop','$75',0)"),
    ("alert('Chase sent to Amber Cole')",    "openChaseModal('Amber Cole','No-show fee × 2','$50',0)"),
    ("alert('Chase sent to Hannah Webb')",   "openChaseModal('Hannah Webb','Season 3 — Level 1 (late enrolment)','$40',0)"),
    ("alert('Chase sent to Tara Bell')",     "openChaseModal('Tara Bell','Workshop — balance owing','$30',1)"),
    ("alert('Chase sent to Nina Torres')",   "openChaseModal('Nina Torres','Casual drop-in unpaid','$35',0)"),
    ("alert('Chase sent to Sophie Lawson')", "openChaseModal('Sophie Lawson','No-show fee','$25',0)"),
    ("alert('Chase sent to Ruby Kim')",      "openChaseModal('Ruby Kim','Dance casual','$35',0)"),
    ("alert('Chase sent to Mia Santos')",    "openChaseModal('Mia Santos','High Tricks workshop deposit','$50',0)"),
]
for old, new in CHASE_FIXES:
    if old in html:
        html = html.replace(old, new, 1)
        print(f'  Chase fixed: {new[:55]}')
    else:
        print(f'  MISSING: {old}')

# ─── 2. Wire Waive buttons in billing-outstanding (per-row using unique snippets) ───
# Each row has a unique desc+amount combo; find the row and add onclick to its Waive button.
OUTSTANDING_WAIVE = [
    ("Season 4 — Level 2 (balance)</td><td class=\"bal-neg\">$120</td>", "Jess Malone",  "$120"),
    ("Season 4 + 2× no-show fees</td><td class=\"bal-neg\">$95</td>",    "Kylie Rhodes", "$95"),
    ("Choreo Intensive Workshop</td><td class=\"bal-neg\">$75</td>",           "Dana Park",    "$75"),
    ("No-show fee × 2</td><td class=\"bal-neg\">$50</td>",               "Amber Cole",   "$50"),
    ("Season 3 — Level 1 (late enrolment)</td><td class=\"bal-neg\">$40</td>", "Hannah Webb", "$40"),
    ("Workshop — balance owing</td><td class=\"bal-neg\">$30</td>",       "Tara Bell",    "$30"),
    ("Casual drop-in unpaid</td><td class=\"bal-neg\">$35</td>",               "Nina Torres",  "$35"),
    ("No-show fee</td><td class=\"bal-neg\">$25</td>",                         "Sophie Lawson","$25"),
    ("Dance casual</td><td class=\"bal-neg\">$35</td>",                        "Ruby Kim",     "$35"),
    ("High Tricks workshop deposit</td><td class=\"bal-neg\">$50</td>",        "Mia Santos",   "$50"),
]
for snippet, student, amount in OUTSTANDING_WAIVE:
    idx = html.find(snippet)
    if idx == -1:
        print(f'  MISSING outstanding row: {student}'); continue
    row_end = html.find('</tr>', idx)
    row = html[idx:row_end]
    # Replace exactly one bare Waive button in this row
    new_row = row.replace(
        'class="btn btn-ghost btn-xs">Waive</button>',
        f'class="btn btn-ghost btn-xs" onclick="openWaiveModal(\'{student}\',\'{amount} outstanding\',\'{amount}\',this)">Waive</button>',
        1
    )
    if new_row == row:
        print(f'  Waive button not found in row: {student}')
    else:
        html = html[:idx] + new_row + html[row_end:]
        print(f'  Waive wired: {student} {amount}')

# ─── 3. Wire Waive / Charge Now in no-shows table ────────────────────────────
NOSHOW_ROWS = [
    ("Ruby Kim</td><td>Dance</td><td style=\"color:var(--grey)\">12 May",    "Ruby Kim",   "Dance",   "12 May"),
    ("Amber Cole</td><td>Level 1</td><td style=\"color:var(--grey)\">9 May", "Amber Cole", "Level 1", "9 May"),
    ("Amber Cole</td><td>Level 1</td><td style=\"color:var(--grey)\">2 May", "Amber Cole", "Level 1", "2 May"),
    ("Jess Malone</td><td>Dance</td><td style=\"color:var(--grey)\">28 Apr", "Jess Malone","Dance",   "28 Apr"),
    ("Tara Bell</td><td>Level 2</td><td style=\"color:var(--grey)\">21 Apr", "Tara Bell",  "Level 2", "21 Apr"),
]
for snippet, student, cls, date in NOSHOW_ROWS:
    idx = html.find(snippet)
    if idx == -1:
        print(f'  MISSING no-show row: {student} {date}'); continue
    row_end = html.find('</tr>', idx)
    row = html[idx:row_end]
    new_row = row.replace(
        'class="btn btn-ghost btn-xs">Waive</button> <button class="btn btn-ghost btn-xs">Charge Now</button>',
        f'class="btn btn-ghost btn-xs" onclick="openWaiveModal(\'{student}\',\'No-show — {cls} {date}\',\'$25\',this)">Waive</button> '
        f'<button class="btn btn-lime btn-xs" onclick="chargeNowFee(\'{student}\',\'{cls} {date}\',this)">Charge Now</button>'
    )
    if new_row == row:
        print(f'  No-show buttons not found: {student} {date}')
    else:
        html = html[:idx] + new_row + html[row_end:]
        print(f'  No-show wired: {student} {date}')

# ─── 4. Wire Waive & Refund in no-shows (already-charged rows) ───────────────
WAIVE_REFUND_ROWS = [
    ("Hannah Webb</td><td>Level 1</td><td style=\"color:var(--grey)\">14 Apr", "Hannah Webb", "Level 1 no-show 14 Apr"),
    ("Kylie Rhodes</td><td>Level 2</td><td style=\"color:var(--grey)\">7 Apr",  "Kylie Rhodes","Level 2 no-show 7 Apr"),
    ("Dana Park</td><td>High Tricks</td><td style=\"color:var(--grey)\">24 Mar","Dana Park",   "High Tricks no-show 24 Mar"),
]
for snippet, student, desc in WAIVE_REFUND_ROWS:
    idx = html.find(snippet)
    if idx == -1:
        print(f'  MISSING waive&refund: {student}'); continue
    row_end = html.find('</tr>', idx)
    row = html[idx:row_end]
    new_row = row.replace(
        'class="btn btn-ghost btn-xs">Waive &amp; Refund</button>',
        f'class="btn btn-ghost btn-xs" onclick="openWaiveModal(\'{student}\',\'{desc}\',\'$25\',this,true)">Waive &amp; Refund</button>'
    )
    if new_row == row:
        print(f'  Waive & Refund not found: {student}')
    else:
        html = html[:idx] + new_row + html[row_end:]
        print(f'  Waive & Refund wired: {student}')

# ─── 5. Add modal-waive HTML + JS before </body> ─────────────────────────────
WAIVE_MODAL = '''
<div class="modal-overlay" id="modal-waive">
  <div class="modal" style="max-width:460px;">
    <div class="modal-title">Waive Charge <button class="modal-close" onclick="closeModal(\'modal-waive\')">&#x2715;</button></div>
    <div style="background:#1a1a1a;border-radius:8px;padding:14px 16px;margin-bottom:18px;">
      <div style="font-size:15px;font-weight:600;" id="waive-student-name">&#x2014;</div>
      <div style="font-size:13px;color:var(--grey);margin-top:3px;" id="waive-description">&#x2014;</div>
      <div style="font-size:22px;font-weight:700;color:#ff6b6b;margin-top:8px;" id="waive-amount">&#x2014;</div>
    </div>
    <div id="waive-refund-notice" style="display:none;background:#1a2a1a;border:1px solid var(--lime);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#9ef09e;">
      This fee has already been charged. Waiving will issue a credit back to the student\'s account.
    </div>
    <div class="field">
      <label>Reason for waiving</label>
      <select id="waive-reason" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:14px;padding:10px 14px;">
        <option value="">Select a reason&#x2026;</option>
        <option value="goodwill">Goodwill gesture</option>
        <option value="first-time">First-time student / didn\'t know the policy</option>
        <option value="error">Admin or system error</option>
        <option value="complaint">Student complaint &#x2014; resolved by waiving</option>
        <option value="loyalty">Long-term student loyalty</option>
        <option value="medical">Medical / emergency circumstance</option>
        <option value="other">Other (add note below)</option>
      </select>
    </div>
    <div class="field">
      <label>Internal note (optional)</label>
      <textarea id="waive-note" rows="2" placeholder="e.g. Student called in &#x2014; genuine emergency" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 14px;resize:vertical;box-sizing:border-box;"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal(\'modal-waive\')">Cancel</button>
      <button class="btn" id="waive-confirm-btn" style="background:#e05555;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-family:\'Archivo Black\',sans-serif;font-size:13px;cursor:pointer;" onclick="confirmWaive()">Confirm Waive</button>
    </div>
  </div>
</div>
'''

WAIVE_JS = '''<script>
var _waiveData = {};
function openWaiveModal(student, description, amount, triggerBtn, isRefund) {
  _waiveData = { student: student, description: description, amount: amount, triggerBtn: triggerBtn, isRefund: !!isRefund };
  document.getElementById('waive-student-name').textContent = student;
  document.getElementById('waive-description').textContent = description;
  document.getElementById('waive-amount').textContent = amount;
  document.getElementById('waive-reason').value = '';
  document.getElementById('waive-note').value = '';
  document.getElementById('waive-reason').style.borderColor = '';
  document.getElementById('waive-refund-notice').style.display = isRefund ? 'block' : 'none';
  var btn = document.getElementById('waive-confirm-btn');
  btn.textContent = isRefund ? 'Confirm Waive & Refund' : 'Confirm Waive';
  openModal('modal-waive');
}
function confirmWaive() {
  var reason = document.getElementById('waive-reason').value;
  if (!reason) { document.getElementById('waive-reason').style.borderColor = '#ff6b6b'; return; }
  document.getElementById('waive-reason').style.borderColor = '';
  closeModal('modal-waive');
  if (_waiveData.triggerBtn) {
    var row = _waiveData.triggerBtn.closest('tr');
    if (row) { row.style.transition = 'opacity 0.3s'; row.style.opacity = '0'; setTimeout(function() { row.remove(); }, 300); }
  }
  var msg = _waiveData.isRefund
    ? _waiveData.amount + ' credit issued to ' + _waiveData.student
    : _waiveData.amount + ' charge waived for ' + _waiveData.student;
  showToast(msg);
}
function chargeNowFee(student, description, triggerBtn) {
  if (!confirm('Charge $25 no-show fee to ' + student + ' (' + description + ')?')) return;
  if (triggerBtn) {
    var row = triggerBtn.closest('tr');
    if (row) {
      var cells = row.querySelectorAll('td');
      if (cells[5]) cells[5].innerHTML = '<span class="tag tag-lime">Charged</span>';
      if (cells[6]) cells[6].innerHTML = '<button class="btn btn-ghost btn-xs" onclick="openWaiveModal(\'' + student + '\',\'' + description + '\',\'$25\',this,true)">Waive &amp; Refund</button>';
    }
  }
  showToast('$25 fee charged to ' + student);
}
function showToast(msg) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1a1a1a;border:1px solid var(--lime);color:var(--white);font-size:13px;padding:12px 20px;border-radius:10px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.6);white-space:nowrap;';
  document.body.appendChild(t);
  setTimeout(function(){ t.style.transition='opacity 0.4s'; t.style.opacity='0'; }, 2200);
  setTimeout(function(){ t.remove(); }, 2700);
}
</script>
'''

html = html.replace('</body>', WAIVE_MODAL + WAIVE_JS + '</body>', 1)
print('Added modal-waive + JS')

# ─── 6. Safety + validate ─────────────────────────────────────────────────────
assert 'modal-waive' in html
assert 'openWaiveModal' in html
assert 'confirmWaive' in html
assert 'chargeNowFee' in html
assert 'showToast' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkcw{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkcw{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: "+r.stderr[:300]}')
print('Written.')
