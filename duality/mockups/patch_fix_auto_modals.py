#!/usr/bin/env python3
"""
Fix automation builder modals:
1. Remove the two broken modals from inside screen-notifications
2. Re-add them as proper modal-overlay divs before </body>
3. Fix JS to use openModal()/closeModal() instead of style.display
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Remove broken modals from inside screen-notifications
# ─────────────────────────────────────────────────────────────────────────────
OLD_BROKEN = '''      <!-- ── Node edit modal ───────────────────────────────────────────────── -->
      <div id="modal-node-edit" class="modal" style="display:none;">
        <div class="modal-box" style="width:480px;">
          <div class="modal-header">
            <div class="modal-title" id="node-edit-title">Edit Node</div>
            <button class="modal-close" onclick="closeModal(\'modal-node-edit\')">&#10005;</button>
          </div>
          <div id="node-edit-body" style="padding:20px;"></div>
          <div style="padding:0 20px 20px;display:flex;gap:10px;">
            <button class="btn btn-lime" onclick="saveNodeEdit()">Save</button>
            <button class="btn btn-ghost" onclick="closeModal(\'modal-node-edit\')">Cancel</button>
          </div>
        </div>
      </div>

      <!-- ── New automation modal ──────────────────────────────────────────── -->
      <div id="modal-new-automation" class="modal" style="display:none;">
        <div class="modal-box" style="width:500px;">
          <div class="modal-header">
            <div class="modal-title">New Automation</div>
            <button class="modal-close" onclick="closeModal(\'modal-new-automation\')">&#10005;</button>
          </div>
          <div style="padding:20px;">
            <div class="field">
              <label>Automation name</label>
              <input type="text" id="new-auto-name" placeholder="e.g. No-show follow-up" />
            </div>
            <div class="field">
              <label>Category</label>
              <select id="new-auto-cat" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">
                <option>Booking &amp; Class</option>
                <option>Billing &amp; Fees</option>
                <option>Re-engagement</option>
                <option>Custom</option>
              </select>
            </div>
            <div class="field">
              <label>Starts with trigger</label>
              <select id="new-auto-trigger" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">
                <option value="booking">Student completes booking</option>
                <option value="noshow">Student marked no-show</option>
                <option value="overdue">Balance becomes overdue</option>
                <option value="lapsed3">No booking for 3 weeks</option>
                <option value="lapsed6">No booking for 6 weeks</option>
                <option value="lapsed12">No booking for 12 weeks</option>
                <option value="waitlist">Spot opens on waitlist</option>
                <option value="firstclass">First class within 24h</option>
                <option value="season_end">Season ends</option>
                <option value="manual">Manual / on demand</option>
              </select>
            </div>
          </div>
          <div style="padding:0 20px 20px;display:flex;gap:10px;">
            <button class="btn btn-lime" onclick="createNewAutomation()">Create &amp; Open</button>
            <button class="btn btn-ghost" onclick="closeModal(\'modal-new-automation\')">Cancel</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ===== MARKETING ===== -->'''

NEW_WITHOUT_MODALS = '''    </div>

    <!-- ===== MARKETING ===== -->'''

assert OLD_BROKEN in html, 'OLD_BROKEN not found'
html = html.replace(OLD_BROKEN, NEW_WITHOUT_MODALS, 1)
print('Removed broken inline modals from screen-notifications')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add correct modal-overlay divs before </body>
# ─────────────────────────────────────────────────────────────────────────────
PROPER_MODALS = '''<!-- ── Node edit modal ── -->
<div class="modal-overlay" id="modal-node-edit">
  <div class="modal" style="width:480px;max-width:95vw;">
    <div class="modal-title" id="node-edit-title">Edit Node</div>
    <div id="node-edit-body"></div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn btn-lime" onclick="saveNodeEdit()">Save</button>
      <button class="btn btn-ghost" onclick="closeModal(\'modal-node-edit\')">Cancel</button>
    </div>
  </div>
</div>

<!-- ── New automation modal ── -->
<div class="modal-overlay" id="modal-new-automation">
  <div class="modal" style="width:500px;max-width:95vw;">
    <div class="modal-title">New Automation</div>
    <div class="field">
      <label>Automation name</label>
      <input type="text" id="new-auto-name" placeholder="e.g. No-show follow-up" />
    </div>
    <div class="field">
      <label>Category</label>
      <select id="new-auto-cat" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">
        <option>Booking &amp; Class</option>
        <option>Billing &amp; Fees</option>
        <option>Re-engagement</option>
        <option>Custom</option>
      </select>
    </div>
    <div class="field">
      <label>Starts with trigger</label>
      <select id="new-auto-trigger" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">
        <option value="booking">Student completes booking</option>
        <option value="noshow">Student marked no-show</option>
        <option value="overdue">Balance becomes overdue</option>
        <option value="lapsed3">No booking for 3 weeks</option>
        <option value="lapsed6">No booking for 6 weeks</option>
        <option value="lapsed12">No booking for 12 weeks</option>
        <option value="waitlist">Spot opens on waitlist</option>
        <option value="firstclass">First class within 24h</option>
        <option value="season_end">Season ends</option>
        <option value="manual">Manual / on demand</option>
      </select>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn btn-lime" onclick="createNewAutomation()">Create &amp; Open</button>
      <button class="btn btn-ghost" onclick="closeModal(\'modal-new-automation\')">Cancel</button>
    </div>
  </div>
</div>

</body>'''

html = html.replace('</body>', PROPER_MODALS, 1)
print('Added proper modal-overlay divs')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Fix JS — replace style.display calls with openModal()/closeModal()
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    "document.getElementById('modal-node-edit').style.display = 'flex';",
    "openModal('modal-node-edit');",
    1
)
html = html.replace(
    "document.getElementById('modal-new-automation').style.display = 'flex';",
    "openModal('modal-new-automation');",
    1
)
print('Fixed JS openModal calls')

# ─────────────────────────────────────────────────────────────────────────────
# Safety
# ─────────────────────────────────────────────────────────────────────────────
assert 'class="modal-overlay" id="modal-node-edit"' in html
assert 'class="modal-overlay" id="modal-new-automation"' in html
assert "openModal('modal-node-edit')" in html
assert "openModal('modal-new-automation')" in html
assert 'node-edit-body' in html
assert 'new-auto-name' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkfam{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkfam{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:400]}')
print('Written.')
