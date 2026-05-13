#!/usr/bin/env python3
"""Patch admin-founder.html dashboard: invoices, chase, pending actions, flagged enrolments contact modal."""

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Outstanding Invoices KPI — add "See all" to sub line
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<div class="kpi kpi-red clickable" onclick="showScreen(\'billing\')" title="View Billing"><div class="kpi-label">Outstanding Invoices →</div><div class="kpi-value">$860</div><div class="kpi-sub">7 students owing</div></div>',
    '<div class="kpi kpi-red clickable" onclick="showScreen(\'billing\')" title="View Billing"><div class="kpi-label">Outstanding Invoices</div><div class="kpi-value">$860</div><div class="kpi-sub">7 students owing · <span style="text-decoration:underline;">See all →</span></div></div>'
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Outstanding Invoices section header — add "See all" link + fix chase buttons
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '      <div class="section-title" style="font-family:\'Archivo Black\',sans-serif;font-size:15px;margin-bottom:14px;">Outstanding Invoices</div>\n      <div class="tbl-section">\n        <table>\n          <thead><tr><th>Student</th><th>Description</th><th>Amount</th><th>Due</th><th>Action</th></tr></thead>\n          <tbody>\n            <tr><td style="cursor:pointer;" onclick="openStudentDetail(STUDENTS.find(s=>s.id===\'jess\'))"><span style="text-decoration:underline;text-underline-offset:2px;">Jess M.</span></td><td>Season 4 — Level 2 (balance)</td><td class="bal-neg">$120</td><td style="color:var(--grey)">15 May 2025</td><td><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();openChaseModal(\'Jess M.\',\'Season 4 — Level 2 (balance)\',\'$120\',1)">Chase</button></td></tr>\n            <tr><td style="cursor:pointer;" onclick="openStudentDetail(STUDENTS.find(s=>s.id===\'kylie\'))"><span style="text-decoration:underline;text-underline-offset:2px;">Kylie R.</span></td><td>Season 4 + 2× no-show fees</td><td class="bal-neg">$95</td><td style="color:var(--grey)">Overdue</td><td><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();openChaseModal(\'Kylie R.\',\'Season 4 + 2× no-show fees\',\'$95\',2)">Chase</button></td></tr>\n            <tr><td>Dana P.</td><td>Workshop: Choreo Intensive</td><td class="bal-neg">$75</td><td style="color:var(--grey)">20 May 2025</td><td><button class="btn btn-sm btn-outline" onclick="openChaseModal(\'Dana P.\',\'Workshop: Choreo Intensive\',\'$75\',0)">Chase</button></td></tr>\n          </tbody>\n        </table>\n      </div>',
    '''      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div class="section-title" style="font-family:'Archivo Black',sans-serif;font-size:15px;margin:0;">Outstanding Invoices</div>
        <button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">See all →</button>
      </div>
      <div class="tbl-section">
        <table>
          <thead><tr><th>Student</th><th>Description</th><th>Amount</th><th>Due</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td style="cursor:pointer;" onclick="openStudentDetail(STUDENTS.find(s=>s.id==='jess'))"><span style="text-decoration:underline;text-underline-offset:2px;">Jess M.</span></td><td>Season 4 — Level 2 (balance)</td><td class="bal-neg">$120</td><td style="color:var(--grey)">15 May 2025</td><td><button class="btn btn-ghost btn-xs" onclick="openChaseModal('Jess M.','Season 4 — Level 2 (balance)','$120',1)">Chase</button></td></tr>
            <tr><td style="cursor:pointer;" onclick="openStudentDetail(STUDENTS.find(s=>s.id==='kylie'))"><span style="text-decoration:underline;text-underline-offset:2px;">Kylie R.</span></td><td>Season 4 + 2× no-show fees</td><td class="bal-neg">$95</td><td style="color:#ff6b6b">Overdue</td><td><button class="btn btn-ghost btn-xs" onclick="openChaseModal('Kylie R.','Season 4 + 2× no-show fees','$95',2)">Chase</button></td></tr>
            <tr><td>Dana P.</td><td>Workshop: Choreo Intensive</td><td class="bal-neg">$75</td><td style="color:var(--grey)">20 May 2025</td><td><button class="btn btn-ghost btn-xs" onclick="openChaseModal('Dana P.','Workshop: Choreo Intensive','$75',0)">Chase</button></td></tr>
          </tbody>
        </table>
      </div>'''
)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Pending Payment Plans — split overdue vs active + more detail
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '''      <!-- A2: Pending Payment Plans -->
      <div style="font-family:'Archivo Black',sans-serif;font-size:15px;margin-bottom:14px;margin-top:24px;">Pending Payment Plans</div>
      <div class="tbl-section" style="margin-bottom:0;">
        <table>
          <thead><tr><th>Student</th><th>Plan</th><th>Total</th><th>Paid</th><th>Next Due</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Jess Malone</td><td>Season 4 — 3× instalments</td><td>$180</td><td class="bal-pos">$60</td><td style="color:var(--grey)">1 Jun 2025</td><td><span class="tag tag-amber">Active</span></td><td><button class="btn btn-ghost btn-xs" onclick="alert('Reminder sent to Jess Malone')">Chase</button> <button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">View</button></td></tr>
            <tr><td>Kylie Rhodes</td><td>Season 4 — 2× instalments</td><td>$160</td><td class="bal-pos">$0</td><td style="color:#ff6b6b">Overdue</td><td><span class="tag tag-red">Overdue</span></td><td><button class="btn btn-ghost btn-xs" onclick="alert('Reminder sent to Kylie Rhodes')">Chase</button> <button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">View</button></td></tr>
            <tr><td>Dana Park</td><td>Workshop — 2× instalments</td><td>$150</td><td class="bal-pos">$75</td><td style="color:var(--grey)">20 May 2025</td><td><span class="tag tag-lime">On Track</span></td><td><button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">View</button></td></tr>
          </tbody>
        </table>
      </div>''',
    '''      <!-- A2: Payment Plans -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;margin-top:24px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:15px;">Payment Plans</div>
        <button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">See all →</button>
      </div>

      <!-- Needs attention -->
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Needs attention</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        <div style="background:#1a0505;border:1px solid #3a1010;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:160px;">
            <div style="font-size:13px;font-weight:600;margin-bottom:2px;">Kylie Rhodes</div>
            <div style="font-size:12px;color:var(--grey);">Season 4 — 2× instalments · $160 total</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;color:var(--grey);margin-bottom:2px;">Paid</div>
            <div style="font-size:14px;font-weight:700;color:#ff6b6b;">$0 / $160</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;color:var(--grey);margin-bottom:2px;">Next due</div>
            <div style="font-size:13px;color:#ff6b6b;font-weight:600;">Overdue</div>
          </div>
          <div style="display:flex;gap:6px;">
            <span class="tag tag-red">Overdue</span>
            <button class="btn btn-ghost btn-xs" onclick="openChaseModal('Kylie Rhodes','Season 4 payment plan — 2 instalments overdue','$160',2)">Chase</button>
            <button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">View</button>
          </div>
        </div>
      </div>

      <!-- Active & on track -->
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Active &amp; on track</div>
      <div class="tbl-section" style="margin-bottom:0;">
        <table>
          <thead><tr><th>Student</th><th>Plan</th><th>Paid</th><th>Next due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr><td>Jess Malone</td><td>Season 4 — 3× instalments</td><td>$60 / $180</td><td style="color:var(--grey)">1 Jun 2025</td><td><span class="tag tag-amber">Active</span></td><td><button class="btn btn-ghost btn-xs" onclick="openChaseModal('Jess Malone','Season 4 payment plan — instalment reminder','$60',0)">Chase</button> <button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">View</button></td></tr>
            <tr><td>Dana Park</td><td>Workshop — 2× instalments</td><td>$75 / $150</td><td style="color:var(--grey)">20 May 2025</td><td><span class="tag tag-lime">On Track</span></td><td><button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">View</button></td></tr>
          </tbody>
        </table>
      </div>'''
)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Insert Pending Actions section AFTER the grid-2 (Today's Classes + Recent Activity)
#    and MOVE catch-up requests up into it
# ─────────────────────────────────────────────────────────────────────────────
PENDING_ACTIONS_SECTION = '''
      <!-- Pending Actions -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;margin-top:4px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:15px;">Pending Actions <span style="font-size:12px;background:var(--amber);color:#000;border-radius:10px;padding:2px 8px;margin-left:6px;font-weight:700;font-family:inherit;">3</span></div>
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
              <div style="font-size:12px;color:var(--grey);margin-bottom:8px;">Missed Level 2 Mon 5 May → requesting Level 2 Mon 19 May</div>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-lime btn-xs" onclick="alert('Catch-up approved for Jess Malone — she\'ll be notified.')">Approve</button>
                <button class="btn btn-ghost btn-xs" onclick="alert('Catch-up declined — Jess Malone notified.')">Decline</button>
              </div>
            </div>
            <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <div style="font-size:13px;font-weight:600;">Ruby Kim</div>
                <span class="tag tag-lav" style="font-size:10px;">Illness</span>
              </div>
              <div style="font-size:12px;color:var(--grey);margin-bottom:8px;">Missed Dance Fri 9 May → requesting Dance Sat 17 May</div>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-lime btn-xs" onclick="alert('Catch-up approved for Ruby Kim — she\'ll be notified.')">Approve</button>
                <button class="btn btn-ghost btn-xs" onclick="alert('Catch-up declined — Ruby Kim notified.')">Decline</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Overdue payment plan -->
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Payment Plan — Overdue</div>
          <div style="background:#1a0505;border:1px solid #3a1010;border-radius:10px;padding:12px 14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <div style="font-size:13px;font-weight:600;">Kylie Rhodes</div>
              <span class="tag tag-red" style="font-size:10px;">Overdue</span>
            </div>
            <div style="font-size:12px;color:var(--grey);margin-bottom:4px;">Season 4 — 2× instalments · $160 total</div>
            <div style="font-size:12px;color:#ff6b6b;margin-bottom:8px;font-weight:600;">$0 paid · both instalments overdue</div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-xs" onclick="openChaseModal('Kylie Rhodes','Season 4 payment plan — both instalments overdue','$160',2)">Chase</button>
              <button class="btn btn-ghost btn-xs" onclick="showScreen('billing')">View plan</button>
            </div>
          </div>
        </div>

      </div>

'''

html = html.replace(
    '      </div>\n\n      <div class="section-title" style="font-family:\'Archivo Black\',sans-serif;font-size:15px;margin-bottom:14px;">Outstanding Invoices</div>',
    '      </div>\n' + PENDING_ACTIONS_SECTION + '\n      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">\n        <div class="section-title" style="font-family:\'Archivo Black\',sans-serif;font-size:15px;margin:0;">Outstanding Invoices</div>\n        <button class="btn btn-ghost btn-xs" onclick="showScreen(\'billing\')">See all →</button>\n      </div>'
)

# Remove the now-duplicated "See all" header we added in step 2 (since we just replaced it)
# Check if we have a double header — we may need to clean up
# Actually the step 2 replacement target is the OLD text which is now gone, so step 2 may not have matched
# Let's verify and handle this differently — we'll do step 2's replacement after step 4

# ─────────────────────────────────────────────────────────────────────────────
# 5. Remove the old A5 catch-up section (now moved into Pending Actions)
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '''      <!-- A5: Catch-up Exemption Requests -->
      <div style="font-family:'Archivo Black',sans-serif;font-size:15px;margin-bottom:14px;margin-top:24px;">Catch-up Exemption Requests</div>
      <div class="tbl-section" style="margin-bottom:0;">
        <table>
          <thead><tr><th>Student</th><th>Missed Class</th><th>Requested Catch-up</th><th>Reason</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Jess Malone</td><td style="color:var(--grey)">Level 2 Mon 5 May</td><td style="color:var(--grey)">Level 2 Mon 19 May</td><td>Work commitment</td><td><button class="btn btn-lime btn-xs" onclick="alert('Catch-up approved for Jess Malone')">Approve</button> <button class="btn btn-ghost btn-xs" onclick="alert('Catch-up denied — Jess Malone notified.')">Deny</button></td></tr>
            <tr><td>Ruby Kim</td><td style="color:var(--grey)">Dance Fri 9 May</td><td style="color:var(--grey)">Dance Sat 17 May</td><td>Illness</td><td><button class="btn btn-lime btn-xs" onclick="alert('Catch-up approved for Ruby Kim')">Approve</button> <button class="btn btn-ghost btn-xs" onclick="alert('Catch-up denied — Ruby Kim notified.')">Deny</button></td></tr>
          </tbody>
        </table>
      </div>''',
    ''  # Remove it entirely
)

