#!/usr/bin/env python3
"""Batch patch: action log screen, view notes fix, enrollment types, waitlist actions,
   add student search, email rename, pending actions fix, payment plan approve/deny,
   add-to-class payment step."""

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ── 1. Fix "View Notes" button — use name lookup not ID ──────────────────────
html = html.replace(
    '''onclick="openStudentDetail(STUDENTS.find(s=>s.id===\'jess\'))">View Notes</button>''',
    '''onclick="openStudentDetail(STUDENTS.find(function(s){return s.name===\'Jess Malone\'||s.id===\'jess\';})||{name:\'Jess Malone\',notes:[]})">View Notes</button>'''
)

# ── 2. Today's Classes enrollment type tags in attendance register ────────────
# Row 0: Jess Malone — Enrolled
html = html.replace(
    '<td><span class="tag tag-lav">Enrolled</span></td>\n                <td style="color:var(--grey);font-size:12px;">0412 345 678</td>',
    '<td><span class="tag tag-lav" style="font-size:10px;">Enrolled</span></td>\n                <td style="color:var(--grey);font-size:12px;">0412 345 678</td>'
)
# Add catch-up, trial, casual rows — replace Sophie's "Enrolled" tag
html = html.replace(
    '''<td><span class="tag tag-lav">Enrolled</span></td>
                <td style="color:var(--grey);font-size:12px;">0412 222 333</td>''',
    '''<td><span class="tag tag-lav" style="font-size:10px;">Enrolled</span></td>
                <td style="color:var(--grey);font-size:12px;">0412 222 333</td>'''
)

# ── 3. Add student search to modal-add-to-class ──────────────────────────────
html = html.replace(
    '''<!-- Add to Class Modal (enhanced B2) -->
<div class="modal-overlay" id="modal-add-to-class">
  <div class="modal modal-lg">
    <div class="modal-title">Add to Class <button class="modal-close" onclick="closeModal(\'modal-add-to-class\')">✕</button></div>
    <div class="field">
      <label>Enrolment Type</label>''',
    '''<!-- Add to Class Modal (enhanced B2) -->
<div class="modal-overlay" id="modal-add-to-class">
  <div class="modal modal-lg">
    <div class="modal-title">Add Student to Class <button class="modal-close" onclick="closeModal(\'modal-add-to-class\')">✕</button></div>
    <div class="field">
      <label>Student</label>
      <input type="text" id="atc-student-search" placeholder="Search by name or email…" oninput="searchAtcStudent(this.value)" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;box-sizing:border-box;" />
      <div id="atc-student-results" style="display:none;margin-top:4px;border:1px solid var(--border);border-radius:8px;overflow:hidden;max-height:160px;overflow-y:auto;"></div>
      <div id="atc-student-selected" style="display:none;margin-top:6px;padding:8px 12px;background:#0f1600;border:1px solid var(--lime);border-radius:8px;font-size:13px;display:flex;align-items:center;justify-content:space-between;">
        <span id="atc-student-name">—</span>
        <button class="btn btn-ghost btn-xs" onclick="clearAtcStudent()">✕</button>
      </div>
    </div>
    <div class="field">
      <label>Enrolment Type</label>'''
)

