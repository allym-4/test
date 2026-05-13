#!/usr/bin/env python3
"""Fix: nav items with no screen (show 'coming soon'), + outstanding invoice detail modal."""

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add a generic "coming soon" screen + update showScreen() to use it
# ─────────────────────────────────────────────────────────────────────────────

# Mark nav items that don't have a built screen as data-stub
STUB_SCREENS = ['skill-lists','rooms','categories','manage-tags','manage-packages',
                'manage-memberships','studio-notes','media-library','bookings',
                'discounts','giftcards','surveys','recommendations','assistant',
                'activity-log','leads','kisi','marketing']

for s in STUB_SCREENS:
    html = html.replace(
        f"onclick=\"showScreen('{s}')\"",
        f"onclick=\"showScreen('{s}')\" data-stub=\"1\""
    )

# Add the stub screen HTML before </body>
STUB_SCREEN_HTML = '''
<!-- Coming Soon / Stub Screen -->
<div id="screen-stub" class="screen" style="display:none;">
  <div class="page-header">
    <div><div class="page-title" id="stub-title">Coming Soon</div><div class="page-sub" id="stub-sub">This section is in the mockup pipeline</div></div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center;">
    <div style="font-size:48px;margin-bottom:20px;">🚧</div>
    <div style="font-family:'Archivo Black',sans-serif;font-size:20px;margin-bottom:12px;" id="stub-heading">Not built yet</div>
    <div style="font-size:14px;color:var(--grey);max-width:380px;line-height:1.7;" id="stub-desc">This screen is planned but hasn't been built in the mockup yet. In the real app it'll be fully functional.</div>
    <button class="btn btn-ghost" style="margin-top:28px;" onclick="showScreen('dashboard')">← Back to Dashboard</button>
  </div>
</div>

'''

html = html.replace('</body>', STUB_SCREEN_HTML + '</body>', 1)

# Update showScreen() to redirect unknown screens to stub
OLD_SHOW = '''function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));'''

NEW_SHOW = '''var _builtScreens = null;
function showScreen(id) {
  if(!_builtScreens) {
    _builtScreens = Array.from(document.querySelectorAll('.screen[id]')).map(el => el.id.replace('screen-',''));
  }
  var targetId = id;
  if(_builtScreens.indexOf(id) === -1) {
    document.getElementById('stub-title').textContent = id.replace(/-/g,' ').replace(/\\b\\w/g,c=>c.toUpperCase());
    document.getElementById('stub-heading').textContent = 'Not built yet';
    document.getElementById('stub-desc').textContent = 'This screen is planned but hasn\'t been built in the mockup yet. In the real app it\'ll be fully functional.';
    targetId = 'stub';
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));'''