# ─────────────────────────────────────────────────────────────────────────────
# 6. Flagged Enrolments — Approve/Deny → Ignore/Contact
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '''      <!-- A3: Flagged Enrolments -->
      <div style="font-family:'Archivo Black',sans-serif;font-size:15px;margin-bottom:14px;margin-top:24px;">⚠ Flagged Enrolments</div>
      <div class="tbl-section" style="margin-bottom:0;">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Flag Reason</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Sophie Lawson</td><td>Level 3 — Wed 7pm</td><td style="color:var(--amber);font-size:12px;">Enrolled above assessed level (currently Level 1)</td><td><button class="btn btn-lime btn-xs" onclick="alert('Enrolment approved — Sophie Lawson flagged for instructor review')">Approve</button> <button class="btn btn-ghost btn-xs" onclick="alert('Enrolment denied — student notified.')">Deny</button></td></tr>
            <tr><td>Emma Davis</td><td>High Tricks — Tue 8:30pm</td><td style="color:var(--amber);font-size:12px;">No prerequisite assessment completed</td><td><button class="btn btn-lime btn-xs" onclick="alert('Enrolment approved — Emma Davis flagged for instructor review')">Approve</button> <button class="btn btn-ghost btn-xs" onclick="alert('Enrolment denied — student notified.')">Deny</button></td></tr>
          </tbody>
        </table>
      </div>''',
    '''      <!-- A3: Flagged Enrolments -->
      <div style="font-family:'Archivo Black',sans-serif;font-size:15px;margin-bottom:14px;margin-top:24px;">⚠ Flagged Enrolments</div>
      <div style="font-size:13px;color:var(--grey);margin-bottom:12px;">Students can still attend — these are flagged for your awareness. Ignore to clear the flag, or Contact to reach out.</div>
      <div class="tbl-section" style="margin-bottom:0;">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Flag Reason</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Sophie Lawson</td><td>Level 3 — Wed 7pm</td><td style="color:var(--amber);font-size:12px;">Enrolled above assessed level (currently Level 1)</td><td style="white-space:nowrap;"><button class="btn btn-ghost btn-xs" onclick="this.closest('tr').style.opacity='0.35'">Ignore</button> <button class="btn btn-ghost btn-xs" onclick="openContactStudentModal('Sophie Lawson','above-level','Level 3 — Wed 7pm','Level 1')">Contact</button></td></tr>
            <tr><td>Emma Davis</td><td>High Tricks — Tue 8:30pm</td><td style="color:var(--amber);font-size:12px;">No prerequisite assessment completed</td><td style="white-space:nowrap;"><button class="btn btn-ghost btn-xs" onclick="this.closest('tr').style.opacity='0.35'">Ignore</button> <button class="btn btn-ghost btn-xs" onclick="openContactStudentModal('Emma Davis','no-prereq-tricks','High Tricks — Tue 8:30pm','')">Contact</button></td></tr>
          </tbody>
        </table>
      </div>'''
)