# Fix modal footer — confirm button
html = html.replace(
    '''<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal(\'modal-add-to-class\')">Cancel</button><button class="btn btn-lime" onclick="confirmAddToClass()">Add Student</button></div>
  </div>
</div>

<!-- Cancel Class Modal''',
    '''<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal(\'modal-add-to-class\')">Cancel</button><button class="btn btn-lime" onclick="confirmAddToClass()">Continue to Payment →</button></div>
  </div>
</div>

<!-- Add to Class: Payment Step Modal -->
<div class="modal-overlay" id="modal-atc-payment">
  <div class="modal" style="max-width:480px;">
    <div class="modal-title">Payment — <span id="atc-pay-summary">Level 2 Mon 6:30pm</span> <button class="modal-close" onclick="closeModal(\'modal-atc-payment\')">✕</button></div>
    <div style="background:#1a1a1a;border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:13px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:var(--grey);">Student</span><strong id="atc-pay-student">Jess Malone</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:var(--grey);">Class</span><span id="atc-pay-class">Level 2 Mon 6:30pm</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--grey);">Type</span><span id="atc-pay-type">Season enrolment</span></div>
    </div>
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:10px;">Standard price</div>
    <div style="font-size:22px;font-family:\'Archivo Black\',sans-serif;margin-bottom:18px;" id="atc-pay-price">$270.00</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button class="btn btn-lime" style="justify-content:flex-start;gap:12px;padding:14px 16px;" onclick="atcPayAction(\'payment\')">
        <span style="font-size:18px;">💳</span>
        <div style="text-align:left;"><div style="font-weight:700;">Take Payment</div><div style="font-size:11px;font-weight:400;opacity:0.8;">Process card, cash or bank transfer now</div></div>
      </button>
      <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:14px 16px;" onclick="atcPayAction(\'credit\')">
        <span style="font-size:18px;">🪙</span>
        <div style="text-align:left;"><div style="font-weight:700;">Use Account Credit</div><div id="atc-credit-bal" style="font-size:11px;opacity:0.8;">No credit on account</div></div>
      </button>
      <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:14px 16px;" onclick="atcPayAction(\'plan\')">
        <span style="font-size:18px;">📅</span>
        <div style="text-align:left;"><div style="font-weight:700;">Set Up Payment Plan</div><div style="font-size:11px;opacity:0.8;">Split into 2 or 3 instalments</div></div>
      </button>
      <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:14px 16px;" onclick="atcPayAction(\'change\')">
        <span style="font-size:18px;">✏️</span>
        <div style="text-align:left;"><div style="font-weight:700;">Change Price</div><div style="font-size:11px;opacity:0.8;">Override the standard rate for this student</div></div>
      </button>
      <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:14px 16px;border-color:#333;" onclick="atcPayAction(\'skip\')">
        <span style="font-size:18px;">⏭</span>
        <div style="text-align:left;"><div style="font-weight:700;color:var(--amber);">Skip for Now</div><div style="font-size:11px;opacity:0.8;">Student will show as owing — resolve later</div></div>
      </button>
    </div>
  </div>
</div>

<!-- Cancel Class Modal'''
)

# ── 4. Rename "Send Class Summary Email" ─────────────────────────────────────
html = html.replace(
    '''onclick="alert(\'Class summary email sent to instructor\')">Send Class Summary Email</button>''',
    '''onclick="openModal(\'modal-email-attendees\')">Email All Students Attending</button>'''
)

