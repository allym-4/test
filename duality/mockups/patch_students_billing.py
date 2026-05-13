#!/usr/bin/env python3
"""
Patch: Students page + billing + misc fixes.
1. Remove instructor filter from students page
2. Add sortable Balance + Classes columns (with data attrs + sort JS)
3. Add realistic balances to some students so sorting is meaningful
4. Terms → Seasons (nav, page title, back link, screenTitles)
5. Add Payment Plans screen (billing-plans) + nav link
6. Fix kpi-row CSS (used on Recommendations but not defined)
7. Remove make-up from "Issue Refund" — separate it out
"""
import re, subprocess

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Remove instructor filter from students filter bar
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '\n        <select class="select-input"><option>All Instructors</option><option>Chloe</option><option>Viv</option><option>Mimi</option><option>Jaz</option><option>Avalon</option><option>Maz</option><option>Amy</option><option>Bambi</option><option>Violet</option><option>Peaches</option></select>',
    ''
)
print('1. Removed instructor filter')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Make column headers sortable (Balance and Classes)
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<thead><tr><th></th><th>Name</th><th>Level</th><th>Classes</th><th>Balance</th><th>Status</th><th>Last Seen</th><th>Actions</th></tr></thead>',
    '<thead><tr><th></th><th>Name</th><th>Level</th>'
    '<th style="cursor:pointer;user-select:none;" onclick="sortStudentsBy(\'classes\')" title="Sort by classes">Classes <span id="sort-classes-icon" style="color:var(--grey);font-size:10px;">↕</span></th>'
    '<th style="cursor:pointer;user-select:none;" onclick="sortStudentsBy(\'balance\')" title="Sort by owing">Balance <span id="sort-balance-icon" style="color:var(--grey);font-size:10px;">↕</span></th>'
    '<th>Status</th><th>Last Seen</th><th>Actions</th></tr></thead>'
)
print('2. Made Classes and Balance columns sortable')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Add data-classes and data-balance attrs to student rows, and add some
#    realistic non-zero balances to a handful of students
# ─────────────────────────────────────────────────────────────────────────────
# Also add data-balance attrs. Currently rows show balance as text. We'll add
# data attrs based on the existing cell content.
# Pattern: find each student-row and add data-classes and data-balance attrs.

def add_data_attrs(html):
    # Match each student row's opening <tr> tag and nearby classes/balance cells
    # Each row: <tr class="clickable-row student-row" data-name="..."
    # Column order: avatar, name, level, classes(int), balance($X), status, last seen, actions
    lines = html.split('\n')
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if 'class="clickable-row student-row"' in line and 'data-classes' not in line:
            # Look ahead for the classes and balance cells (within next 10 lines)
            block = '\n'.join(lines[i:i+12])
            # Extract classes count (4th <td> - just a number)
            m_classes = re.search(r'<td>(\d+)</td>', block)
            # Extract balance (5th <td> with bal-pos/bal-neg or $0)
            m_balance = re.search(r'<td[^>]*class="bal-(neg|pos)"[^>]*>\$?([\d,.]+)<|<td[^>]*class="bal-pos"[^>]*>\$([\d,.]+)<', block)
            # Also try plain $0
            m_zero = re.search(r'<td class="bal-pos">\$0</td>', block)

            classes_val = int(m_classes.group(1)) if m_classes else 0

            if m_balance:
                sign = -1 if m_balance.group(1) == 'neg' else 1
                amt_str = (m_balance.group(2) or m_balance.group(3) or '0').replace(',','')
                balance_val = sign * float(amt_str)
            else:
                balance_val = 0

            line = line.replace(
                'class="clickable-row student-row"',
                f'class="clickable-row student-row" data-classes="{classes_val}" data-balance="{balance_val}"'
            )
        out.append(line)
        i += 1
    return '\n'.join(out)