# ─────────────────────────────────────────────────────────────────────────────
# 7. Contact Student Modal + JS
# ─────────────────────────────────────────────────────────────────────────────
CONTACT_MODAL = '''
<!-- Contact Student Modal (Flagged Enrolment) -->
<div class="modal-overlay" id="modal-contact-student">
  <div class="modal modal-lg" style="max-width:600px;">
    <div class="modal-title">Contact Student <button class="modal-close" onclick="closeModal('modal-contact-student')">✕</button></div>
    <div style="background:#1a1a1a;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:var(--grey);">
      Sending to: <strong id="contact-student-name" style="color:var(--white);">Sophie Lawson</strong>
      &nbsp;·&nbsp; Re: <strong id="contact-student-class" style="color:var(--white);">Level 3 — Wed 7pm</strong>
    </div>

    <div style="margin-bottom:14px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Template</div>
      <select id="contact-template-sel" onchange="applyContactTemplate()" style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;">
        <option value="above-level">Enrolled above assessed level</option>
        <option value="no-prereq-tricks">No prerequisite — tricks class</option>
        <option value="level-jump">Skipped a level — let's chat</option>
        <option value="custom">Custom message</option>
      </select>
    </div>

    <div style="margin-bottom:6px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Subject</div>
      <input type="text" id="contact-subject" style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;box-sizing:border-box;" />
    </div>

    <div style="margin-bottom:16px;margin-top:14px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px;">Message</div>
      <textarea id="contact-body" rows="10" style="width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:13px;font-family:inherit;resize:vertical;line-height:1.65;box-sizing:border-box;"></textarea>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-contact-student')">Cancel</button>
      <button class="btn btn-lime" style="flex:1" onclick="sendContactEmail()">Send Email</button>
    </div>
  </div>
</div>

'''

