#!/usr/bin/env python3
"""Patch student-ux.html: smart refund modal (season vs individual class)."""

with open('student-ux.html', 'r') as f:
    html = f.read()

OLD_MODAL = '''<!-- REFUND / CREDIT REQUEST MODAL -->
<div class="modal-overlay" id="modal-refund-request">
  <div class="modal" style="max-width:500px">
    <div class="modal-title">Request a Refund or Credit <button class="btn btn-ghost btn-sm" style="float:right;margin-top:-4px" onclick="closeModal('modal-refund-request')">✕</button></div>
    <div style="font-size:14px;color:var(--grey);line-height:1.7;margin:12px 0 22px">Refunds and credits are processed by the studio. We aim to respond within 2 business days.</div>

    <!-- Which payment -->
    <div style="margin-bottom:16px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px">Which payment?</div>
      <select style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit">
        <option>Season 3 - Level 2 + Dance · $440 · 7 Apr 2026</option>
        <option>Season 2 - Level 2 · $270 · 10 Feb 2026</option>
        <option>Casual · Level 1 (Wed 5 Feb) · $40 · 3 Feb 2026</option>
        <option>Season 1 - Level 1 · $270 · 15 Nov 2025</option>
      </select>
    </div>

    <!-- Reason -->
    <div style="margin-bottom:16px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px">Reason</div>
      <select style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit">
        <option>Medical / injury</option>
        <option>Couldn't attend — gave notice</option>
        <option>Duplicate charge</option>
        <option>Other</option>
      </select>
    </div>

    <!-- Note -->
    <div style="margin-bottom:16px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px">Note / details</div>
      <textarea rows="3" placeholder="Please describe your situation..." style="width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit;resize:vertical;line-height:1.5"></textarea>
    </div>

    <!-- Preferred resolution -->
    <div style="margin-bottom:6px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:12px">Preferred resolution</div>
      <label style="display:flex;align-items:center;gap:12px;cursor:pointer;margin-bottom:10px;font-size:14px">
        <input type="radio" name="refund-resolution" value="credit" checked style="accent-color:var(--lime)">
        Account credit
      </label>
      <label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:14px">
        <input type="radio" name="refund-resolution" value="refund" style="accent-color:var(--lime)">
        Bank refund
      </label>
    </div>

    <div class="modal-actions" style="margin-top:22px">
      <button class="btn btn-ghost" onclick="closeModal('modal-refund-request')">Cancel</button>
      <button class="btn btn-lime" style="flex:1" onclick="alert('Request submitted! Mimi will be in touch within 2 business days.');closeModal('modal-refund-request')">Submit Request</button>
    </div>
  </div>
</div>'''

