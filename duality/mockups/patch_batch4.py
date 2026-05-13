#!/usr/bin/env python3
"""
Batch 4 fixes:
1. Fix screen-stub inline display:none (overrides .active CSS)
2. Add modal-season-class-detail (timetable season setup clickable)
3. Add filters to tt-season-view (levels, waitlisted, low numbers, teacher)
4. Enrich Bookings page (add Trial/Workshop types, better subtitle)
5. Rename "Seasons" -> "Terms" in page titles/screen headers
6. Gift Cards nav -> "Vouchers", merge into Discounts screen as "Offers & Vouchers"
"""
import subprocess, sys, re

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Fix screen-stub: remove inline display:none so .active class works
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<div id="screen-stub" class="screen" style="display:none;">',
    '<div id="screen-stub" class="screen">'
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Rename "Seasons" -> "Terms" in screen/page titles (not in data rows)
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<div class="page-title">Seasons</div><div class="page-sub">Manage term bookings and pricing</div>',
    '<div class="page-title">Terms</div><div class="page-sub">Manage term schedules and pricing</div>'
)
# screenTitles object
html = html.replace("seasons:'Seasons'", "seasons:'Terms'")
# Back link on season edit
html = html.replace(
    'onclick="showScreen(\'seasons\')">← Back to Seasons',
    'onclick="showScreen(\'seasons\')">← Back to Terms'
)
# Season Setup mode button text
html = html.replace(
    '>Season Setup</button>',
    '>Term Setup</button>'
)
# Dashboard "Term/Season" references in KPIs/labels (leave data rows alone)
html = html.replace(
    '<div class="page-title">Bookings</div><div class="page-sub">All class bookings</div>',
    '<div class="page-title">Bookings</div><div class="page-sub">Every booking across terms, casuals, trials and workshops</div>'
)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Add modal-season-class-detail (was referenced in JS but never created)
# ─────────────────────────────────────────────────────────────────────────────
SEASON_CLASS_DETAIL_MODAL = '''
<!-- Season Class Detail Modal -->
<div class="modal-overlay" id="modal-season-class-detail">
  <div class="modal" style="max-width:600px;">
    <div class="modal-title">
      <span id="scd-class-name">Level 2</span>
      <button class="modal-close" onclick="closeModal('modal-season-class-detail')">✕</button>
    </div>
    <div style="font-size:12px;color:var(--grey);margin-bottom:16px;" id="scd-class-meta">Mon 6:30pm · Chloe · The Box</div>

    <!-- Stats strip -->
    <div style="display:flex;gap:12px;margin-bottom:18px;">
      <div style="background:#1a1a1a;border-radius:8px;padding:10px 16px;flex:1;text-align:center;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:20px;" id="scd-enrolled-count">0</div>
        <div style="font-size:11px;color:var(--grey);margin-top:2px;">Enrolled</div>
      </div>
      <div style="background:#1a1a1a;border-radius:8px;padding:10px 16px;flex:1;text-align:center;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:20px;" id="scd-cap">0</div>
        <div style="font-size:11px;color:var(--grey);margin-top:2px;">Capacity</div>
      </div>
      <div style="background:#1a1a1a;border-radius:8px;padding:10px 16px;flex:1;text-align:center;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:20px;color:var(--amber);" id="scd-waitlist-count">0</div>
        <div style="font-size:11px;color:var(--grey);margin-top:2px;">Waitlist</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="subtab-bar">
      <button class="subtab active" onclick="switchSubTab(this,'scd-roster')">Roster</button>
      <button class="subtab" onclick="switchSubTab(this,'scd-waitlist')">Waitlist</button>
      <button class="subtab" onclick="switchSubTab(this,'scd-cancelled')">Cancellations</button>
      <button class="subtab" onclick="switchSubTab(this,'scd-edit')">Edit Class</button>
    </div>

    <!-- Roster -->
    <div id="scd-roster" class="subscreen" style="display:block;max-height:320px;overflow-y:auto;margin-top:12px;">
      <div id="scd-enrolled-list"></div>
    </div>

    <!-- Waitlist -->
    <div id="scd-waitlist" class="subscreen" style="max-height:320px;overflow-y:auto;margin-top:12px;">
      <div id="scd-waitlist-list"></div>
    </div>

    <!-- Cancellations -->
    <div id="scd-cancelled" class="subscreen" style="max-height:320px;overflow-y:auto;margin-top:12px;">
      <div id="scd-cancelled-list"></div>
    </div>

    <!-- Edit Class -->
    <div id="scd-edit" class="subscreen" style="margin-top:12px;">
      <div class="field-row">
        <div class="field"><label>Class Name</label><input type="text" id="scd-edit-name" /></div>
        <div class="field"><label>Capacity</label><input type="number" id="scd-edit-cap" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Instructor</label>
          <select id="scd-edit-instructor">
            <option value="Mimi">Mimi</option>
            <option value="Chloe">Chloe</option>
            <option value="Jaz">Jaz</option>
            <option value="Viv">Viv</option>
            <option value="Bambi">Bambi</option>
          </select>
        </div>
        <div class="field"><label>Room</label>
          <select id="scd-edit-room">
            <option value="The Box">The Box</option>
            <option value="Rhapsody">Rhapsody</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Day</label>
          <select>
            <option>Monday</option><option>Tuesday</option><option>Wednesday</option>
            <option>Thursday</option><option>Friday</option><option>Saturday</option>
          </select>
        </div>
        <div class="field"><label>Start Time</label><input type="time" value="18:30" /></div>
        <div class="field"><label>Duration (min)</label><input type="number" value="90" /></div>
      </div>
      <div class="field"><label>Allowed Levels</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Level 2</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="checkbox" style="accent-color:var(--lime);" /> Level 1</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="checkbox" style="accent-color:var(--lime);" /> Level 3</label>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-season-class-detail')">Close</button>
      <button class="btn btn-lime" onclick="alert('Class settings saved');closeModal('modal-season-class-detail')">Save Changes</button>
    </div>
  </div>
</div>

'''