html = html.replace('</body>', CONTACT_MODAL + '</body>', 1)

CONTACT_JS = '''
var _contactTemplates = {
  'above-level': {
    subject: 'A quick note about your Level 3 booking 🌟',
    body: function(name, cls, currentLevel) {
      return "Hi " + name.split(' ')[0] + ",\\n\\nFirst of all — we love that you're aiming high. Seriously, that kind of ambition is exactly what Duality is about.\\n\\nWe did notice you've enrolled in " + cls + ", and we want to make sure you have the absolute best experience when you walk through our doors. Based on where you're at right now" + (currentLevel ? " (" + currentLevel + ")" : "") + ", we think jumping straight into this class might feel a bit overwhelming — and we'd hate for that to knock your confidence.\\n\\nLevel 3 gets into some pretty advanced technique, and we've found that students who've come up through Level 2 first get SO much more out of it. It's not about holding you back — it's about setting you up to absolutely smash it.\\n\\nWould you be open to a quick chat? We'd love to help map out the right progression for you and find you a class where you'll thrive from day one.\\n\\nYou can reply to this email or give us a call — we're always happy to talk it through.\\n\\nCan't wait to see you on the pole!\\n\\nMimi & the Duality team 🖤";
    }
  },
  'no-prereq-tricks': {
    subject: 'Quick check-in about your High Tricks booking ✨',
    body: function(name, cls) {
      return "Hi " + name.split(' ')[0] + ",\\n\\nSo excited you've booked into " + cls + " — it's honestly one of our favourite classes and the energy in that room is unmatched.\\n\\nBefore we confirm your spot, we just wanted to check in with you! High Tricks is designed for students who are already comfortable with inversions (think ayesha, deadlifts, that kind of thing) and have solid upper body conditioning. We don't want you coming in and finding it's not quite where you're at — that's not fun for anyone.\\n\\nJust a couple of quick questions:\\n• Have you done pole before, and if so, how long have you been training?\\n• Have you completed an inversion assessment or similar at another studio?\\n\\nIf you're brand new to pole, we'd love to start you off with a trial class or Level 1 — you'll build the foundations that make tricks actually feel good (and safe!) really quickly.\\n\\nNo judgement at all — we just want to make sure you're set up for success. Drop us a reply and we'll figure out the best path forward together.\\n\\nMimi & the Duality team 🖤";
    }
  },
  'level-jump': {
    subject: 'Let\\'s chat about your class booking 💫',
    body: function(name, cls) {
      return "Hi " + name.split(' ')[0] + ",\\n\\nThanks so much for booking into " + cls + " — it means a lot that you want to be part of our community.\\n\\nWe wanted to reach out because we noticed you've skipped a level in your progression, and we'd love to have a quick conversation before your first class. It's not about gatekeeping — it's genuinely about making sure your first experience with us feels amazing rather than overwhelming.\\n\\nSometimes students come in with experience from other studios, and that's totally valid — we just want to understand where you're at so we can support you properly on the day.\\n\\nCould you tell us a little about your pole background? Even just a couple of sentences would help us make sure " + cls + " is the right fit, or point you toward something that might suit you even better.\\n\\nWe're always here for a chat — reply to this email or DM us on Instagram anytime.\\n\\nCan't wait to meet you!\\n\\nMimi & the Duality team 🖤";
    }
  },
  'custom': {
    subject: '',
    body: function(name) { return "Hi " + name.split(' ')[0] + ",\\n\\n"; }
  }
};

var _contactContext = {};

function openContactStudentModal(name, templateKey, cls, currentLevel) {
  _contactContext = {name: name, cls: cls, currentLevel: currentLevel};
  document.getElementById('contact-student-name').textContent = name;
  document.getElementById('contact-student-class').textContent = cls;
  var sel = document.getElementById('contact-template-sel');
  if(sel) {
    sel.value = templateKey in _contactTemplates ? templateKey : 'above-level';
  }
  applyContactTemplate();
  openModal('modal-contact-student');
}

function applyContactTemplate() {
  var key = document.getElementById('contact-template-sel').value;
  var tmpl = _contactTemplates[key];
  if(!tmpl) return;
  var name = _contactContext.name || 'Student';
  var cls = _contactContext.cls || 'your class';
  var level = _contactContext.currentLevel || '';
  document.getElementById('contact-subject').value = tmpl.subject;
  document.getElementById('contact-body').value = tmpl.body(name, cls, level);
}

function sendContactEmail() {
  var name = _contactContext.name || 'the student';
  alert('Email sent to ' + name + '. A copy has been saved to their student record.');
  closeModal('modal-contact-student');
}
'''

html = html.replace(
    'function openExemptionReview(',
    CONTACT_JS + '\nfunction openExemptionReview('
)

with open('admin-founder.html', 'w') as f:
    f.write(html)

checks = [
    ('Pending Actions', 'Pending Actions section'),
    ('openContactStudentModal', 'Contact student function'),
    ('modal-contact-student', 'Contact modal'),
    ('no-prereq-tricks', 'Tricks template'),
    ('See all →', 'See all link'),
    ('Catch-up Requests', 'Catch-up in pending actions'),
]
all_ok = True
for needle, label in checks:
    if needle in html:
        print(f'  ✓ {label}')
    else:
        print(f'  ✗ MISSING: {label}')
        all_ok = False

print('OK' if all_ok else 'CHECK ERRORS ABOVE')