# ── 5. Waitlist — add Offer / Revoke / Remove columns ────────────────────────
html = html.replace(
    '''<thead><tr><th>#</th><th>Student</th><th>Contact</th><th>Joined Waitlist</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td style="color:var(--grey);">1</td><td><div style="display:flex;align-items:center;gap:10px;"><div class="s-avatar" style="background:#44ff99;">T</div><div><div style="font-weight:500;">Tara Bell</div><div style="font-size:11px;color:var(--grey);">she/her</div></div></div></td><td style="color:var(--grey);font-size:12px;">0412 999 000</td><td style="color:var(--grey);">10 May 2025</td><td><button class="btn btn-lime btn-xs" onclick="alert(\'Tara Bell promoted from waitlist — notification sent\')">Promote</button></td></tr>
              <tr><td style="color:var(--grey);">2</td><td><div style="display:flex;align-items:center;gap:10px;"><div class="s-avatar" style="background:#ff9966;">Z</div><div><div style="font-weight:500;">Zoe Clarke</div><div style="font-size:11px;color:var(--grey);">she/her</div></div></div></td><td style="color:var(--grey);font-size:12px;">0412 000 111</td><td style="color:var(--grey);">11 May 2025</td><td><button class="btn btn-lime btn-xs" onclick="alert(\'Zoe Clarke promoted from waitlist — notification sent\')">Promote</button></td></tr>
            </tbody>''',
    '''<thead><tr><th>#</th><th>Student</th><th>Contact</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              <tr id="wl-row-0">
                <td style="color:var(--grey);">1</td>
                <td><div style="display:flex;align-items:center;gap:10px;"><div class="s-avatar" style="background:#44ff99;">T</div><div><div style="font-weight:500;cursor:pointer;text-decoration:underline dotted;" onclick="openStudentDetail(STUDENTS.find(function(s){return s.name===\'Tara Bell\';}))">Tara Bell</div><div style="font-size:11px;color:var(--grey);">she/her</div></div></div></td>
                <td style="color:var(--grey);font-size:12px;">0412 999 000</td>
                <td style="color:var(--grey);">10 May 2025</td>
                <td id="wl-status-0"><span class="tag tag-grey" style="font-size:10px;">Waiting</span></td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-lime btn-xs" id="wl-offer-0" onclick="offerWaitlistSpot(0,\'Tara Bell\')">Offer Spot</button>
                  <button class="btn btn-ghost btn-xs" id="wl-revoke-0" style="display:none;" onclick="revokeWaitlistOffer(0,\'Tara Bell\')">Revoke Offer</button>
                  <button class="btn btn-ghost btn-xs" onclick="removeFromWaitlist(0,\'Tara Bell\')">Remove</button>
                </td>
              </tr>
              <tr id="wl-row-1">
                <td style="color:var(--grey);">2</td>
                <td><div style="display:flex;align-items:center;gap:10px;"><div class="s-avatar" style="background:#ff9966;">Z</div><div><div style="font-weight:500;cursor:pointer;text-decoration:underline dotted;" onclick="openStudentDetail(STUDENTS.find(function(s){return s.name===\'Zoe Clarke\';}))">Zoe Clarke</div><div style="font-size:11px;color:var(--grey);">she/her</div></div></div></td>
                <td style="color:var(--grey);font-size:12px;">0412 000 111</td>
                <td style="color:var(--grey);">11 May 2025</td>
                <td id="wl-status-1"><span class="tag tag-amber" style="font-size:10px;">Offer Sent</span></td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-lime btn-xs" id="wl-accept-1" onclick="acceptWaitlistForStudent(1,\'Zoe Clarke\')">Accept for Them</button>
                  <button class="btn btn-ghost btn-xs" id="wl-revoke-1" onclick="revokeWaitlistOffer(1,\'Zoe Clarke\')">Revoke Offer</button>
                  <button class="btn btn-ghost btn-xs" onclick="removeFromWaitlist(1,\'Zoe Clarke\')">Remove</button>
                </td>
              </tr>
            </tbody>'''
)