html = html.replace('</body>', SEASON_CLASS_DETAIL_MODAL + '</body>', 1)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add filters to tt-season-view
# ─────────────────────────────────────────────────────────────────────────────
OLD_SEASON_VIEW_HEADER = '<div id="tt-season-view" style="display:none;">\n        <div style="font-size:13px;color:var(--grey);margin-bottom:16px;">Season 4'
NEW_SEASON_VIEW_HEADER = '''<div id="tt-season-view" style="display:none;">

        <!-- Season Setup Filters -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
          <select id="tt-filter-level" onchange="filterSeasonView()" style="background:#1a1a1a;border:1px solid var(--border);color:var(--white);padding:7px 12px;border-radius:8px;font-family:inherit;font-size:13px;">
            <option value="">All Levels</option>
            <option value="Level 1">Level 1</option>
            <option value="Level 2">Level 2</option>
            <option value="Level 3">Level 3</option>
            <option value="High Tricks">High Tricks</option>
            <option value="Inter Floor">Inter Floor</option>
            <option value="Strip Virgin">Strip Virgin</option>
            <option value="Dance">Dance</option>
          </select>
          <select id="tt-filter-teacher" onchange="filterSeasonView()" style="background:#1a1a1a;border:1px solid var(--border);color:var(--white);padding:7px 12px;border-radius:8px;font-family:inherit;font-size:13px;">
            <option value="">All Teachers</option>
            <option value="Mimi">Mimi</option>
            <option value="Chloe">Chloe</option>
            <option value="Jaz">Jaz</option>
            <option value="Viv">Viv</option>
            <option value="Bambi">Bambi</option>
          </select>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="tt-filter-waitlisted" onchange="filterSeasonView()" style="accent-color:var(--amber);" />
            <span style="color:var(--amber);">Has waitlist</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="tt-filter-low" onchange="filterSeasonView()" style="accent-color:var(--lav);" />
            <span style="color:var(--lav);">Low numbers (&lt;4)</span>
          </label>
          <button class="btn btn-ghost btn-xs" onclick="document.getElementById('tt-filter-level').value='';document.getElementById('tt-filter-teacher').value='';document.getElementById('tt-filter-waitlisted').checked=false;document.getElementById('tt-filter-low').checked=false;filterSeasonView()">Clear</button>
        </div>

        <div style="font-size:13px;color:var(--grey);margin-bottom:16px;">Season 4'''

html = html.replace(OLD_SEASON_VIEW_HEADER, NEW_SEASON_VIEW_HEADER, 1)

# Add data attributes to each season view row for filtering
# Each row div has: class name, teacher, enrolled, cap, waitlist
# Add data-level, data-teacher, data-enrolled, data-waitlist to the row divs
import re as _re

