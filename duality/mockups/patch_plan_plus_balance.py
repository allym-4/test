#!/usr/bin/env python3
"""
Allow students to have BOTH a payment plan AND an extra balance (fees etc.).
balance = extra charges outside the plan (no-show fees, retail, etc.)
paymentPlan tracks its own remaining separately.
Adds "Roll into plan" action to combine them.
"""
import re, subprocess

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Update specific students to have BOTH plan + extra balance
# ─────────────────────────────────────────────────────────────────────────────
# Belle Currie: overdue plan (-$120) + no-show fee (-$25) = total -$145
# Jessica Coffey: active plan (on track) + small retail charge (-$18)
# Jessica Neary: overdue plan (-$75) + late cancel fee (-$25) = -$100 total

for sid, new_bal in [('bellecurrie', -25), ('jessicacoffey', -18), ('jessicaneary', -25)]:
    marker = f'id:"{sid}"'
    idx = html.find(marker)
    if idx == -1:
        print(f'  MISSING: {sid}')
        continue
    line_end = html.find('\n', idx)
    line = html[idx:line_end]
    line = re.sub(r"balance:\s*[-\d]+", f"balance:{new_bal}", line)
    html = html[:idx] + line + html[line_end:]
    print(f'  Set {sid} balance to {new_bal} (extra fees on top of plan)')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Update balance cell renderer to show plan + extra balance separately
# ─────────────────────────────────────────────────────────────────────────────
# Find the balance cell refresh script block and update it
OLD_CELL_LOGIC = """    var bal = s.balance || 0;
    var plan = s.paymentPlan || null;
    var html = '';

    if (bal < 0) {
      html = '<span class="bal-neg" style="font-weight:600;">−$' + Math.abs(bal) + '</span>';
      html += ' <span title="Amount owing" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#ff3333;color:#fff;font-size:10px;font-weight:900;vertical-align:middle;cursor:default;">!</span>';
      if (plan) html += ' <span title="Payment plan active" style="display:inline-block;background:#1a1200;border:1px solid var(--amber);color:var(--amber);border-radius:4px;font-size:9px;font-family:Arial,sans-serif;padding:1px 5px;vertical-align:middle;cursor:default;">PP</span>';
    } else if (plan && plan.status === 'active') {
      html = '<span style="color:var(--grey);">$0</span>';
      html += ' <span title="Payment plan active — on track" style="display:inline-block;background:#0f1600;border:1px solid var(--lime);color:var(--lime);border-radius:4px;font-size:9px;font-family:Arial,sans-serif;padding:1px 5px;vertical-align:middle;cursor:default;">PP</span>';
    } else if (plan && plan.status === 'pending') {
      html = '<span style="color:var(--grey);">$0</span>';
      html += ' <span title="Payment plan pending approval" style="display:inline-block;background:#1a1200;border:1px solid var(--amber);color:var(--amber);border-radius:4px;font-size:9px;font-family:Arial,sans-serif;padding:1px 5px;vertical-align:middle;cursor:default;">PP?</span>';
    } else if (bal > 0) {
      html = '<span class="bal-pos">+$' + bal + '</span>';
    } else {
      html = '<span style="color:var(--grey);">$0</span>';
    }

    balCell.innerHTML = html;"""

NEW_CELL_LOGIC = """    var bal = s.balance || 0;
    var plan = s.paymentPlan || null;
    var planOwing = (plan && plan.status !== 'pending') ? (plan.total - plan.paid) : 0;
    var hasExtraFee = bal < 0;
    var hasPlanOwing = planOwing > 0;
    var cellHtml = '';

    var ppBadge = function(status) {
      var bg = status==='overdue' ? '#1a1200' : status==='pending' ? '#1a1200' : '#0f1600';
      var border = status==='overdue'||status==='pending' ? 'var(--amber)' : 'var(--lime)';
      var color  = status==='overdue'||status==='pending' ? 'var(--amber)' : 'var(--lime)';
      var label  = status==='pending' ? 'PP?' : 'PP';
      var title  = status==='overdue' ? 'Payment plan — overdue' : status==='pending' ? 'Payment plan pending approval' : 'Payment plan active';
      return '<span title="' + title + '" style="display:inline-block;background:' + bg + ';border:1px solid ' + border + ';color:' + color + ';border-radius:4px;font-size:9px;font-family:Arial,sans-serif;padding:1px 5px;vertical-align:middle;cursor:default;">' + label + '</span>';
    };
    var alertBadge = '<span title="Amount owing" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#ff3333;color:#fff;font-size:10px;font-weight:900;vertical-align:middle;cursor:default;">!</span>';

    if (hasPlanOwing && hasExtraFee) {
      // Both plan owing AND extra fees
      cellHtml = '<span class="bal-neg" style="font-weight:600;">−$' + Math.abs(bal) + ' + plan</span> ' + alertBadge + ' ' + ppBadge(plan.status);
    } else if (hasPlanOwing) {
      cellHtml = '<span class="bal-neg" style="font-weight:600;">−$' + planOwing + ' plan</span> ' + (plan.status==='overdue'?alertBadge+' ':'') + ppBadge(plan.status);
    } else if (hasExtraFee && plan) {
      // Has plan (paid up so far) but extra fee on top
      cellHtml = '<span class="bal-neg" style="font-weight:600;">−$' + Math.abs(bal) + '</span> ' + alertBadge + ' ' + ppBadge(plan.status);
    } else if (hasExtraFee) {
      cellHtml = '<span class="bal-neg" style="font-weight:600;">−$' + Math.abs(bal) + '</span> ' + alertBadge;
    } else if (plan && plan.status === 'pending') {
      cellHtml = '<span style="color:var(--grey);">$0</span> ' + ppBadge('pending');
    } else if (plan) {
      cellHtml = '<span style="color:var(--grey);">$0</span> ' + ppBadge(plan.status);
    } else if (bal > 0) {
      cellHtml = '<span class="bal-pos">+$' + bal + '</span>';
    } else {
      cellHtml = '<span style="color:var(--grey);">$0</span>';
    }

    balCell.innerHTML = cellHtml;"""

