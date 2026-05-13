#!/usr/bin/env python3
"""
Patch: Realistic payment scenarios across students.
1. Update specific students in STUDENTS array with varied balance + paymentPlan data
2. Add DOMContentLoaded refresh that re-renders balance cells from STUDENTS data
3. Update renderStudentPayments to use paymentPlan field
4. Add PP badge + ! alert to balance cells
"""
import re, subprocess

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Update specific students in STUDENTS array with payment scenarios
# ─────────────────────────────────────────────────────────────────────────────
# Scenarios:
#  bellecurrie     — PP overdue  (-$120)
#  jessicacoffey   — PP active on track (bal 0, plan ongoing)
#  jessicaneary    — PP overdue (-$75)
#  kyliedaisog     — direct balance owing, no plan (-$50)
#  danaebeatie     — direct balance owing, no plan (-$25, no-show fee)
#  alexandradickie — PP active on track (bal 0)
#  sophiebrown     — account credit (+$18)
#  aishukripa      — fully paid up ($0, no plan) ← fix the inconsistency
#  hannahzywczak   — PP pending approval (bal 0, plan awaiting)

STUDENT_UPDATES = {
    'bellecurrie': {
        'balance': -120,
        'status': "'Owing'",
        'paymentPlan': "{status:'overdue',total:180,paid:60,instalments:3,instAmt:60,nextDue:'1 Jun 2026'}",
        'tags': "['Owing']",
    },
    'jessicacoffey': {
        'balance': 0,
        'status': "'Active'",
        'paymentPlan': "{status:'active',total:150,paid:75,instalments:2,instAmt:75,nextDue:'1 Jul 2026'}",
        'tags': "[]",
    },
    'jessicaneary': {
        'balance': -75,
        'status': "'Owing'",
        'paymentPlan': "{status:'overdue',total:180,paid:105,instalments:3,instAmt:60,nextDue:'1 Jun 2026'}",
        'tags': "['Owing']",
    },
    'kyliedaisog': {
        'balance': -50,
        'status': "'Owing'",
        'paymentPlan': 'null',
        'tags': "['Owing']",
    },
    'danaebeatie': {
        'balance': -25,
        'status': "'Owing'",
        'paymentPlan': 'null',
        'tags': "['Owing']",
    },
    'alexandradickie': {
        'balance': 0,
        'status': "'Active'",
        'paymentPlan': "{status:'active',total:210,paid:140,instalments:3,instAmt:70,nextDue:'1 Jul 2026'}",
        'tags': "[]",
    },
    'sophiebrown': {
        'balance': 18,
        'status': "'Active'",
        'paymentPlan': 'null',
        'tags': "[]",
    },
    'hannahzywczak': {
        'balance': 0,
        'status': "'Active'",
        'paymentPlan': "{status:'pending',total:150,paid:0,instalments:2,instAmt:75,nextDue:'Pending approval'}",
        'tags': "[]",
    },
}

for sid, updates in STUDENT_UPDATES.items():
    marker = f'id:"{sid}"'
    idx = html.find(marker)
    if idx == -1:
        print(f'  MISSING: {sid}')
        continue
    # Find end of this object (next }, on same logical line)
    line_end = html.find('\n', idx)
    line = html[idx:line_end]

    # Update balance
    line = re.sub(r"balance:\s*[-\d]+", f"balance:{updates['balance']}", line)
    # Update status
    line = re.sub(r"status:'[^']*'", f"status:{updates['status']}", line)
    # Update tags
    line = re.sub(r"tags:\[[^\]]*\]", f"tags:{updates['tags']}", line)
    # Add or update paymentPlan field
    if 'paymentPlan:' in line:
        line = re.sub(r'paymentPlan:\{[^}]*\}|paymentPlan:null', f"paymentPlan:{updates['paymentPlan']}", line)
    else:
        # Insert before closing }
        line = line.rstrip()
        if line.endswith('},'):
            line = line[:-2] + f", paymentPlan:{updates['paymentPlan']} }},"
        elif line.endswith('}'):
            line = line[:-1] + f", paymentPlan:{updates['paymentPlan']} }}"

    html = html[:idx] + line + html[line_end:]
    print(f'  Updated: {sid} (bal={updates["balance"]}, plan={updates["paymentPlan"][:20]}...)')