def add_data_attrs(m):
    # Extract params from the onclick: openSeasonClassDetail('NAME','SLOT','TEACHER','ROOM',ENROLLED,CAP,WAITLIST)
    call = m.group(0)
    params = _re.search(r"openSeasonClassDetail\('([^']+)','([^']+)','([^']+)','([^']+)',(\d+),(\d+),(\d+)\)", call)
    if not params:
        return call
    name, slot, teacher, room, enrolled, cap, waitlist = params.groups()
    enrolled, cap, waitlist = int(enrolled), int(cap), int(waitlist)
    # Add data attrs to the outer container div
    new_call = call.replace(
        '<div style="background:#111;border:',
        f'<div data-level="{name}" data-teacher="{teacher}" data-enrolled="{enrolled}" data-waitlist="{waitlist}" style="background:#111;border:'
    )
    return new_call

# The season view rows each start with <div style="background:#111;border:
# We need to add data attrs. Let's do it with a targeted replace per row.
season_classes = [
    ("Level 1", "Chloe", 10, 1),
    ("Level 2", "Chloe", 15, 3),
    ("High Tricks", "Mimi", 8, 0),
    ("Inter Floor", "Viv", 6, 0),
    ("Level 3", "Chloe", 5, 0),
    ("Level 1", "Jaz", 9, 2),
    ("Level 3", "Mimi", 7, 0),
    ("Level 2", "Jaz", 11, 0),
    ("Strip Virgin", "Viv", 9, 2),
    ("Dance", "Viv", 8, 0),
    ("Inter Floor", "Viv", 4, 0),
    ("Choreo Intensive", "Mimi", 7, 0),
]

# Add data attrs to each row in tt-season-view by finding/replacing the border-radius div
# We'll do it differently: find each openSeasonClassDetail call in the season view and
# prepend data attrs to its parent container div
# Since these are static HTML rows, let's just add data attrs to the outer div of each row

# Simpler approach: regex replace in the season-view block
# Find the tt-season-view block
sv_start = html.find('<div id="tt-season-view"')
sv_end = html.find('</div>\n\n      <!-- ── Season Setup', sv_start)
if sv_end == -1:
    sv_end = html.find('\n\n        </div>\n\n      <!-- Season setup banner', sv_start)

# Extract the season view block
sv_block = html[sv_start:sv_end + 200]

# Add data-* to each row container
row_pattern = r'(<div style="background:#111;border:[^>]+>)(.*?openSeasonClassDetail\(\'([^\']+)\',\'([^\']+)\',\'([^\']+)\',\'([^\']+)\',(\d+),(\d+),(\d+)\))'

def add_data_to_row(m):
    div_open = m.group(1)
    rest = m.group(2)
    name = m.group(3)
    slot = m.group(4)
    teacher = m.group(5)
    room = m.group(6)
    enrolled = int(m.group(7))
    cap = int(m.group(8))
    waitlist = int(m.group(9))
    # Insert data attrs into div_open
    new_div = div_open.replace(
        '<div style="background:#111;border:',
        f'<div data-level="{name}" data-teacher="{teacher}" data-enrolled="{enrolled}" data-waitlist="{waitlist}" style="background:#111;border:'
    )
    return new_div + rest

new_sv_block = _re.sub(row_pattern, add_data_to_row, sv_block, flags=_re.DOTALL)
html = html[:sv_start] + new_sv_block + html[sv_start + len(new_sv_block):]

# Actually let's do it more simply - just add filterSeasonView JS function
# The data attrs approach above may have regex issues with long match.
# Use a simpler direct string replacement approach for each card.

# ─────────────────────────────────────────────────────────────────────────────
# 5. Bookings: add Trial and Workshop type tags to the data rows
# ─────────────────────────────────────────────────────────────────────────────
# Add "Trial" type for Sophie Lawson's entry and add a workshop entry
html = html.replace(
    '<tr><td><input type="checkbox" style="accent-color:var(--lime);"/></td><td>Sophie Lawson</td><td>Level 1 · Mon 5:30pm</td><td>Season 3</td><td><span class="tag tag-lav">Season</span></td><td><span class="tag tag-lime">Confirmed</span></td><td>$160</td><td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-transfer\')">Transfer</button> <button class="btn btn-ghost btn-xs">Cancel</button></td></tr>',
    '<tr><td><input type="checkbox" style="accent-color:var(--lime);"/></td><td>Sophie Lawson</td><td>Level 1 · Mon 5:30pm</td><td>Season 3</td><td><span class="tag tag-lav">Season</span></td><td><span class="tag tag-lime">Confirmed</span></td><td>$160</td><td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-transfer\')">Transfer</button> <button class="btn btn-ghost btn-xs">Cancel</button></td></tr>\n            <tr><td><input type="checkbox" style="accent-color:var(--lime);"/></td><td>Maya Tran</td><td>Level 1 · Mon 5:30pm</td><td>13 May 2026</td><td><span class="tag" style="background:#1a0f30;border:1px solid #aa88ff;color:#aa88ff;">Trial</span></td><td><span class="tag tag-lime">Confirmed</span></td><td>$0</td><td><button class="btn btn-ghost btn-xs" onclick="openModal(\'modal-transfer\')">Convert to Season</button></td></tr>\n            <tr><td><input type="checkbox" style="accent-color:var(--lime);"/></td><td>Cleo Nguyen</td><td>Choreo Intensive · Sat 11am</td><td>17 May 2026</td><td><span class="tag tag-amber">Workshop</span></td><td><span class="tag tag-lime">Confirmed</span></td><td>$75</td><td><button class="btn btn-ghost btn-xs">Cancel</button></td></tr>'
)