NEW_MODAL = '''<!-- REFUND / CREDIT REQUEST MODAL -->
<div class="modal-overlay" id="modal-refund-request">
  <div class="modal" style="max-width:520px">
    <div class="modal-title">Request a Refund or Credit <button class="btn btn-ghost btn-sm" style="float:right;margin-top:-4px" onclick="closeModal('modal-refund-request')">✕</button></div>
    <div style="font-size:14px;color:var(--grey);line-height:1.7;margin:12px 0 20px">We aim to respond within 2 business days. Choose the payment below and we'll guide you through the right process.</div>

    <!-- Which payment -->
    <div style="margin-bottom:20px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px">Which payment?</div>
      <select id="refund-payment-sel" onchange="onRefundPaymentChange()" style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit">
        <option value="">— Select a payment —</option>
        <option value="season">Season 4 - Level 2 + Dance · $440 · 7 Apr 2026</option>
        <option value="season">Season 3 - Level 2 · $270 · 10 Feb 2026</option>
        <option value="casual">Casual · Level 1 (Wed 5 Feb) · $40 · 3 Feb 2026</option>
        <option value="season">Season 2 - Level 1 · $270 · 15 Nov 2025</option>
      </select>
    </div>

    <!-- Placeholder when nothing selected -->
    <div id="refund-placeholder" style="text-align:center;padding:24px 0;color:var(--grey);font-size:13px;">
      Select a payment above to continue.
    </div>

    <!-- ── SEASON FLOW ───────────────────────────────────── -->
    <div id="refund-season-flow" style="display:none;">
      <div style="background:#0a1800;border:1px solid #1e3800;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--lime);margin-bottom:8px;">Season Enrolment</div>
        <div style="font-size:13px;color:#ccc;line-height:1.65;">Season fees are paid upfront for the full term. You can request a <strong style="color:var(--white);">transfer to another class</strong> (subject to availability) or a <strong style="color:var(--white);">cancellation with pro-rata credit or refund</strong>.</div>
        <div style="font-size:12px;color:var(--grey);margin-top:8px;border-top:1px solid #1e3800;padding-top:8px;">Cancellations after Week 2 attract a $50 admin fee. Medical cancellations with documentation are fully credited.</div>
      </div>

      <!-- Request type -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:10px">What are you requesting?</div>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;margin-bottom:10px;font-size:14px;padding:10px 12px;background:#111;border-radius:8px;">
          <input type="radio" name="season-req-type" value="transfer" checked style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;" onchange="onSeasonReqTypeChange()">
          <div>
            <div style="font-weight:500;">Transfer to another class</div>
            <div style="font-size:12px;color:var(--grey);margin-top:2px;">Move your enrolment to a different timeslot or class within the same season</div>
          </div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;font-size:14px;padding:10px 12px;background:#111;border-radius:8px;">
          <input type="radio" name="season-req-type" value="cancel" style="accent-color:var(--lime);margin-top:2px;flex-shrink:0;" onchange="onSeasonReqTypeChange()">
          <div>
            <div style="font-weight:500;">Cancel my enrolment</div>
            <div style="font-size:12px;color:var(--grey);margin-top:2px;">Withdraw from the season and receive pro-rata credit or refund</div>
          </div>
        </label>
      </div>

      <!-- Transfer fields -->
      <div id="season-transfer-fields" style="margin-bottom:16px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px">Preferred class to transfer to</div>
        <select style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit;margin-bottom:10px;">
          <option>— Select class —</option>
          <option>Level 2 — Tue 6:30pm (3 spots available)</option>
          <option>Level 2 — Thu 6:30pm (1 spot available)</option>
          <option>Level 2 — Sat 10:00am (waitlist only)</option>
          <option>Other — please specify in notes</option>
        </select>
        <div style="font-size:12px;color:var(--grey);">Transfers are subject to availability. We'll confirm within 2 business days.</div>
      </div>

      <!-- Cancel fields -->
      <div id="season-cancel-fields" style="display:none;margin-bottom:16px;">
        <div style="background:#1a1a1a;border-radius:8px;padding:12px 14px;margin-bottom:14px;">
          <div style="font-size:12px;text-transform:uppercase;color:var(--grey);margin-bottom:8px;">Estimated pro-rata credit</div>
          <div style="font-size:13px;line-height:1.7;">
            <div style="display:flex;justify-content:space-between;"><span>Season fee paid</span><span>$440.00</span></div>
            <div style="display:flex;justify-content:space-between;color:var(--grey);"><span>Classes completed (4 of 8)</span><span>− $220.00</span></div>
            <div style="display:flex;justify-content:space-between;color:var(--grey);"><span>Admin fee</span><span>− $50.00</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;color:var(--lime);border-top:1px solid #333;margin-top:8px;padding-top:8px;"><span>Credit / refund estimate</span><span>$170.00</span></div>
          </div>
        </div>
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:10px">Reason for cancellation</div>
        <select style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit;margin-bottom:12px;">
          <option>Medical / injury (documentation required)</option>
          <option>Personal circumstances</option>
          <option>Relocating / unable to continue</option>
          <option>Dissatisfied with class</option>
          <option>Other</option>
        </select>
        <!-- Preferred resolution -->
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:10px">Preferred resolution</div>
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;margin-bottom:10px;font-size:14px">
          <input type="radio" name="season-cancel-resolution" value="credit" checked style="accent-color:var(--lime)">
          Account credit (fastest)
        </label>
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:14px">
          <input type="radio" name="season-cancel-resolution" value="refund" style="accent-color:var(--lime)">
          Bank refund (up to 5 business days)
        </label>
      </div>

      <!-- Shared note -->
      <div style="margin-bottom:6px">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px">Additional notes</div>
        <textarea rows="3" placeholder="Any extra context for the studio..." style="width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit;resize:vertical;line-height:1.5"></textarea>
      </div>
    </div>

    <!-- ── INDIVIDUAL CLASS FLOW ──────────────────────────── -->
    <div id="refund-casual-flow" style="display:none;">
      <div style="background:#100a00;border:1px solid #3a2800;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--amber);margin-bottom:8px;">Individual / Casual Class</div>
        <div style="font-size:13px;color:#ccc;line-height:1.65;">Individual class fees are generally non-refundable per our studio policy. However, if you gave <strong style="color:var(--white);">at least 24 hours' notice</strong> or have a <strong style="color:var(--white);">medical reason</strong>, we can issue a <strong style="color:var(--white);">within-season catch-up credit</strong> for use at another class.</div>
        <div style="font-size:12px;color:var(--grey);margin-top:8px;border-top:1px solid #3a2800;padding-top:8px;">Catch-up credits expire at the end of the current season and cannot be redeemed as cash.</div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px">Reason</div>
        <select style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit">
          <option>Medical / injury</option>
          <option>Gave 24 + hours' notice</option>
          <option>Emergency — unable to give notice</option>
          <option>Duplicate charge</option>
          <option>Other</option>
        </select>
      </div>

      <div style="margin-bottom:6px">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--grey);margin-bottom:8px">Additional notes</div>
        <textarea rows="3" placeholder="Please describe your situation..." style="width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:11px 14px;color:var(--white);font-size:14px;font-family:inherit;resize:vertical;line-height:1.5"></textarea>
      </div>

      <div style="background:#1a1a1a;border-radius:8px;padding:10px 14px;margin-top:14px;font-size:13px;color:var(--grey);">
        If approved, a <strong style="color:var(--white);">catch-up credit</strong> will be added to your account within 2 business days. You can use it to book into any class before the end of Season 4 (5 Jul 2026).
      </div>
    </div>

    <div class="modal-actions" style="margin-top:22px">
      <button class="btn btn-ghost" onclick="closeModal('modal-refund-request')">Cancel</button>
      <button id="refund-submit-btn" class="btn btn-lime" style="flex:1;opacity:0.4;pointer-events:none;" onclick="submitRefundRequest()">Submit Request</button>
    </div>
  </div>
</div>

<script>
function onRefundPaymentChange() {
  var sel = document.getElementById('refund-payment-sel');
  var val = sel.options[sel.selectedIndex].value;
  document.getElementById('refund-placeholder').style.display = val ? 'none' : '';
  document.getElementById('refund-season-flow').style.display = val === 'season' ? '' : 'none';
  document.getElementById('refund-casual-flow').style.display = val === 'casual' ? '' : 'none';
  var btn = document.getElementById('refund-submit-btn');
  if(val) { btn.style.opacity = ''; btn.style.pointerEvents = ''; }
  else    { btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none'; }
}

function onSeasonReqTypeChange() {
  var isCancel = document.querySelector('input[name="season-req-type"]:checked').value === 'cancel';
  document.getElementById('season-transfer-fields').style.display = isCancel ? 'none' : '';
  document.getElementById('season-cancel-fields').style.display = isCancel ? '' : 'none';
}

function submitRefundRequest() {
  var sel = document.getElementById('refund-payment-sel');
  var type = sel.options[sel.selectedIndex].value;
  if(type === 'season') {
    var reqType = document.querySelector('input[name="season-req-type"]:checked').value;
    if(reqType === 'transfer') {
      alert('Transfer request submitted! We\'ll check availability and confirm within 2 business days.');
    } else {
      alert('Cancellation request submitted! We\'ll review and process your credit or refund within 2 business days.');
    }
  } else {
    alert('Catch-up credit request submitted! We\'ll review and be in touch within 2 business days.');
  }
  closeModal('modal-refund-request');
}
</script>'''

if OLD_MODAL in html:
    html = html.replace(OLD_MODAL, NEW_MODAL)
    print('Modal replaced successfully')
else:
    print('ERROR: Could not find old modal — check for whitespace differences')

with open('student-ux.html', 'w') as f:
    f.write(html)

print('student-ux.html patched OK')