# Also clear Aishu's payment data (she should show as fully paid, no plan)
aishu_idx = html.find('id:"aishukripa"')
if aishu_idx != -1:
    line_end = html.find('\n', aishu_idx)
    line = html[aishu_idx:line_end]
    if 'paymentPlan:' not in line:
        line = line.rstrip()
        if line.endswith('},'):
            line = line[:-2] + ', paymentPlan:null },'
        elif line.endswith('}'):
            line = line[:-1] + ', paymentPlan:null }'
        html = html[:aishu_idx] + line + html[line_end:]
    print('  Updated: aishukripa (null plan — fully paid)')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Update renderStudentPayments to use student.paymentPlan
# ─────────────────────────────────────────────────────────────────────────────
OLD_RENDER = "function renderStudentPayments(student) {"
NEW_RENDER = """function renderStudentPayments(student) {
  var bal = student.balance || 0;
  var plan = student.paymentPlan || null;
  var numClasses = (student.classes || []).length;
  var classNames = (student.classes || []).slice(0, 2).join(' + ') || student.level || 'Season 4';

  var planHTML = '';
  var txHTML = '';

  if (plan && plan.status !== 'pending') {
    var isOverdue = plan.status === 'overdue';
    var inst2Style = isOverdue
      ? 'background:#1a1200;border:1px solid var(--amber);'
      : 'background:#111;border:1px solid var(--border);';
    var inst2Color = isOverdue ? 'color:var(--amber);' : 'color:var(--grey);';
    var inst2Text  = isOverdue ? plan.instAmt + ' overdue' : plan.instAmt + ' pending';
    var paidSoFar  = plan.paid;
    var remaining  = plan.total - paidSoFar;

    planHTML = '<div style="font-family:\\'Archivo Black\\',sans-serif;font-size:14px;margin-bottom:10px;">Active Payment Plan</div>'
      + '<div class="section" style="margin-bottom:24px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">'
      + '<div><div style="font-weight:600;font-size:14px;">Season 4 — ' + classNames + ' (' + plan.instalments + '× instalments)</div>'
      + '<div style="font-size:12px;color:var(--grey);margin-top:3px;">Total $' + plan.total + ' · Paid $' + paidSoFar + ' · Remaining $' + remaining + '</div></div>'
      + '<span class="tag ' + (isOverdue ? 'tag-amber' : 'tag-lime') + '">' + (isOverdue ? 'Overdue' : 'On Track') + '</span></div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">'
      + '<div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 12px;"><div style="font-size:11px;color:var(--grey);margin-bottom:3px;">Instalment 1</div><div style="font-size:14px;font-weight:700;color:var(--lime);">$' + plan.instAmt + ' ✓</div><div style="font-size:11px;color:var(--grey);margin-top:2px;">Paid 11 May 2026</div></div>'
      + '<div style="' + inst2Style + 'border-radius:8px;padding:10px 12px;"><div style="font-size:11px;color:var(--grey);margin-bottom:3px;">Instalment 2</div><div style="font-size:14px;font-weight:700;' + inst2Color + '">' + inst2Text + '</div><div style="font-size:11px;color:var(--grey);margin-top:2px;">Due ' + plan.nextDue + '</div></div>'
      + '<div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 12px;"><div style="font-size:11px;color:var(--grey);margin-bottom:3px;">Instalment 3</div><div style="font-size:14px;font-weight:700;color:var(--grey);">$' + plan.instAmt + ' pending</div><div style="font-size:11px;color:var(--grey);margin-top:2px;">Due 1 Jul 2026</div></div>'
      + '</div>'
      + '<div style="margin-top:12px;display:flex;gap:8px;">'
      + '<button class="btn btn-ghost btn-xs" onclick="openModal(\\'modal-manual-payment\\')">Record payment</button>'
      + '<button class="btn btn-ghost btn-xs" onclick="alert(\\'Reminder sent to ' + student.name + '\\')">Send reminder</button>'
      + '</div></div>';

    if (isOverdue) {
      txHTML += '<tr><td style="color:var(--grey);white-space:nowrap;">1 Jun 2026</td><td>Instalment 2 — overdue</td><td style="color:var(--grey);">S4</td><td><span class="tag tag-red" style="font-size:10px;">Overdue</span></td><td class="bal-neg">$' + plan.instAmt + '</td><td>—</td><td class="bal-neg">−$' + Math.abs(bal) + '</td></tr>';
    }
    txHTML += '<tr><td style="color:var(--grey);white-space:nowrap;">11 May 2026</td><td>Season 4 — ' + classNames + ' · Instalment 1</td><td style="color:var(--grey);">S4</td><td><span class="tag tag-lime" style="font-size:10px;">Payment</span></td><td>—</td><td class="bal-pos">$' + plan.instAmt + '</td><td style="color:var(--lime);">$0</td></tr>'
      + '<tr><td style="color:var(--grey);white-space:nowrap;">11 May 2026</td><td>Season 4 enrolment — ' + classNames + ' (' + plan.instalments + '× plan)</td><td style="color:var(--grey);">S4</td><td><span class="tag tag-lav" style="font-size:10px;">Invoice</span></td><td class="bal-neg">$' + plan.total + '</td><td>—</td><td class="bal-neg">−$' + plan.total + '</td></tr>';

  } else if (plan && plan.status === 'pending') {
    planHTML = '<div class="section" style="margin-bottom:24px;background:#1a1200;border-color:var(--amber);">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '<div><div style="font-weight:600;font-size:14px;">Season 4 — ' + classNames + ' (payment plan requested)</div>'
      + '<div style="font-size:12px;color:var(--grey);margin-top:3px;">$' + plan.total + ' total · ' + plan.instalments + ' × $' + plan.instAmt + ' · Awaiting studio approval</div></div>'
      + '<span class="tag tag-amber">Pending</span></div></div>';
    txHTML += '<tr><td style="color:var(--grey);">11 May 2026</td><td>Season 4 enrolment — payment plan request pending</td><td style="color:var(--grey);">S4</td><td><span class="tag tag-amber" style="font-size:10px;">Pending</span></td><td class="bal-neg">$' + plan.total + '</td><td>—</td><td class="bal-neg">−$' + plan.total + '</td></tr>';

  } else if (bal < 0) {
    // Direct balance owing, no plan
    txHTML += '<tr><td style="color:var(--grey);white-space:nowrap;">22 May 2026</td><td>No-show / late fee</td><td style="color:var(--grey);">S4</td><td><span class="tag tag-red" style="font-size:10px;">Fee</span></td><td class="bal-neg">$' + Math.abs(bal) + '</td><td>—</td><td class="bal-neg">−$' + Math.abs(bal) + '</td></tr>';
  } else if (bal > 0) {
    txHTML += '<tr><td style="color:var(--grey);white-space:nowrap;">14 Jan 2026</td><td>Account credit — missed class refund</td><td style="color:var(--grey);">S3</td><td><span class="tag tag-amber" style="font-size:10px;">Credit</span></td><td>—</td><td class="bal-pos">$' + bal + '</td><td class="bal-pos">+$' + bal + '</td></tr>';
  }

  // Previous seasons (always shown)
  txHTML += '<tr style="background:#0a0a0a;"><td style="color:var(--grey);white-space:nowrap;">4 Mar 2026</td><td>Season 3 enrolment — ' + (student.level || classNames) + ' · paid in full</td><td style="color:var(--grey);">S3</td><td><span class="tag tag-lime" style="font-size:10px;">Payment</span></td><td>—</td><td class="bal-pos">$165</td><td style="color:var(--lime);">$0</td></tr>'
    + '<tr style="background:#0a0a0a;"><td style="color:var(--grey);white-space:nowrap;">4 Mar 2026</td><td>Season 3 enrolment invoice</td><td style="color:var(--grey);">S3</td><td><span class="tag tag-lav" style="font-size:10px;">Invoice</span></td><td class="bal-neg">$165</td><td>—</td><td class="bal-neg">−$165</td></tr>'
    + '<tr style="background:#0a0a0a;"><td style="color:var(--grey);white-space:nowrap;">5 Nov 2025</td><td>Season 2 enrolment — paid in full</td><td style="color:var(--grey);">S2</td><td><span class="tag tag-lime" style="font-size:10px;">Payment</span></td><td>—</td><td class="bal-pos">$145</td><td style="color:var(--lime);">$0</td></tr>';

  // Update outstanding KPI
  var kpiEl = document.getElementById('sd-balance-large');
  if (kpiEl) {
    kpiEl.textContent = bal < 0 ? '−$' + Math.abs(bal) : bal > 0 ? '+$' + bal + ' credit' : '$0';
    kpiEl.className = 'kpi-value ' + (bal < 0 ? 'bal-neg' : bal > 0 ? 'bal-pos' : '');
    kpiEl.closest('.kpi').className = 'kpi ' + (bal < 0 ? 'kpi-red' : bal > 0 ? 'kpi-lime' : '');
  }

  var planEl = document.getElementById('sd-payment-plan-section');
  if (planEl) planEl.innerHTML = planHTML;
  var txEl = document.getElementById('sd-tx-tbody');
  if (txEl) txEl.innerHTML = txHTML;
}"""