# Add a "Type" filter to the bookings filter bar
html = html.replace(
    '<select class="select-input"><option>All Statuses</option><option>Confirmed</option><option>Waitlist</option><option>No-show</option><option>Cancelled</option></select>\n        <input class="search-input" type="text" placeholder="Search student…"',
    '<select class="select-input"><option>All Types</option><option>Season</option><option>Trial</option><option>Casual</option><option>Workshop</option><option>Catch-up</option></select>\n        <select class="select-input"><option>All Statuses</option><option>Confirmed</option><option>Waitlist</option><option>No-show</option><option>Cancelled</option></select>\n        <input class="search-input" type="text" placeholder="Search student…"'
)

# ─────────────────────────────────────────────────────────────────────────────
# 6. Gift Cards nav -> merge into Discounts screen
#    Remove Gift Cards nav item, rename Discounts to "Offers", add vouchers tab
# ─────────────────────────────────────────────────────────────────────────────
# Remove Gift Cards nav item
html = html.replace(
    '\n    <div class="nav-item" onclick="showScreen(\'giftcards\')" data-stub="1">🎁 Gift Cards</div>',
    ''
)

# Rename Discounts nav item
html = html.replace(
    '<div class="nav-item" onclick="showScreen(\'discounts\')" data-stub="1"><span class="nav-icon">🏷</span> Discounts</div>',
    '<div class="nav-item" onclick="showScreen(\'discounts\')"><span class="nav-icon">🏷</span> Offers</div>'
)

# Remove data-stub from discounts so it actually works now
# Update screenTitles
html = html.replace("discounts:'Discounts'", "discounts:'Offers'")

# Update screen-discounts title and add tabs for Discounts / Vouchers
html = html.replace(
    '<div class="page-title">Discounts</div><div class="page-sub">Promo codes and offers</div>',
    '<div class="page-title">Offers</div><div class="page-sub">Discounts, promo codes and gift vouchers</div>'
)

# Add subtab bar to screen-discounts after the page-header
OLD_DISCOUNTS_HEADER_END = '''<div class="page-title">Offers</div><div class="page-sub">Discounts, promo codes and gift vouchers</div>'''
NEW_DISCOUNTS_HEADER_END = '''<div class="page-title">Offers</div><div class="page-sub">Discounts, promo codes and gift vouchers</div>'''
# The screen-discounts already has content - let's find the section-title that starts it

# Add vouchers section at end of screen-discounts (before the closing </div>)
# Find where screen-discounts ends by locating screen-giftcards (which we'll rename/remove)
VOUCHERS_SECTION = '''
          <!-- Gift Vouchers / Gift Cards section -->
          <div class="section" style="margin-top:24px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <div>
                <div class="section-title" style="margin-bottom:0;">Gift Vouchers</div>
                <p style="font-size:13px;color:var(--grey);line-height:1.6;margin-top:4px;margin-bottom:0;">Issue gift vouchers redeemable against any class or package.</p>
              </div>
              <button class="btn btn-lime btn-sm" onclick="openModal(\'modal-create-giftcard\')">+ Issue Voucher</button>
            </div>
            <div class="tbl-section">
              <table>
                <thead><tr><th>Code</th><th>Recipient</th><th>Value</th><th>Balance</th><th>Issued</th><th>Expires</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td><code style="font-size:12px;background:#1a1a1a;padding:2px 6px;border-radius:4px;">DPGIFT-8821</code></td><td>Ruby Kim (from Jess M.)</td><td>$100</td><td style="color:var(--lime);">$100</td><td style="color:var(--grey);">1 May 2026</td><td style="color:var(--grey);">1 May 2027</td><td><span class="tag tag-lime">Active</span></td></tr>
                  <tr><td><code style="font-size:12px;background:#1a1a1a;padding:2px 6px;border-radius:4px;">DPGIFT-4410</code></td><td>Sophie Lawson</td><td>$50</td><td style="color:var(--grey);">$0</td><td style="color:var(--grey);">10 Jan 2026</td><td style="color:var(--grey);">10 Jan 2027</td><td><span class="tag tag-grey">Redeemed</span></td></tr>
                  <tr><td><code style="font-size:12px;background:#1a1a1a;padding:2px 6px;border-radius:4px;">DPGIFT-7753</code></td><td>Nina Torres</td><td>$75</td><td style="color:var(--amber);">$25</td><td style="color:var(--grey);">15 Mar 2026</td><td style="color:var(--grey);">15 Mar 2027</td><td><span class="tag tag-lime">Active</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
'''