# ── 6. Fix Pending Actions — catch-up only + payment plan approve/deny ────────
OLD_PENDING = '''      <!-- Pending Actions -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;margin-top:4px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:15px;">Pending Actions <span style="font-size:12px;background:var(--amber);color:#000;border-radius:10px;padding:2px 8px;margin-left:6px;font-weight:700;font-family:inherit;">3</span></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">

        <!-- Catch-up requests -->
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Catch-up Requests</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <div style="font-size:13px;font-weight:600;">Jess Malone</div>
                <span class="tag tag-lav" style="font-size:10px;">Work commitment</span>
              </div>
              <div style="font-size:12px;color:var(--grey);margin-bottom:8px;">Missed Level 2 Mon 5 May &rarr; requesting Level 2 Mon 19 May</div>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-lime btn-xs" onclick="alert(\'Catch-up approved for Jess Malone.\')">Approve</button>
                <button class="btn btn-ghost btn-xs" onclick="alert(\'Catch-up declined — Jess Malone notified.\')">Decline</button>
              </div>
            </div>
            <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <div style="font-size:13px;font-weight:600;">Ruby Kim</div>
                <span class="tag tag-lav" style="font-size:10px;">Illness</span>
              </div>
              <div style="font-size:12px;color:var(--grey);margin-bottom:8px;">Missed Dance Fri 9 May &rarr; requesting Dance Sat 17 May</div>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-lime btn-xs" onclick="alert(\'Catch-up approved for Ruby Kim.\')">Approve</button>
                <button class="btn btn-ghost btn-xs" onclick="alert(\'Catch-up declined — Ruby Kim notified.\')">Decline</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Overdue payment plan -->
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Payment Plan &mdash; Overdue</div>
          <div style="background:#1a0505;border:1px solid #3a1010;border-radius:10px;padding:12px 14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <div style="font-size:13px;font-weight:600;">Kylie Rhodes</div>
              <span class="tag tag-red" style="font-size:10px;">Overdue</span>
            </div>
            <div style="font-size:12px;color:var(--grey);margin-bottom:4px;">Season 4 &mdash; 2&times; instalments &middot; $160 total</div>
            <div style="font-size:12px;color:#ff6b6b;margin-bottom:8px;font-weight:600;">$0 paid &middot; both instalments overdue</div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-xs" onclick="openChaseModal(\'Kylie Rhodes\',\'Season 4 payment plan — both instalments overdue\',\'$160\',2)">Chase</button>
              <button class="btn btn-ghost btn-xs" onclick="showScreen(\'billing\')">View plan</button>
            </div>
          </div>
        </div>

      </div>'''

NEW_PENDING = '''      <!-- Pending Actions -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;margin-top:4px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:15px;">Pending Actions <span style="font-size:12px;background:var(--amber);color:#000;border-radius:10px;padding:2px 8px;margin-left:6px;font-weight:700;font-family:inherit;">4</span></div>
      </div>

      <!-- Catch-up exemption requests -->
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Catch-up Exemption Requests</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline dotted;" onclick="openStudentDetail(STUDENTS.find(function(s){return s.name===\'Jess Malone\';}))">Jess Malone</div>
            <span class="tag tag-lav" style="font-size:10px;">Work commitment</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:8px;">Missed Level 2 Mon 5 May &rarr; requesting Level 2 Mon 19 May</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Catch-up approved — Jess Malone will be notified.\')">Approve</button>
            <button class="btn btn-ghost btn-xs" onclick="openContactStudentModal(\'Jess Malone\',\'level-jump\',\'Level 2 Mon 19 May\',\'\')">Decline &amp; Contact</button>
          </div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline dotted;" onclick="openStudentDetail(STUDENTS.find(function(s){return s.name===\'Ruby Kim\';}))">Ruby Kim</div>
            <span class="tag tag-lav" style="font-size:10px;">Illness</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:8px;">Missed Dance Fri 9 May &rarr; requesting Dance Sat 17 May</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Catch-up approved — Ruby Kim will be notified.\')">Approve</button>
            <button class="btn btn-ghost btn-xs" onclick="openContactStudentModal(\'Ruby Kim\',\'level-jump\',\'Dance Sat 17 May\',\'\')">Decline &amp; Contact</button>
          </div>
        </div>
      </div>

      <!-- Payment plan approval requests -->
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Payment Plan Requests — Awaiting Approval</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline dotted;" onclick="openStudentDetail(STUDENTS.find(function(s){return s.name===\'Hannah Webb\';}))">Hannah Webb</div>
            <span class="tag tag-amber" style="font-size:10px;">Pending approval</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:2px;">Season 4 — Level 1 &middot; $270 total</div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:8px;">Requested 3&times; instalments of $90</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Payment plan approved — Hannah Webb will be notified.\')">Approve</button>
            <button class="btn btn-ghost btn-xs" onclick="openContactStudentModal(\'Hannah Webb\',\'custom\',\'\',\'\')">Deny &amp; Contact</button>
          </div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline dotted;" onclick="openStudentDetail(STUDENTS.find(function(s){return s.name===\'Amber Cole\';}))">Amber Cole</div>
            <span class="tag tag-amber" style="font-size:10px;">Pending approval</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:2px;">Season 4 — Level 2 &middot; $270 total</div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:8px;">Requested 2&times; instalments of $135</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Payment plan approved — Amber Cole will be notified.\')">Approve</button>
            <button class="btn btn-ghost btn-xs" onclick="openContactStudentModal(\'Amber Cole\',\'custom\',\'\',\'\')">Deny &amp; Contact</button>
          </div>
        </div>
      </div>'''