# Replace the old function (find it and replace up to the closing brace)
start = html.find('function renderStudentPayments(student) {')
if start != -1:
    # Find the end — look for the next top-level function
    end = html.find('\n\n// =====', start)
    if end == -1:
        end = html.find('\nfunction ', start + 50)
    html = html[:start] + NEW_RENDER + '\n\n' + html[end:]
    print('Replaced renderStudentPayments function')
else:
    print('ERROR: renderStudentPayments not found')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Add a DOMContentLoaded hook to refresh balance cells from STUDENTS data
#    and update sd-balance-display in the students table
# ─────────────────────────────────────────────────────────────────────────────
BALANCE_REFRESH_JS = """
<script>
// Re-render balance cells in students table from STUDENTS array data
// Adds PP badge and ! alert based on paymentPlan field
document.addEventListener('DOMContentLoaded', function() {
  var rows = document.querySelectorAll('#students-tbody tr[data-student-id]');
  rows.forEach(function(row) {
    var id = row.getAttribute('data-student-id');
    var s = STUDENTS.find(function(x){ return x.id === id; });
    if (!s) return;
    // Find the balance cell (5th td, index 4)
    var cells = row.querySelectorAll('td');
    var balCell = cells[4];
    if (!balCell) return;

    var bal = s.balance || 0;
    var plan = s.paymentPlan || null;
    var html = '';

    if (bal < 0) {
      html = '<span class="bal-neg" style="font-weight:600;">−$' + Math.abs(bal) + '</span>';
      html += ' <span title="Amount owing" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#ff3333;color:#fff;font-size:10px;font-weight:900;vertical-align:middle;cursor:default;">!</span>';
      if (plan) html += ' <span title="Payment plan active" style="display:inline-block;background:#1a1200;border:1px solid var(--amber);color:var(--amber);border-radius:4px;font-size:9px;font-family:\'Archivo Black\',sans-serif;padding:1px 5px;vertical-align:middle;cursor:default;">PP</span>';
    } else if (plan && plan.status === 'active') {
      html = '<span style="color:var(--grey);">$0</span>';
      html += ' <span title="Payment plan active — on track" style="display:inline-block;background:#0f1600;border:1px solid var(--lime);color:var(--lime);border-radius:4px;font-size:9px;font-family:\'Archivo Black\',sans-serif;padding:1px 5px;vertical-align:middle;cursor:default;">PP</span>';
    } else if (plan && plan.status === 'pending') {
      html = '<span style="color:var(--grey);">$0</span>';
      html += ' <span title="Payment plan pending approval" style="display:inline-block;background:#1a1200;border:1px solid var(--amber);color:var(--amber);border-radius:4px;font-size:9px;font-family:\'Archivo Black\',sans-serif;padding:1px 5px;vertical-align:middle;cursor:default;">PP?</span>';
    } else if (bal > 0) {
      html = '<span class="bal-pos">+$' + bal + '</span>';
    } else {
      html = '<span style="color:var(--grey);">$0</span>';
    }

    balCell.innerHTML = html;

    // Also update data-balance attr for sorting
    row.setAttribute('data-balance', bal);
  });
});
</script>
"""

html = html.replace('</body>', BALANCE_REFRESH_JS + '\n</body>', 1)
print('Added balance cell refresh JS')

# Safety checks
assert 'renderStudentPayments' in html
assert 'paymentPlan' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkps{i}.js','w') as f: f.write(js)
    r = subprocess.run(['node','--check',f'/tmp/_chkps{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: "+r.stderr[:300]}')
print('Written.')