html = add_data_attrs(html)
print('3. Added data-classes and data-balance attrs to student rows')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add realistic balances to some students so sorting is meaningful
#    Find specific student rows and update their balance cell
# ─────────────────────────────────────────────────────────────────────────────
balance_overrides = [
    ("bellecurrie",    -120, "tag-amber", "Owing"),
    ("sophialawson",   -75,  "tag-amber", "Owing"),
    ("mikaylapierce",  -50,  "tag-amber", "Owing"),
    ("hannawebb",      -200, "tag-red",   "Blocked"),
    ("ambersmith",     -45,  "tag-amber", "Owing"),
]
for sid, bal, tag, status in balance_overrides:
    # Update balance cell and status in the specific student's row
    # Find the onclick for this student
    marker = f"x.id==='{sid}'"
    idx = html.find(marker)
    if idx == -1:
        continue
    # Find the <tr> opening for this row (search backwards)
    tr_start = html.rfind('<tr ', 0, idx)
    tr_end = html.find('</tr>', idx) + 6
    row = html[tr_start:tr_end]
    # Replace balance cell
    new_row = re.sub(
        r'<td class="bal-pos">\$0</td>',
        f'<td class="bal-neg">${abs(bal)}</td>',
        row, count=1
    )
    # Replace status tag
    new_row = re.sub(
        r'<span class="tag tag-lime">Active</span>',
        f'<span class="tag {tag}">{status}</span>',
        new_row, count=1
    )
    # Update data-balance
    new_row = re.sub(r'data-balance="[^"]*"', f'data-balance="{bal}"', new_row)
    html = html[:tr_start] + new_row + html[tr_end:]
print('4. Added realistic balances to sample students')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Terms → Seasons (revert)
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<span class="nav-icon">🌀</span> Terms</div>',
    '<span class="nav-icon">🌀</span> Seasons</div>'
)
html = html.replace(
    "<div class=\"page-title\">Terms</div><div class=\"page-sub\">Manage term schedules and pricing</div>",
    "<div class=\"page-title\">Seasons</div><div class=\"page-sub\">Manage season schedules and pricing</div>"
)
html = html.replace(
    '"← Back to Terms"',
    '"← Back to Seasons"'
)
html = html.replace(
    "seasons:'Terms'",
    "seasons:'Seasons'"
)
print('5. Reverted Terms → Seasons')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Fix kpi-row CSS (used on Recommendations but undefined)
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }',
    '.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }\n.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }'
)
print('6. Fixed kpi-row CSS')

# ─────────────────────────────────────────────────────────────────────────────
# 7. Add billing-plans screen + nav link + update screenTitles
# ─────────────────────────────────────────────────────────────────────────────
# Add nav link in billing section
html = html.replace(
    '<div class="nav-item" onclick="showScreen(\'billing\')"><span class="nav-icon">💳</span> Billing</div>',
    '<div class="nav-item" onclick="showScreen(\'billing\')"><span class="nav-icon">💳</span> Billing</div>\n    <div class="nav-item" onclick="showScreen(\'billing-plans\')"><span class="nav-icon">📋</span> Payment Plans</div>'
)

# Add screenTitle entry
html = html.replace(
    "'billing-outstanding':'All Outstanding'",
    "'billing-outstanding':'All Outstanding','billing-plans':'Payment Plans'"
)