html = html.replace(OLD_PENDING, NEW_PENDING)

# ── 7. Email attendees modal ──────────────────────────────────────────────────
EMAIL_ATTENDEES_MODAL = '''
<!-- Email All Students Attending Modal -->
<div class="modal-overlay" id="modal-email-attendees">
  <div class="modal" style="max-width:500px;">
    <div class="modal-title">Email All Students Attending <button class="modal-close" onclick="closeModal(\'modal-email-attendees\')">✕</button></div>
    <div style="background:#1a1a1a;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:var(--grey);">
      Sending to <strong style="color:var(--white);">8 students</strong> enrolled in Level 2 — Mon 12 May, 6:30pm
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Subject</div>
      <input type="text" value="Level 2 — Monday 12 May · See you tonight!" style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Message</div>
      <textarea rows="6" style="width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;resize:vertical;line-height:1.65;box-sizing:border-box;">Hey everyone!

Just a quick note ahead of tonight\'s Level 2 class at 6:30pm in The Box. Can\'t wait to see you all on the pole!

If you need to cancel, please do so before 2:30pm to avoid a late cancel fee.

See you tonight 🖤
Duality Pole</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal(\'modal-email-attendees\')">Cancel</button>
      <button class="btn btn-lime" style="flex:1" onclick="alert(\'Email sent to 8 students attending Level 2 — Mon 12 May.\');closeModal(\'modal-email-attendees\')">Send to All 8 Students</button>
    </div>
  </div>
</div>

'''
html = html.replace('</body>', EMAIL_ATTENDEES_MODAL + '</body>', 1)

# ── 8. Add screen-action-log and update "View log / + Add" nav ────────────────
# Change the dashboard button to navigate to action-log screen
html = html.replace(
    '''<button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-action-log\')">View log / + Add</button>''',
    '''<button class="btn btn-ghost btn-xs" onclick="showScreen(\'action-log\')">View log / + Add</button>'''
)