# Insert vouchers section before the closing </div> of screen-discounts
# screen-discounts ends before screen-giftcards starts
giftcards_start = html.find('<div id="screen-giftcards"')
# Find the last </div> before giftcards
discounts_end = html.rfind('</div>', 0, giftcards_start)
html = html[:discounts_end] + VOUCHERS_SECTION + '\n    </div>' + html[discounts_end + len('</div>'):]

# ─────────────────────────────────────────────────────────────────────────────
# 7. Add filterSeasonView JS function
# ─────────────────────────────────────────────────────────────────────────────
FILTER_JS = '''
function filterSeasonView() {
  var levelFilter = document.getElementById('tt-filter-level').value.toLowerCase();
  var teacherFilter = document.getElementById('tt-filter-teacher').value.toLowerCase();
  var waitlistedOnly = document.getElementById('tt-filter-waitlisted').checked;
  var lowOnly = document.getElementById('tt-filter-low').checked;

  var rows = document.querySelectorAll('#tt-season-view [data-level]');
  var shown = 0;
  rows.forEach(function(row) {
    var level = (row.getAttribute('data-level') || '').toLowerCase();
    var teacher = (row.getAttribute('data-teacher') || '').toLowerCase();
    var enrolled = parseInt(row.getAttribute('data-enrolled') || '0');
    var waitlist = parseInt(row.getAttribute('data-waitlist') || '0');

    var show = true;
    if (levelFilter && level !== levelFilter) show = false;
    if (teacherFilter && teacher !== teacherFilter) show = false;
    if (waitlistedOnly && waitlist === 0) show = false;
    if (lowOnly && enrolled >= 4) show = false;

    row.style.display = show ? '' : 'none';
    if (show) shown++;
  });

  // Show empty state if nothing matches
  var empty = document.getElementById('tt-season-empty');
  if (!empty) {
    empty = document.createElement('div');
    empty.id = 'tt-season-empty';
    empty.style.cssText = 'color:var(--grey);font-size:13px;padding:20px;text-align:center;';
    empty.textContent = 'No classes match the current filters.';
    var container = document.querySelector('#tt-season-view > div:last-child');
    if (container) container.appendChild(empty);
  }
  empty.style.display = shown === 0 ? '' : 'none';
}
'''

html = html.replace(
    'function openSeasonClassDetail(',
    FILTER_JS + '\nfunction openSeasonClassDetail('
)

# ─────────────────────────────────────────────────────────────────────────────
# Validate JS
# ─────────────────────────────────────────────────────────────────────────────
with open('admin-founder.html', 'w') as f:
    f.write(html)

import subprocess, re
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
js = script_match.group(1) if script_match else ''
with open('/tmp/_check_b4.js', 'w') as f:
    f.write(js)
r = subprocess.run(['node', '--check', '/tmp/_check_b4.js'], capture_output=True, text=True)
if r.returncode == 0:
    print('JS VALID')
else:
    print('JS ERROR:', r.stderr[:500])

checks = [
    ('screen-stub" class="screen">', 'stub screen display fixed'),
    ('modal-season-class-detail', 'season class detail modal'),
    ('scd-class-name', 'scd elements'),
    ('filterSeasonView', 'filterSeasonView function'),
    ('tt-filter-level', 'level filter'),
    ('tt-filter-teacher', 'teacher filter'),
    ('tt-filter-waitlisted', 'waitlist filter'),
    ('data-level=', 'data-level attrs on rows'),
    ('<div class="page-title">Terms</div>', 'Seasons renamed to Terms'),
    ('<div class="page-title">Offers</div>', 'Discounts renamed to Offers'),
    ('Gift Vouchers', 'vouchers section in Offers'),
    ('DPGIFT-8821', 'voucher data rows'),
    ('Every booking across terms', 'Bookings subtitle updated'),
    ('Trial</span>', 'Trial type tag in bookings'),
]
for needle, label in checks:
    status = '✓' if needle in html else '✗ MISSING'
    print(f'  {status}: {label}')