# Insert billing-plans screen before billing-history screen
BILLING_PLANS_SCREEN = '''    <div id="screen-billing-plans" class="screen">
      <div class="page-header">
        <div><div class="page-title">Payment Plans</div><div class="page-sub">All active and pending instalment plans</div></div>
        <button class="btn btn-lime" onclick="openModal('modal-add-charge')">+ New Plan</button>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px;">
        <div class="kpi kpi-lime"><div class="kpi-label">Active Plans</div><div class="kpi-value">8</div><div class="kpi-sub">$1,440 total value</div></div>
        <div class="kpi kpi-amber"><div class="kpi-label">Pending Approval</div><div class="kpi-value">2</div><div class="kpi-sub">Awaiting your sign-off</div></div>
        <div class="kpi kpi-red"><div class="kpi-label">Overdue Instalments</div><div class="kpi-value">3</div><div class="kpi-sub">Action required</div></div>
        <div class="kpi"><div class="kpi-label">Collected This Month</div><div class="kpi-value">$480</div><div class="kpi-sub">Via instalment plans</div></div>
      </div>

      <!-- Pending approval -->
      <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;margin-bottom:10px;">Pending Approval</div>
      <div class="tbl-section" style="margin-bottom:24px;">
        <table>
          <thead><tr><th>Student</th><th>Plan</th><th>Total</th><th>Instalments</th><th>Requested</th><th>Actions</th></tr></thead>
          <tbody>
            <tr style="background:#1a1200;">
              <td><b>Hannah Webb</b></td>
              <td>Season 4 — Level 2 + Dance</td>
              <td>$180</td>
              <td>3 × $60</td>
              <td style="color:var(--grey);">12 May 2026</td>
              <td style="display:flex;gap:6px;">
                <button class="btn btn-lime btn-xs" onclick="alert(\'Plan approved — Hannah Webb\')">Approve</button>
                <button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-contact-student\')">Query</button>
                <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="alert(\'Plan declined\')">Decline</button>
              </td>
            </tr>
            <tr style="background:#1a1200;">
              <td><b>Amber Cole</b></td>
              <td>Season 4 — Level 1</td>
              <td>$150</td>
              <td>2 × $75</td>
              <td style="color:var(--grey);">13 May 2026</td>
              <td style="display:flex;gap:6px;">
                <button class="btn btn-lime btn-xs" onclick="alert(\'Plan approved — Amber Cole\')">Approve</button>
                <button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-contact-student\')">Query</button>
                <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="alert(\'Plan declined\')">Decline</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Active plans -->
      <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;margin-bottom:10px;">Active Plans</div>
      <div class="tbl-section">
        <table>
          <thead><tr><th>Student</th><th>Plan</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Next Due</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr>
              <td onclick="openStudentDetail(STUDENTS.find(function(x){return x.id===\'miatorrres\';}))" style="cursor:pointer;"><b>Mia Torres</b></td>
              <td>S4 — Level 2 + Dance · 3×</td>
              <td>$180</td><td class="bal-pos">$60</td><td class="bal-neg">$120</td>
              <td style="color:var(--amber);">1 Jun 2026 overdue</td>
              <td><span class="tag tag-amber">Overdue</span></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-manual-payment\')">Record</button> <button class="btn btn-ghost btn-xs" onclick="alert(\'Reminder sent\')">Remind</button></td>
            </tr>
            <tr>
              <td><b>Belle Currie</b></td>
              <td>S4 — Level 5 + Floor · 3×</td>
              <td>$180</td><td class="bal-pos">$60</td><td class="bal-neg">$120</td>
              <td style="color:var(--amber);">1 Jun 2026 overdue</td>
              <td><span class="tag tag-amber">Overdue</span></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-manual-payment\')">Record</button> <button class="btn btn-ghost btn-xs" onclick="alert(\'Reminder sent\')">Remind</button></td>
            </tr>
            <tr>
              <td><b>Jess Malone</b></td>
              <td>S4 — Level 3 · 2×</td>
              <td>$150</td><td class="bal-pos">$75</td><td>$75</td>
              <td style="color:var(--grey);">1 Jul 2026</td>
              <td><span class="tag tag-lime">On Track</span></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-manual-payment\')">Record</button> <button class="btn btn-ghost btn-xs" onclick="alert(\'Reminder sent\')">Remind</button></td>
            </tr>
            <tr>
              <td><b>Ruby Kim</b></td>
              <td>S4 — Level 1 · 2×</td>
              <td>$130</td><td class="bal-pos">$65</td><td>$65</td>
              <td style="color:var(--grey);">1 Jul 2026</td>
              <td><span class="tag tag-lime">On Track</span></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-manual-payment\')">Record</button> <button class="btn btn-ghost btn-xs" onclick="alert(\'Reminder sent\')">Remind</button></td>
            </tr>
            <tr>
              <td><b>Sophie Clarke</b></td>
              <td>S4 — Dance + Strip · 3×</td>
              <td>$165</td><td class="bal-pos">$165</td><td style="color:var(--lime);">$0</td>
              <td style="color:var(--grey);">—</td>
              <td><span class="tag tag-lime">Complete</span></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-manual-payment\')">View</button></td>
            </tr>
            <tr>
              <td><b>Nina Torres</b></td>
              <td>S4 — High Tricks · 2×</td>
              <td>$150</td><td class="bal-pos">$150</td><td style="color:var(--lime);">$0</td>
              <td style="color:var(--grey);">—</td>
              <td><span class="tag tag-lime">Complete</span></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-manual-payment\')">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
'''