# Add screen-action-log before </body>
ACTION_LOG_SCREEN = '''
<!-- Action Log Screen -->
<div id="screen-action-log" class="screen">
  <div class="page-header">
    <div><div class="page-title">Action Items Log</div><div class="page-sub">All studio action items — pending, completed, and history</div></div>
    <button class="btn btn-lime" onclick="switchLogTab(\'add\');openModal(\'modal-action-log\')">+ Add Item</button>
  </div>

  <div class="subtabs" style="margin-bottom:16px;">
    <div class="subtab active" onclick="switchSubTab(this,\'al-pending\')">Pending (<span id="al-pending-count">4</span>)</div>
    <div class="subtab" onclick="switchSubTab(this,\'al-completed\')">Completed Today</div>
    <div class="subtab" onclick="switchSubTab(this,\'al-history\')">History</div>
  </div>

  <div id="al-pending" class="subscreen active">
    <div style="display:flex;flex-direction:column;gap:8px;" id="al-pending-list">
      <div class="notif-action-row" id="al-ni-0" data-label="New order — Ruby Kim: Pole Grip Aid (Medium)" style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px;">
        <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,0)" />
        <span style="font-size:18px;line-height:1;">🛍</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;">New order — prepare for pickup</div>
          <div style="font-size:12px;color:var(--grey);margin-top:2px;">Ruby Kim ordered Pole Grip Aid (Medium) — not yet collected</div>
          <div style="font-size:11px;color:var(--grey);margin-top:4px;">9:32am · Retail</div>
        </div>
      </div>
      <div class="notif-action-row" id="al-ni-1" data-label="New order — Tara Bell: Duality Crop Top (S)" style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px;">
        <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,1)" />
        <span style="font-size:18px;line-height:1;">🛍</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;">New order — prepare for pickup</div>
          <div style="font-size:12px;color:var(--grey);margin-top:2px;">Tara Bell ordered Duality Crop Top (S) — not yet collected</div>
          <div style="font-size:11px;color:var(--grey);margin-top:4px;">8:14am · Retail</div>
        </div>
      </div>
      <div class="notif-action-row" id="al-ni-2" data-label="New student today — Priya Sharma, Level 1 5:30pm" style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px;">
        <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,2)" />
        <span style="font-size:18px;line-height:1;">👋</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;">New student coming today — please greet</div>
          <div style="font-size:12px;color:var(--grey);margin-top:2px;">Priya Sharma · Level 1 at 5:30pm · Instructor: Chloe · Waiver not yet signed</div>
          <div style="font-size:11px;color:var(--lime);margin-top:4px;">Today · Student</div>
        </div>
      </div>
      <div class="notif-action-row" id="al-ni-3" data-label="Injury check-in overdue — Jess Malone" style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:#1a0505;border:1px solid #3a1010;border-radius:10px;">
        <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,3)" />
        <span style="font-size:18px;line-height:1;">🩹</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;">Injury check-in overdue</div>
          <div style="font-size:12px;color:var(--grey);margin-top:2px;">Jess Malone · right shoulder impingement · check-in was due 17 May</div>
          <div style="font-size:11px;color:var(--amber);margin-top:4px;">Overdue · Health</div>
          <button class="btn btn-ghost btn-xs" style="margin-top:6px;" onclick="openStudentDetail(STUDENTS.find(function(s){return s.name===\'Jess Malone\';}))">View Student Notes →</button>
        </div>
      </div>
    </div>
  </div>

  <div id="al-completed" class="subscreen">
    <div id="al-completed-list" style="display:flex;flex-direction:column;gap:8px;">
      <div style="font-size:13px;color:var(--grey);padding:20px 0;text-align:center;">No items completed yet today. Tick items above to move them here.</div>
    </div>
  </div>

  <div id="al-history" class="subscreen">
    <div class="tbl-section">
      <table>
        <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Completed by</th><th>Time</th></tr></thead>
        <tbody>
          <tr><td style="color:var(--grey);">12 May</td><td>New order — Jess Malone: Pole Shorts (M)</td><td><span class="tag tag-grey" style="font-size:10px;">Retail</span></td><td>Mimi</td><td style="color:var(--grey);">10:14am</td></tr>
          <tr><td style="color:var(--grey);">11 May</td><td>Injury check-in — Ruby Kim</td><td><span class="tag tag-grey" style="font-size:10px;">Health</span></td><td>Chloe</td><td style="color:var(--grey);">6:45pm</td></tr>
          <tr><td style="color:var(--grey);">11 May</td><td>New order — Nina Torres: Grip Aid (Small)</td><td><span class="tag tag-grey" style="font-size:10px;">Retail</span></td><td>Mimi</td><td style="color:var(--grey);">9:02am</td></tr>
          <tr><td style="color:var(--grey);">10 May</td><td>Exemption request — Amber Cole ($40 workshop)</td><td><span class="tag tag-grey" style="font-size:10px;">Payment</span></td><td>Mimi</td><td style="color:var(--grey);">2:30pm</td></tr>
          <tr><td style="color:var(--grey);">9 May</td><td>New student today — Zoe Clarke, Level 1</td><td><span class="tag tag-grey" style="font-size:10px;">Student</span></td><td>Chloe</td><td style="color:var(--grey);">5:28pm</td></tr>
          <tr><td style="color:var(--grey);">8 May</td><td>New order — Sophie Lawson: Pole Shorts (XS)</td><td><span class="tag tag-grey" style="font-size:10px;">Retail</span></td><td>Mimi</td><td style="color:var(--grey);">11:20am</td></tr>
          <tr><td style="color:var(--grey);">7 May</td><td>Catch-up approved — Jess Malone</td><td><span class="tag tag-grey" style="font-size:10px;">Catch-up</span></td><td>Mimi</td><td style="color:var(--grey);">3:15pm</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

'''
html = html.replace('</body>', ACTION_LOG_SCREEN + '</body>', 1)