if OLD_CELL_LOGIC in html:
    html = html.replace(OLD_CELL_LOGIC, NEW_CELL_LOGIC, 1)
    print('Updated balance cell renderer')
else:
    print('WARNING: balance cell logic not found exactly — skipping')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Update renderStudentPayments to show extra fees + "Roll into plan" button
# ─────────────────────────────────────────────────────────────────────────────
# Find the section that sets kpiEl and plan/tx elements, and update it
# to also show extra fees section and the combine button.

OLD_KPI_SECTION = """  // Update outstanding KPI
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

NEW_KPI_SECTION = """  // Extra fees banner (shown when student has plan + extra balance)
  var extraFeeHTML = '';
  if (plan && bal < 0) {
    var planOwing = plan.total - plan.paid;
    var totalOwing = planOwing + Math.abs(bal);
    extraFeeHTML = '<div style="background:#2a0000;border:1px solid #ff3333;border-radius:10px;padding:14px 16px;margin-bottom:20px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">'
      + '<div>'
      + '<div style="font-family:\\'Archivo Black\\',sans-serif;font-size:13px;color:#ff9999;margin-bottom:4px;">Additional charges outside plan</div>'
      + '<div style="font-size:13px;color:#ffcccc;">$' + Math.abs(bal) + ' outstanding (e.g. no-show fee) · Plan owing $' + planOwing + ' · Total $' + totalOwing + '</div>'
      + '</div>'
      + '<button class="btn btn-ghost btn-xs" style="white-space:nowrap;border-color:#ff3333;color:#ff9999;" onclick="rollIntoPaymentPlan(' + Math.abs(bal) + ', ' + planOwing + ')">'
      + 'Roll $' + Math.abs(bal) + ' into plan</button>'
      + '</div></div>';
    // Add extra fee to tx history
    txHTML = '<tr><td style="color:var(--grey);white-space:nowrap;">22 May 2026</td><td>No-show fee — ' + classNames.split(' + ')[0] + '</td><td style="color:var(--grey);">S4</td><td><span class="tag tag-red" style="font-size:10px;">Fee</span></td><td class="bal-neg">$' + Math.abs(bal) + '</td><td>—</td><td class="bal-neg">−$' + Math.abs(bal) + '</td></tr>' + txHTML;
  }

  // Update outstanding KPI — total of plan owing + extra fees
  var planOwingForKpi = (plan && plan.status !== 'pending') ? (plan.total - plan.paid) : 0;
  var totalOwingForKpi = planOwingForKpi + (bal < 0 ? Math.abs(bal) : 0) - (bal > 0 ? bal : 0);
  var kpiEl = document.getElementById('sd-balance-large');
  if (kpiEl) {
    if (totalOwingForKpi > 0) {
      kpiEl.textContent = '−$' + totalOwingForKpi;
      kpiEl.className = 'kpi-value bal-neg';
      kpiEl.closest('.kpi').className = 'kpi kpi-red';
    } else if (bal > 0) {
      kpiEl.textContent = '+$' + bal + ' credit';
      kpiEl.className = 'kpi-value bal-pos';
      kpiEl.closest('.kpi').className = 'kpi kpi-lime';
    } else {
      kpiEl.textContent = '$0';
      kpiEl.className = 'kpi-value';
      kpiEl.closest('.kpi').className = 'kpi';
    }
  }

  var planEl = document.getElementById('sd-payment-plan-section');
  if (planEl) planEl.innerHTML = extraFeeHTML + planHTML;
  var txEl = document.getElementById('sd-tx-tbody');
  if (txEl) txEl.innerHTML = txHTML;
}

function rollIntoPaymentPlan(extraAmt, planOwing) {
  var newTotal = extraAmt + planOwing;
  var perInst = Math.ceil(newTotal / 2);
  if (confirm('Roll $' + extraAmt + ' into the payment plan?\\n\\nNew remaining balance: $' + newTotal + '\\nSplit across 2 remaining instalments: $' + perInst + ' each.\\n\\nThis will clear the separate fee and add it to the plan.')) {
    alert('Done — plan updated. $' + extraAmt + ' added to remaining instalments.');
  }
}"""

if OLD_KPI_SECTION in html:
    html = html.replace(OLD_KPI_SECTION, NEW_KPI_SECTION, 1)
    print('Updated renderStudentPayments with extra fee banner + Roll into plan')
else:
    print('WARNING: KPI section not found exactly')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Safety + validate
# ─────────────────────────────────────────────────────────────────────────────
assert 'rollIntoPaymentPlan' in html
assert 'Roll' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkpb{i}.js','w') as f: f.write(js)
    r = subprocess.run(['node','--check',f'/tmp/_chkpb{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: "+r.stderr[:300]}')
print('Written.')