html = html.replace(
    '    <div id="screen-billing-history" class="screen">',
    BILLING_PLANS_SCREEN + '    <div id="screen-billing-history" class="screen">'
)
print('7. Added billing-plans screen + nav link')

# ─────────────────────────────────────────────────────────────────────────────
# 8. Billing overview: add "View all payment plans →" link
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<button class="btn btn-ghost btn-xs" onclick="showScreen(\'billing-history\')">See all payment history →</button>',
    '<button class="btn btn-ghost btn-xs" onclick="showScreen(\'billing-history\')">See all payment history →</button>\n        <button class="btn btn-ghost btn-xs" onclick="showScreen(\'billing-plans\')" style="margin-left:4px;">View payment plans →</button>'
)
print('8. Added payment plans link to billing overview')

# ─────────────────────────────────────────────────────────────────────────────
# 9. Remove "make-up" from Issue Refund modal — it's not a refund
#    Rename button to just "Issue Refund / Credit" and remove makeup option
# ─────────────────────────────────────────────────────────────────────────────
# Find modal-issue-refund and remove the makeup credit option
html = html.replace(
    'onclick="document.getElementById(\'credit-type\').value=\'makeup\';openModal(\'modal-add-credit\')">Assign Make-up</button>',
    'onclick="openModal(\'modal-assign-makeup\')">Assign Make-up Class</button>'
)
print('9. Separated make-up from refund/credit flow')

# ─────────────────────────────────────────────────────────────────────────────
# 10. Add sortStudentsBy JS function before </body>
# ─────────────────────────────────────────────────────────────────────────────
SORT_JS = '''
<script>
// ── Students table sorting ───────────────────────────────────────────────────
var _studentSortState = {col: null, dir: 'desc'};
function sortStudentsBy(col) {
  var tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  var rows = Array.from(tbody.querySelectorAll('tr.student-row'));
  if (_studentSortState.col === col) {
    _studentSortState.dir = _studentSortState.dir === 'desc' ? 'asc' : 'desc';
  } else {
    _studentSortState.col = col;
    _studentSortState.dir = 'desc';
  }
  var dir = _studentSortState.dir;
  rows.sort(function(a, b) {
    var av = parseFloat(a.getAttribute('data-' + col)) || 0;
    var bv = parseFloat(b.getAttribute('data-' + col)) || 0;
    return dir === 'desc' ? bv - av : av - bv;
  });
  rows.forEach(function(r) { tbody.appendChild(r); });
  // Update icons
  ['classes','balance'].forEach(function(c) {
    var el = document.getElementById('sort-' + c + '-icon');
    if (!el) return;
    if (c === col) {
      el.textContent = dir === 'desc' ? '↓' : '↑';
      el.style.color = 'var(--lime)';
    } else {
      el.textContent = '↕';
      el.style.color = 'var(--grey)';
    }
  });
}
</script>
'''
html = html.replace('</body>', SORT_JS + '\n</body>', 1)
print('10. Added sortStudentsBy JS')

# Safety checks
assert '<script>' in html
assert 'function openModal' in html
assert '</body>' in html
assert 'screen-billing-plans' in html
assert 'sortStudentsBy' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

# Validate JS
import re as _re
blocks = _re.findall(r'<script>(.*?)</script>', html, _re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chk_sb{i}.js', 'w') as f:
        f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chk_sb{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: "+r.stderr[:200]}')
print('Written admin-founder.html')