# Also add action-log to screenTitles
html = html.replace(
    "const screenTitles = {",
    "const screenTitles = { 'action-log': 'Action Items Log',"
)

# ── 9. JS for new features ────────────────────────────────────────────────────
NEW_JS = '''
// ── Add to Class: student search ────────────────────────────────────────────
var _atcSelectedStudent = null;
function searchAtcStudent(q) {
  var res = document.getElementById("atc-student-results");
  if(!q || q.length < 2) { res.style.display = "none"; return; }
  var matches = STUDENTS.filter(function(s) {
    return s.name.toLowerCase().includes(q.toLowerCase()) || (s.email && s.email.toLowerCase().includes(q.toLowerCase()));
  }).slice(0, 6);
  if(!matches.length) { res.style.display = "none"; return; }
  res.style.display = "";
  res.innerHTML = matches.map(function(s) {
    return "<div style=\\"padding:9px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);background:var(--card);\\" " +
      "onmouseenter=\\"this.style.background=\'#1a1a1a\';\\" onmouseleave=\\"this.style.background=\'var(--card)\';\\" " +
      "onclick=\\"selectAtcStudent(JSON.parse(decodeURIComponent(\'" + encodeURIComponent(JSON.stringify({name:s.name,id:s.id})) + "\')))\\">" +
      "<div style=\\"font-weight:500;\\">" + s.name + "</div>" +
      "<div style=\\"font-size:11px;color:var(--grey);\\">" + (s.email || s.phone || "") + "</div></div>";
  }).join("");
}
function selectAtcStudent(obj) {
  _atcSelectedStudent = obj;
  var sel = document.getElementById("atc-student-selected");
  var nm = document.getElementById("atc-student-name");
  var res = document.getElementById("atc-student-results");
  var inp = document.getElementById("atc-student-search");
  if(nm) nm.textContent = obj.name;
  if(sel) sel.style.display = "flex";
  if(res) res.style.display = "none";
  if(inp) inp.value = "";
}
function clearAtcStudent() {
  _atcSelectedStudent = null;
  var sel = document.getElementById("atc-student-selected");
  if(sel) sel.style.display = "none";
}
function confirmAddToClass() {
  var cls = document.getElementById("selected-add-class") ? document.getElementById("selected-add-class").value : "";
  var type = document.getElementById("add-class-type") ? document.getElementById("add-class-type").value : "season";
  var studentName = _atcSelectedStudent ? _atcSelectedStudent.name : "Student";
  if(!_atcSelectedStudent) { alert("Please search for and select a student first."); return; }
  if(!cls) { alert("Please select a class."); return; }
  closeModal("modal-add-to-class");
  var payEl = document.getElementById("atc-pay-summary");
  var payStudent = document.getElementById("atc-pay-student");
  var payClass = document.getElementById("atc-pay-class");
  var payType = document.getElementById("atc-pay-type");
  var payPrice = document.getElementById("atc-pay-price");
  var prices = {"season":"$270.00","dropin":"$40.00","trial":"$35.00"};
  var labels = {"season":"Season enrolment","dropin":"Drop-in (single session)","trial":"Trial class"};
  if(payEl) payEl.textContent = cls;
  if(payStudent) payStudent.textContent = studentName;
  if(payClass) payClass.textContent = cls;
  if(payType) payType.textContent = labels[type] || type;
  if(payPrice) payPrice.textContent = prices[type] || "$270.00";
  openModal("modal-atc-payment");
}
function atcPayAction(action) {
  var studentName = document.getElementById("atc-pay-student") ? document.getElementById("atc-pay-student").textContent : "Student";
  var cls = document.getElementById("atc-pay-class") ? document.getElementById("atc-pay-class").textContent : "class";
  var msgs = {
    payment: "Opening payment terminal for " + studentName + "...",
    credit: "Account credit applied. " + studentName + " is now enrolled in " + cls + ".",
    plan: "Payment plan set up. " + studentName + " will be notified with instalment schedule.",
    change: "Enter new price for " + studentName,
    skip: studentName + " added to " + cls + ". Balance will show as owing until payment is recorded."
  };
  closeModal("modal-atc-payment");
  if(action === "change") {
    var newPrice = prompt("Custom price for " + studentName + " ($):", "270");
    if(newPrice) alert("Price set to $" + newPrice + " for " + studentName + ". Proceed to take payment.");
  } else {
    alert(msgs[action]);
  }
}

// ── Waitlist actions ─────────────────────────────────────────────────────────
function offerWaitlistSpot(idx, name) {
  var statusEl = document.getElementById("wl-status-" + idx);
  var offerBtn = document.getElementById("wl-offer-" + idx);
  var revokeBtn = document.getElementById("wl-revoke-" + idx);
  if(statusEl) statusEl.innerHTML = "<span class=\\"tag tag-amber\\" style=\\"font-size:10px;\\">Offer Sent</span>";
  if(offerBtn) offerBtn.style.display = "none";
  if(revokeBtn) revokeBtn.style.display = "";
  alert("Spot offered to " + name + " — they have 24 hours to accept.");
}
function revokeWaitlistOffer(idx, name) {
  var statusEl = document.getElementById("wl-status-" + idx);
  var offerBtn = document.getElementById("wl-offer-" + idx);
  var revokeBtn = document.getElementById("wl-revoke-" + idx);
  var acceptBtn = document.getElementById("wl-accept-" + idx);
  if(statusEl) statusEl.innerHTML = "<span class=\\"tag tag-grey\\" style=\\"font-size:10px;\\">Waiting</span>";
  if(offerBtn) { offerBtn.style.display = ""; offerBtn.textContent = "Offer Spot"; }
  if(revokeBtn) revokeBtn.style.display = "none";
  if(acceptBtn) acceptBtn.style.display = "none";
  alert("Offer revoked for " + name + " — they have been notified.");
}
function acceptWaitlistForStudent(idx, name) {
  var row = document.getElementById("wl-row-" + idx);
  if(row) { row.style.opacity = "0.4"; row.style.pointerEvents = "none"; }
  alert(name + " has been moved off the waitlist and enrolled. Payment step will open.");
}
function removeFromWaitlist(idx, name) {
  if(!confirm("Remove " + name + " from the waitlist?")) return;
  var row = document.getElementById("wl-row-" + idx);
  if(row) row.style.display = "none";
  alert(name + " removed from waitlist.");
}
'''

html = html.replace(
    "function openExemptionReview(",
    NEW_JS + "\nfunction openExemptionReview("
)

with open('admin-founder.html', 'w') as f:
    f.write(html)

# Validate JS
import re, subprocess
with open('admin-founder.html', 'r') as f:
    content = f.read()
match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
with open('/tmp/check.js', 'w') as f:
    f.write(match.group(1))
r = subprocess.run(['node', '--check', '/tmp/check.js'], capture_output=True, text=True)
if r.returncode == 0:
    print("JS VALID")
else:
    print("JS ERROR:", r.stderr[:400])

checks = [
    'atc-student-search', 'modal-atc-payment', 'atcPayAction',
    'offerWaitlistSpot', 'revokeWaitlistOffer', 'acceptWaitlistForStudent',
    'modal-email-attendees', 'screen-action-log', 'Catch-up Exemption Requests',
    'Payment Plan Requests', 'Deny & Contact'
]
for c in checks:
    print(f"  {'✓' if c in content else '✗ MISSING'}: {c}")