html = html.replace(OLD_SHOW, NEW_SHOW)
# Fix the rest of showScreen to use targetId
html = html.replace(
    "  const el = document.getElementById('screen-' + id);",
    "  const el = document.getElementById('screen-' + targetId);"
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Outstanding invoice detail modal
#    Open via openInvoiceDetail(student, id, amount, due, chaseCount)
# ─────────────────────────────────────────────────────────────────────────────

# Update the dashboard invoice rows to have clickable student names opening detail
html = html.replace(
    "<tr><td style=\"cursor:pointer;\" onclick=\"openStudentDetail(STUDENTS.find(s=>s.id==='jess'))\"><span style=\"text-decoration:underline;text-underline-offset:2px;\">Jess M.</span></td><td>Season 4 — Level 2 (balance)</td><td class=\"bal-neg\">$120</td><td style=\"color:var(--grey)\">15 May 2025</td><td><button class=\"btn btn-ghost btn-xs\" onclick=\"openChaseModal('Jess M.','Season 4 — Level 2 (balance)','$120',1)\">Chase</button></td></tr>",
    "<tr><td style=\"cursor:pointer;\" onclick=\"openInvoiceDetail('Jess Malone','Season 4 — Level 2 (balance)','$120','15 May 2025',1)\"><span style=\"text-decoration:underline;text-underline-offset:2px;\">Jess M.</span></td><td style=\"color:var(--grey);font-size:13px;\">Season 4 — Level 2 (balance)</td><td class=\"bal-neg\">$120</td><td style=\"color:var(--grey)\">15 May 2025</td><td><button class=\"btn btn-ghost btn-xs\" onclick=\"event.stopPropagation();openChaseModal('Jess M.','Season 4 — Level 2 (balance)','$120',1)\">Chase</button></td></tr>"
)
html = html.replace(
    "<tr><td style=\"cursor:pointer;\" onclick=\"openStudentDetail(STUDENTS.find(s=>s.id==='kylie'))\"><span style=\"text-decoration:underline;text-underline-offset:2px;\">Kylie R.</span></td><td>Season 4 + 2× no-show fees</td><td class=\"bal-neg\">$95</td><td style=\"color:#ff6b6b\">Overdue</td><td><button class=\"btn btn-ghost btn-xs\" onclick=\"openChaseModal('Kylie R.','Season 4 + 2× no-show fees','$95',2)\">Chase</button></td></tr>",
    "<tr><td style=\"cursor:pointer;\" onclick=\"openInvoiceDetail('Kylie Rhodes','Season 4 + 2× no-show fees','$95','Overdue',2)\"><span style=\"text-decoration:underline;text-underline-offset:2px;\">Kylie R.</span></td><td style=\"color:var(--grey);font-size:13px;\">Season 4 + 2× no-show fees</td><td class=\"bal-neg\">$95</td><td style=\"color:#ff6b6b\">Overdue</td><td><button class=\"btn btn-ghost btn-xs\" onclick=\"event.stopPropagation();openChaseModal('Kylie R.','Season 4 + 2× no-show fees','$95',2)\">Chase</button></td></tr>"
)
html = html.replace(
    "<tr><td>Dana P.</td><td>Workshop: Choreo Intensive</td><td class=\"bal-neg\">$75</td><td style=\"color:var(--grey)\">20 May 2025</td><td><button class=\"btn btn-ghost btn-xs\" onclick=\"openChaseModal('Dana P.','Workshop: Choreo Intensive','$75',0)\">Chase</button></td></tr>",
    "<tr><td style=\"cursor:pointer;\" onclick=\"openInvoiceDetail('Dana Park','Workshop: Choreo Intensive','$75','20 May 2025',0)\"><span style=\"text-decoration:underline;text-underline-offset:2px;\">Dana P.</span></td><td style=\"color:var(--grey);font-size:13px;\">Workshop: Choreo Intensive</td><td class=\"bal-neg\">$75</td><td style=\"color:var(--grey)\">20 May 2025</td><td><button class=\"btn btn-ghost btn-xs\" onclick=\"event.stopPropagation();openChaseModal('Dana P.','Workshop: Choreo Intensive','$75',0)\">Chase</button></td></tr>"
)

INVOICE_MODAL = '''
<!-- Invoice Detail Modal -->
<div class="modal-overlay" id="modal-invoice-detail">
  <div class="modal" style="max-width:520px;">
    <div class="modal-title">
      Invoice Detail
      <button class="modal-close" onclick="closeModal('modal-invoice-detail')">✕</button>
    </div>

    <!-- Student + summary -->
    <div style="background:#1a1a1a;border-radius:10px;padding:14px 16px;margin-bottom:18px;display:flex;align-items:center;gap:14px;">
      <div id="inv-avatar" style="width:40px;height:40px;border-radius:50%;background:var(--lav);display:flex;align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;font-size:16px;flex-shrink:0;">J</div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:600;" id="inv-student">Jess Malone</div>
        <div style="font-size:12px;color:var(--grey);margin-top:2px;" id="inv-description">Season 4 — Level 2 (balance)</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;text-transform:uppercase;color:var(--grey);margin-bottom:2px;">Total owing</div>
        <div id="inv-total" style="font-family:'Archivo Black',sans-serif;font-size:20px;color:#ff6b6b;">$120</div>
      </div>
    </div>

    <!-- What's outstanding -->
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:10px;">What's outstanding</div>
    <div id="inv-line-items" style="background:#111;border-radius:8px;padding:0 14px;margin-bottom:18px;">
      <!-- populated by JS -->
    </div>

    <!-- Payment history against this invoice -->
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:10px;">Payments applied</div>
    <div id="inv-payments" style="background:#111;border-radius:8px;padding:0 14px;margin-bottom:18px;">
      <!-- populated by JS -->
    </div>

    <!-- Due date -->
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;margin-bottom:18px;padding:10px 14px;background:#1a1a1a;border-radius:8px;">
      <span style="color:var(--grey);">Due date</span>
      <span id="inv-due" style="font-weight:600;">15 May 2025</span>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-invoice-detail')">Close</button>
      <button class="btn btn-ghost" onclick="closeModal('modal-invoice-detail');openModal('modal-manual-payment')">Take Payment</button>
      <button class="btn btn-lime" id="inv-chase-btn" onclick="">Chase</button>
    </div>
  </div>
</div>

'''

html = html.replace('</body>', INVOICE_MODAL + '</body>', 1)

INVOICE_JS = '''
var _invoiceData = {
  'Jess Malone': {
    avatar: 'J', avatarBg: 'var(--lav)',
    lines: [
      {desc: 'Season 4 — Level 2 enrolment fee', amount: '$270', paid: '$150', owing: '$120'}
    ],
    payments: [
      {date: '7 Apr 2025', desc: 'Card payment on enrolment', amount: '$150', status: 'Applied'},
    ]
  },
  'Kylie Rhodes': {
    avatar: 'K', avatarBg: '#ff9966',
    lines: [
      {desc: 'Season 4 — Level 2 enrolment fee', amount: '$160', paid: '$0', owing: '$160'},
      {desc: 'No-show fee — 5 May', amount: '$20', paid: '$0', owing: '$20'},
      {desc: 'No-show fee — 12 May', amount: '$20', paid: '$0', owing: '$20'},
    ],
    payments: []
  },
  'Dana Park': {
    avatar: 'D', avatarBg: '#ffcc88',
    lines: [
      {desc: 'Choreo Intensive Workshop fee', amount: '$75', paid: '$0', owing: '$75'}
    ],
    payments: []
  }
};

function openInvoiceDetail(student, description, amount, due, chaseCount) {
  document.getElementById('inv-student').textContent = student;
  document.getElementById('inv-description').textContent = description;
  document.getElementById('inv-total').textContent = amount;
  document.getElementById('inv-due').textContent = due;
  document.getElementById('inv-due').style.color = due === 'Overdue' ? '#ff6b6b' : 'var(--white)';

  var data = _invoiceData[student] || {
    avatar: student[0], avatarBg: 'var(--lav)',
    lines: [{desc: description, amount: amount, paid: '$0', owing: amount}],
    payments: []
  };
  var av = document.getElementById('inv-avatar');
  av.textContent = data.avatar;
  av.style.background = data.avatarBg;

  // Line items
  var linesEl = document.getElementById('inv-line-items');
  linesEl.innerHTML = data.lines.map(function(l, i) {
    var border = i < data.lines.length - 1 ? 'border-bottom:1px solid #1a1a1a;' : '';
    return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;' + border + '">' +
      '<div style="flex:1;font-size:13px;">' + l.desc + '</div>' +
      '<div style="text-align:right;min-width:120px;">' +
        '<div style="font-size:12px;color:var(--grey);">Charged: ' + l.amount + '</div>' +
        '<div style="font-size:12px;color:var(--lime);">Paid: ' + l.paid + '</div>' +
        '<div style="font-size:13px;font-weight:700;color:#ff6b6b;">Owing: ' + l.owing + '</div>' +
      '</div></div>';
  }).join('');

  // Payments
  var paymentsEl = document.getElementById('inv-payments');
  if(data.payments.length === 0) {
    paymentsEl.innerHTML = '<div style="padding:12px 0;font-size:13px;color:var(--grey);">No payments recorded against this invoice yet.</div>';
  } else {
    paymentsEl.innerHTML = data.payments.map(function(p, i) {
      var border = i < data.payments.length - 1 ? 'border-bottom:1px solid #1a1a1a;' : '';
      return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;' + border + '">' +
        '<div style="flex:1;"><div style="font-size:13px;">' + p.desc + '</div>' +
        '<div style="font-size:12px;color:var(--grey);margin-top:2px;">' + p.date + '</div></div>' +
        '<div style="font-size:13px;font-weight:600;color:var(--lime);">' + p.amount + '</div>' +
        '<span class="tag tag-lime" style="font-size:10px;">' + p.status + '</span>' +
      '</div>';
    }).join('');
  }

  var chaseBtn = document.getElementById('inv-chase-btn');
  chaseBtn.onclick = function() {
    closeModal('modal-invoice-detail');
    openChaseModal(student, description, amount, chaseCount);
  };

  openModal('modal-invoice-detail');
}
'''

html = html.replace(
    'function openExemptionReview(',
    INVOICE_JS + '\nfunction openExemptionReview('
)

with open('admin-founder.html', 'w') as f:
    f.write(html)

checks = [
    ('screen-stub', 'Stub screen HTML'),
    ('modal-invoice-detail', 'Invoice detail modal'),
    ('openInvoiceDetail', 'openInvoiceDetail function'),
    ('_invoiceData', 'Invoice data object'),
    ('data-stub', 'Stub nav items marked'),
]
for needle, label in checks:
    status = '✓' if needle in html else '✗ MISSING'
    print(f'  {status}: {label}')
