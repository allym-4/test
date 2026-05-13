#!/usr/bin/env python3
"""
Safe patch: Retail checkout + Lockers overhaul.
Strategy: Replace only the exact screen-lockers block (identified by
start+end markers that won't overshoot), then append modals/JS just
before </body>. Never use slicing that can eat the script block.
"""
import subprocess, re

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. RETAIL: Add "New Purchase" button
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<button class="btn btn-lime" onclick="openModal(\'modal-add-product\')">+ Add Product</button>',
    '<button class="btn btn-ghost" onclick="openModal(\'modal-add-product\')">+ Add Product</button>\n          <button class="btn btn-lime" onclick="openModal(\'modal-new-purchase\')">🛒 New Purchase</button>'
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. LOCKERS: Replace screen block safely
#    The old screen-lockers starts and ends with known unique strings.
# ─────────────────────────────────────────────────────────────────────────────
LOCKER_START = '    <!-- ===== LOCKERS ===== -->\n    <div id="screen-lockers" class="screen">'
LOCKER_END   = '    </div>\n  </div><!-- end .content -->'   # unique ending

old_start = html.find(LOCKER_START)
old_end   = html.find(LOCKER_END, old_start)

assert old_start != -1, "Could not find LOCKER_START"
assert old_end   != -1, "Could not find LOCKER_END after LOCKER_START"

NEW_LOCKER_BLOCK = '''    <!-- ===== LOCKERS ===== -->
    <div id="screen-lockers" class="screen">
      <div class="page-header">
        <div><div class="page-title">Lockers</div><div class="page-sub">36 lockers · Season 4</div></div>
        <button class="btn btn-lime" onclick="openModal(\'modal-assign-locker\')">+ Assign Locker</button>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px;">
        <div class="kpi kpi-amber"><div class="kpi-label">Free Lockers</div><div class="kpi-value">8</div><div class="kpi-sub">Auto — 4+ classes/season</div></div>
        <div class="kpi kpi-lime"><div class="kpi-label">Paid Lockers</div><div class="kpi-value">11</div><div class="kpi-sub">$50/season</div></div>
        <div class="kpi"><div class="kpi-label">Available</div><div class="kpi-value">17</div><div class="kpi-sub">Unassigned</div></div>
        <div class="kpi kpi-red"><div class="kpi-label">Overdue</div><div class="kpi-value">2</div><div class="kpi-sub">Chase needed</div></div>
      </div>

      <!-- Auto-assign alert -->
      <div style="background:#1a1200;border:1px solid var(--amber);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:13px;color:var(--amber);margin-bottom:10px;">⚡ Auto-Assign Required — students in 4+ classes without a locker</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;background:#0f0c00;border-radius:8px;padding:10px 14px;">
            <div><div style="font-size:13px;font-weight:600;">Belle Currie</div><div style="font-size:11px;color:var(--grey);margin-top:2px;">4 classes this season — entitled to a free locker</div></div>
            <button style="background:var(--amber);color:#000;border:none;padding:5px 14px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;" onclick="openAssignLockerFor(\'Belle Currie\')">Assign Locker</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;background:#0f0c00;border-radius:8px;padding:10px 14px;">
            <div><div style="font-size:13px;font-weight:600;">Avalon Carnall</div><div style="font-size:11px;color:var(--grey);margin-top:2px;">4 classes this season — entitled to a free locker</div></div>
            <button style="background:var(--amber);color:#000;border:none;padding:5px 14px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;" onclick="openAssignLockerFor(\'Avalon Carnall\')">Assign Locker</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;background:#0f0c00;border-radius:8px;padding:10px 14px;">
            <div><div style="font-size:13px;font-weight:600;">Krys Kapsimallis</div><div style="font-size:11px;color:var(--grey);margin-top:2px;">5 classes this season — entitled to a free locker</div></div>
            <button style="background:var(--amber);color:#000;border:none;padding:5px 14px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;" onclick="openAssignLockerFor(\'Krys Kapsimallis\')">Assign Locker</button>
          </div>
        </div>
      </div>

      <!-- Locker map legend -->
      <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;margin-bottom:8px;">Locker Map</div>
      <div style="display:flex;gap:16px;margin-bottom:10px;font-size:12px;">
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#1a1000;border:1px solid var(--amber);display:inline-block;"></span> Free (auto)</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#0f1600;border:1px solid var(--lime);display:inline-block;"></span> Paid</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#2a0000;border:1px solid #ff3333;display:inline-block;"></span> Overdue</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#111;border:1px solid var(--border);display:inline-block;"></span> Available</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:24px;">
        <div style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(1,\'Jess Malone\',\'free\')"><div style="font-size:11px;font-weight:700;color:var(--amber)">01</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(2,\'Ruby Kim\',\'free\')"><div style="font-size:11px;font-weight:700;color:var(--amber)">02</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(3,\'Nina Torres\',\'free\')"><div style="font-size:11px;font-weight:700;color:var(--amber)">03</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(4,\'Dana Park\',\'free\')"><div style="font-size:11px;font-weight:700;color:var(--amber)">04</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(5,\'Amber Cole\',\'free\')"><div style="font-size:11px;font-weight:700;color:var(--amber)">05</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(6,\'Sophie Lawson\',\'free\')"><div style="font-size:11px;font-weight:700;color:var(--amber)">06</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(7,\'Hannah Webb\',\'free\')"><div style="font-size:11px;font-weight:700;color:var(--amber)">07</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(8,\'Tara Bell\',\'free\')"><div style="font-size:11px;font-weight:700;color:var(--amber)">08</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(9,\'Kylie Rhodes\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">09</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(10,\'Maya Tran\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">10</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(11,\'Cleo Nguyen\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">11</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(12,\'Rika Tyebally\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">12</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(13,\'Gee Chan\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">13</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(14,\'Zoe Clarke\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">14</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(15,\'Zara Malone\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">15</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(16,\'Lily Chen\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">16</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(17,\'Jordan Lee\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">17</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(18,\'Sam Lee\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">18</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(19,\'Mia Park\',\'paid\')"><div style="font-size:11px;font-weight:700;color:var(--lime)">19</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div style="background:#2a0000;border:1px solid #ff3333;border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(20,\'Sophie Lawson\',\'overdue\')"><div style="font-size:11px;font-weight:700;color:#ff6b6b">20</div><div style="font-size:9px;margin-top:2px;color:#ff6b6b">Overdue</div></div>
        <div style="background:#2a0000;border:1px solid #ff3333;border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(21,\'Kylie Rhodes\',\'overdue\')"><div style="font-size:11px;font-weight:700;color:#ff6b6b">21</div><div style="font-size:9px;margin-top:2px;color:#ff6b6b">Overdue</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">22</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">23</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">24</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">25</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">26</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">27</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">28</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">29</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">30</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">31</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">32</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">33</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">34</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">35</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal(\'modal-assign-locker\')"><div style="font-size:11px;font-weight:700;color:var(--grey)">36</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
      </div>

      <!-- Assignments table -->
      <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;margin-bottom:12px;">Assignments</div>
      <div class="tbl-section">
        <table>
          <thead><tr><th>Locker</th><th>Student</th><th>Type</th><th>Season Fee</th><th>Paid</th><th>Key Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td><b>#01</b></td><td>Jess Malone</td><td><span class="tag tag-amber" style="font-size:10px;">Free</span></td><td style="color:var(--grey);">—</td><td style="color:var(--lime);">Season 4</td><td><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td><td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(1,\'Jess Malone\',\'free\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td></tr>
            <tr><td><b>#02</b></td><td>Ruby Kim</td><td><span class="tag tag-amber" style="font-size:10px;">Free</span></td><td style="color:var(--grey);">—</td><td style="color:var(--lime);">Season 4</td><td><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td><td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(2,\'Ruby Kim\',\'free\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td></tr>
            <tr><td><b>#03</b></td><td>Nina Torres</td><td><span class="tag tag-amber" style="font-size:10px;">Free</span></td><td style="color:var(--grey);">—</td><td style="color:var(--lime);">Season 4</td><td><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;margin-top:2px;"><input type="checkbox" style="accent-color:var(--lime);" /> Key returned</label></td><td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(3,\'Nina Torres\',\'free\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td></tr>
            <tr><td><b>#09</b></td><td>Kylie Rhodes</td><td><span class="tag tag-lime" style="font-size:10px;">Paid</span></td><td style="color:var(--lime);">$50</td><td style="color:var(--lime);">Paid</td><td><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td><td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(9,\'Kylie Rhodes\',\'paid\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td></tr>
            <tr><td><b>#10</b></td><td>Maya Tran</td><td><span class="tag tag-lime" style="font-size:10px;">Paid</span></td><td style="color:var(--lime);">$50</td><td style="color:var(--lime);">Paid</td><td><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td><td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(10,\'Maya Tran\',\'paid\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td></tr>
            <tr><td><b>#20</b></td><td>Sophie Lawson</td><td><span class="tag tag-lime" style="font-size:10px;">Paid</span></td><td style="color:#ff6b6b;">$50 OVERDUE</td><td style="color:#ff6b6b;">Overdue</td><td><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;margin-top:2px;"><input type="checkbox" style="accent-color:#ff6b6b;" /> Key lost</label></td><td><button class="btn btn-ghost btn-xs" onclick="openChaseModal(\'Sophie Lawson\',\'Locker #20 fee\',\'$50\',1)">Chase</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td></tr>
            <tr><td><b>#21</b></td><td>Kylie Rhodes</td><td><span class="tag tag-lime" style="font-size:10px;">Paid</span></td><td style="color:#ff6b6b;">$50 OVERDUE</td><td style="color:#ff6b6b;">Overdue</td><td><label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td><td><button class="btn btn-ghost btn-xs" onclick="openChaseModal(\'Kylie Rhodes\',\'Locker #21 fee\',\'$50\',2)">Chase</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>'''

html = html[:old_start] + NEW_LOCKER_BLOCK + '\n' + html[old_end:]

# Safety check: confirm key sections still present
assert '<script>' in html, "SCRIPT TAG LOST"
assert 'function openModal' in html, "JS FUNCTIONS LOST"
assert '</body>' in html, "BODY END LOST"
print(f"File length after locker replace: {len(html.splitlines())} lines")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Forms & Docs: Wire up Edit/Preview buttons
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-ghost btn-xs">Edit</button><button class="btn btn-ghost btn-xs">Preview</button><label class="toggle" title="Required"><input type="checkbox" checked /><span class="toggle-slider"></span></label></div>\n        </div>\n        <div class="notif-row">\n          <div><div style="font-weight:500;font-size:13px;">Photo',
    '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-ghost btn-xs" onclick="openFormEdit(\'Health PAR-Q\')">Edit</button><button class="btn btn-ghost btn-xs" onclick="openFormPreview(\'Health PAR-Q\')">Preview</button><label class="toggle" title="Required"><input type="checkbox" checked /><span class="toggle-slider"></span></label></div>\n        </div>\n        <div class="notif-row">\n          <div><div style="font-weight:500;font-size:13px;">Photo'
)
# Simpler: just add onclick to all Edit/Preview pairs in this section
# Use targeted per-form replaces
forms = [
    ('Health, Injury &amp; PAR-Q Questionnaire', 'parq'),
    ('Photo &amp; Media Consent', 'photo-consent'),
    ('Studio Waiver', 'studio-waiver'),
    ('Season Enrolment Agreement', 'season-agreement'),
]
for form_name, form_id in forms:
    html = html.replace(
        f'font-size:13px;">{form_name}</div>',
        f'font-size:13px;">{form_name}</div>'  # no-op
    )

# Patch all 4 Edit/Preview button pairs in the forms section more directly
# Find the forms section and do targeted replacements
for form_name, form_id in forms:
    old = f'<b>{form_name}</b>'  # unlikely pattern, skip
    # Instead: find the notif-row containing the form name and fix its buttons
    marker = f'font-size:13px;">{form_name}</div>'
    idx = html.find(marker)
    if idx == -1:
        print(f"  Could not find form: {form_name}")
        continue
    # Find the next Edit/Preview buttons after this marker (within ~400 chars)
    chunk_end = idx + 500
    chunk = html[idx:chunk_end]
    if 'onclick="openFormEdit' in chunk:
        print(f"  Already wired: {form_name}")
        continue
    old_chunk = chunk
    new_chunk = chunk.replace(
        '<button class="btn btn-ghost btn-xs">Edit</button><button class="btn btn-ghost btn-xs">Preview</button>',
        f'<button class="btn btn-ghost btn-xs" onclick="openFormEdit(\'{form_id}\')">Edit</button><button class="btn btn-ghost btn-xs" onclick="openFormPreview(\'{form_id}\')">Preview</button>',
        1
    )
    if new_chunk != old_chunk:
        html = html[:idx] + new_chunk + html[chunk_end:]
        print(f"  Wired buttons for: {form_name}")
    else:
        print(f"  No button found near: {form_name}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add all modals + JS before </body>
# ─────────────────────────────────────────────────────────────────────────────

NEW_MODALS_AND_JS = '''
<!-- ===== New Purchase (POS) Modal ===== -->
<div class="modal-overlay" id="modal-new-purchase">
  <div class="modal" style="max-width:520px;">
    <div class="modal-title">New Purchase <button class="modal-close" onclick="closeModal('modal-new-purchase')">✕</button></div>
    <div class="field">
      <label>Customer</label>
      <button id="pos-guest-toggle" class="btn btn-ghost btn-xs" style="margin-bottom:8px;" onclick="togglePosGuest()">Switch to Guest</button>
      <div id="pos-student-row">
        <input type="text" id="pos-student-search" placeholder="Search student by name or email…" oninput="posSearchStudent(this.value)" autocomplete="off" />
        <div id="pos-student-results" style="display:none;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;margin-top:4px;max-height:160px;overflow-y:auto;"></div>
        <div id="pos-student-selected" style="display:none;background:#111;border:1px solid var(--lime);border-radius:8px;padding:8px 12px;margin-top:4px;align-items:center;justify-content:space-between;">
          <span id="pos-student-name" style="font-size:13px;font-weight:600;">—</span>
          <button class="btn btn-ghost btn-xs" onclick="clearPosStudent()">✕</button>
        </div>
      </div>
      <div id="pos-guest-row" style="display:none;"><input type="text" placeholder="Guest name (optional)" style="background:#1a1a1a;border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--white);font-family:inherit;width:100%;font-size:13px;box-sizing:border-box;" /></div>
    </div>
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:10px;">Items</div>
    <div id="pos-cart" style="background:#111;border-radius:8px;padding:0 14px;margin-bottom:12px;"><div id="pos-cart-items"><div style="padding:12px 0;font-size:13px;color:var(--grey);">No items added yet.</div></div></div>
    <div style="display:flex;gap:8px;margin-bottom:18px;align-items:center;">
      <select id="pos-product-select" class="select-input" style="flex:1;">
        <option value="">— Select product —</option>
        <option value="Dry Hands Grip Aid|18">Dry Hands Grip Aid — $18</option>
        <option value="Pole Grip Aid (Medium)|22">Pole Grip Aid (Medium) — $22</option>
        <option value="Duality Crop Top|55">Duality Crop Top — $55</option>
        <option value="Duality Booty Shorts|48">Duality Booty Shorts — $48</option>
        <option value="Duality Tote Bag|35">Duality Tote Bag — $35</option>
        <option value="Grip Socks|15">Grip Socks — $15</option>
        <option value="Knee Pads|28">Knee Pads — $28</option>
      </select>
      <input type="number" id="pos-qty" value="1" min="1" style="width:60px;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;padding:8px 10px;font-size:13px;" />
      <button class="btn btn-ghost btn-sm" onclick="posAddItem()">Add</button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1a1a1a;border-radius:8px;margin-bottom:18px;">
      <span style="font-size:13px;color:var(--grey);">Total</span>
      <span id="pos-total" style="font-family:'Archivo Black',sans-serif;font-size:22px;color:var(--lime);">$0.00</span>
    </div>
    <div class="field"><label>Payment Method</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-lime btn-sm" id="pos-pay-card" onclick="posSelectPayment('card')">💳 Card (Square)</button>
        <button class="btn btn-ghost btn-sm" id="pos-pay-cash" onclick="posSelectPayment('cash')">💵 Cash</button>
        <button class="btn btn-ghost btn-sm" id="pos-pay-credit" onclick="posSelectPayment('credit')">🎟 Account Credit</button>
        <button class="btn btn-ghost btn-sm" id="pos-pay-voucher" onclick="posSelectPayment('voucher')">🎁 Voucher</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-new-purchase')">Cancel</button>
      <button class="btn btn-lime" onclick="posCheckout()">Complete Sale</button>
    </div>
  </div>
</div>

<!-- ===== Assign Locker Modal ===== -->
<div class="modal-overlay" id="modal-assign-locker">
  <div class="modal" style="max-width:440px;">
    <div class="modal-title">Assign Locker <button class="modal-close" onclick="closeModal('modal-assign-locker')">✕</button></div>
    <div class="field"><label>Student</label><input type="text" id="locker-assign-student" placeholder="Name or email…" /></div>
    <div class="field-row">
      <div class="field"><label>Locker Number</label>
        <select class="select-input" id="locker-assign-num">
          <option>22</option><option>23</option><option>24</option><option>25</option>
          <option>26</option><option>27</option><option>28</option><option>29</option>
          <option>30</option><option>31</option><option>32</option><option>33</option>
          <option>34</option><option>35</option><option>36</option>
        </select>
      </div>
      <div class="field"><label>Type</label>
        <select class="select-input" id="locker-assign-type">
          <option value="free">Free (4+ classes)</option>
          <option value="paid">Paid ($50/season)</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Key Status</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:4px;"><input type="checkbox" id="locker-key-given" style="accent-color:var(--lime);" /> Key given to student</label>
    </div>
    <div class="field"><label>Notes</label><textarea placeholder="e.g. Combo: 1234" rows="2"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-assign-locker')">Cancel</button>
      <button class="btn btn-lime" onclick="alert('Locker assigned!');closeModal('modal-assign-locker')">Assign</button>
    </div>
  </div>
</div>

<!-- ===== Locker Detail Modal ===== -->
<div class="modal-overlay" id="modal-locker-detail">
  <div class="modal" style="max-width:460px;">
    <div class="modal-title">Locker <span id="ld-num">#01</span> <button class="modal-close" onclick="closeModal('modal-locker-detail')">✕</button></div>
    <div style="font-size:14px;font-weight:600;margin-bottom:14px;" id="ld-student">Jess Malone</div>
    <div style="background:#1a1a1a;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;"><span style="color:var(--grey);">Type</span><span id="ld-type-badge"></span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;"><span style="color:var(--grey);">Season</span><span>Season 4 (11 May – 5 Jul 2026)</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--grey);">Fee</span><span id="ld-fee">—</span></div>
    </div>
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:10px;">Key Status</div>
    <div style="background:#111;border-radius:8px;padding:14px 16px;margin-bottom:18px;display:flex;flex-direction:column;gap:10px;">
      <label style="display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer;"><input type="checkbox" id="ld-key-given" style="accent-color:var(--lime);width:16px;height:16px;" /> Key given to student</label>
      <label style="display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer;"><input type="checkbox" id="ld-key-returned" style="accent-color:var(--lime);width:16px;height:16px;" /> Key returned</label>
      <label style="display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer;"><input type="checkbox" id="ld-key-lost" style="accent-color:#ff6b6b;width:16px;height:16px;" onchange="if(this.checked){document.getElementById('ld-key-given').checked=false;document.getElementById('ld-key-returned').checked=false;}" /> <span style="color:#ff9999;">Key lost — replacement fee applies ($15)</span></label>
    </div>
    <div class="field"><label>Notes / Combo</label><textarea id="ld-notes" placeholder="e.g. Combo: 1234" rows="2"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-locker-detail')">Cancel</button>
      <button class="btn btn-ghost" style="color:#e05555;" onclick="if(confirm('Unassign this locker?')){alert('Locker unassigned');closeModal('modal-locker-detail')}">Unassign</button>
      <button class="btn btn-lime" onclick="alert('Changes saved');closeModal('modal-locker-detail')">Save</button>
    </div>
  </div>
</div>

<!-- ===== Form Builder Modal ===== -->
<div class="modal-overlay" id="modal-form-builder">
  <div class="modal" style="max-width:560px;">
    <div class="modal-title"><span id="form-builder-title">Edit Form</span> <button class="modal-close" onclick="closeModal('modal-form-builder')">✕</button></div>
    <div class="field"><label>Form Name</label><input type="text" id="form-builder-name" /></div>
    <div class="field"><label>Instructions</label><textarea id="form-builder-desc" rows="2" placeholder="Brief instructions shown to the student…"></textarea></div>
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:10px;">Fields</div>
    <div id="form-builder-fields" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;"></div>
    <button class="btn btn-ghost btn-sm" onclick="alert('Add field (not functional in mockup)')">+ Add Field</button>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-form-builder')">Cancel</button>
      <button class="btn btn-ghost" onclick="openFormPreview(document.getElementById('form-builder-name').value)">Preview</button>
      <button class="btn btn-lime" onclick="alert('Form saved!');closeModal('modal-form-builder')">Save</button>
    </div>
  </div>
</div>

<!-- ===== Form Preview Modal ===== -->
<div class="modal-overlay" id="modal-form-preview">
  <div class="modal" style="max-width:500px;">
    <div class="modal-title">Preview — <span id="form-preview-title">Form</span> <button class="modal-close" onclick="closeModal('modal-form-preview')">✕</button></div>
    <div style="font-size:12px;color:var(--grey);margin-bottom:14px;">How this form appears to students in the app.</div>
    <div id="form-preview-content" style="background:#111;border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:14px;max-height:420px;overflow-y:auto;"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-form-preview')">Close</button>
      <button class="btn btn-lime" onclick="openFormEdit(document.getElementById('form-preview-title').textContent);closeModal('modal-form-preview')">Edit Form</button>
    </div>
  </div>
</div>

<script>
// ── POS / New Purchase ───────────────────────────────────────────────────────
var _posIsGuest = false;
var _posCart = [];
var _posPayMethod = 'card';
var _posSelectedStudent = null;

function togglePosGuest() {
  _posIsGuest = !_posIsGuest;
  document.getElementById('pos-student-row').style.display = _posIsGuest ? 'none' : '';
  document.getElementById('pos-guest-row').style.display = _posIsGuest ? '' : 'none';
  document.getElementById('pos-guest-toggle').textContent = _posIsGuest ? 'Switch to Student' : 'Switch to Guest';
}
function posSearchStudent(q) {
  var res = document.getElementById('pos-student-results');
  if (!q || q.length < 2) { res.style.display = 'none'; return; }
  var matches = STUDENTS.filter(function(s) {
    return s.name.toLowerCase().indexOf(q.toLowerCase()) > -1 || (s.email && s.email.toLowerCase().indexOf(q.toLowerCase()) > -1);
  }).slice(0, 6);
  if (!matches.length) { res.style.display = 'none'; return; }
  res.innerHTML = matches.map(function(s) {
    return '<div style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);" ' +
      'onmouseenter="this.style.background=\'#222\'" onmouseleave="this.style.background=\'transparent\'" ' +
      'onclick="selectPosStudent({id:\'' + s.id + '\',name:\'' + s.name.replace(/'/g,"\\\'") + '\'})">' +
      '<b>' + s.name + '</b>' + (s.email ? '<span style="color:var(--grey);font-size:11px;margin-left:8px;">' + s.email + '</span>' : '') + '</div>';
  }).join('');
  res.style.display = '';
}
function selectPosStudent(obj) {
  _posSelectedStudent = obj;
  document.getElementById('pos-student-search').value = '';
  document.getElementById('pos-student-results').style.display = 'none';
  var sel = document.getElementById('pos-student-selected');
  document.getElementById('pos-student-name').textContent = obj.name;
  sel.style.display = 'flex';
}
function clearPosStudent() {
  _posSelectedStudent = null;
  document.getElementById('pos-student-selected').style.display = 'none';
  document.getElementById('pos-student-search').value = '';
}
function posAddItem() {
  var sel = document.getElementById('pos-product-select');
  var qty = parseInt(document.getElementById('pos-qty').value) || 1;
  if (!sel.value) return;
  var parts = sel.value.split('|');
  _posCart.push({name: parts[0], price: parseFloat(parts[1]), qty: qty});
  posRenderCart(); sel.value = ''; document.getElementById('pos-qty').value = 1;
}
function posRemoveItem(idx) { _posCart.splice(idx,1); posRenderCart(); }
function posRenderCart() {
  var el = document.getElementById('pos-cart-items');
  if (!_posCart.length) { el.innerHTML = '<div style="padding:12px 0;font-size:13px;color:var(--grey);">No items added yet.</div>'; document.getElementById('pos-total').textContent = '$0.00'; return; }
  var total = 0;
  el.innerHTML = _posCart.map(function(item, i) {
    var lineTotal = item.price * item.qty; total += lineTotal;
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">' +
      '<div style="font-size:13px;">' + item.name + (item.qty > 1 ? ' × ' + item.qty : '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:13px;color:var(--lime);">$' + lineTotal.toFixed(2) + '</span>' +
      '<button class="btn btn-ghost btn-xs" onclick="posRemoveItem(' + i + ')">&#10005;</button></div></div>';
  }).join('');
  document.getElementById('pos-total').textContent = '$' + total.toFixed(2);
}
function posSelectPayment(method) {
  _posPayMethod = method;
  ['card','cash','credit','voucher'].forEach(function(m) {
    var btn = document.getElementById('pos-pay-' + m);
    if (btn) { btn.className = m === method ? 'btn btn-lime btn-sm' : 'btn btn-ghost btn-sm'; }
  });
}
function posCheckout() {
  if (!_posCart.length) { alert('Add at least one item first.'); return; }
  var customer = _posIsGuest ? 'Guest' : (_posSelectedStudent ? _posSelectedStudent.name : null);
  if (!customer) { alert('Please select a student or switch to Guest.'); return; }
  var total = _posCart.reduce(function(s,i){ return s + i.price*i.qty; }, 0);
  var methods = {card:'Card (Square)',cash:'Cash',credit:'Account Credit',voucher:'Voucher'};
  alert('Sale complete!\n' + customer + ' — $' + total.toFixed(2) + ' via ' + methods[_posPayMethod] + '.');
  _posCart = []; _posSelectedStudent = null; posRenderCart();
  if (!_posIsGuest) clearPosStudent();
  closeModal('modal-new-purchase');
}

// ── Lockers ──────────────────────────────────────────────────────────────────
var _lockerData = {
  1:{student:'Jess Malone',type:'free',keyGiven:true,keyReturned:false,keyLost:false,notes:''},
  2:{student:'Ruby Kim',type:'free',keyGiven:true,keyReturned:false,keyLost:false,notes:''},
  3:{student:'Nina Torres',type:'free',keyGiven:true,keyReturned:false,keyLost:false,notes:''},
  9:{student:'Kylie Rhodes',type:'paid',keyGiven:true,keyReturned:false,keyLost:false,notes:''},
  10:{student:'Maya Tran',type:'paid',keyGiven:true,keyReturned:false,keyLost:false,notes:''},
  20:{student:'Sophie Lawson',type:'overdue',keyGiven:true,keyReturned:false,keyLost:true,notes:'Key reported lost 10 May'},
  21:{student:'Kylie Rhodes',type:'overdue',keyGiven:true,keyReturned:false,keyLost:false,notes:''},
};
function openLockerDetail(num, student, type) {
  var data = _lockerData[num] || {student:student,type:type,keyGiven:false,keyReturned:false,keyLost:false,notes:''};
  document.getElementById('ld-num').textContent = '#' + String(num).padStart(2,'0');
  document.getElementById('ld-student').textContent = data.student;
  var tb = document.getElementById('ld-type-badge');
  if (type==='free') tb.innerHTML = '<span class="tag tag-amber" style="font-size:11px;">Free — 4+ classes</span>';
  else if (type==='paid') tb.innerHTML = '<span class="tag tag-lime" style="font-size:11px;">Paid</span>';
  else tb.innerHTML = '<span style="background:#3a0000;color:#ff6b6b;border:1px solid #ff3333;border-radius:4px;padding:2px 8px;font-size:11px;">Overdue</span>';
  document.getElementById('ld-fee').textContent = type==='free' ? 'Free (included in 4+ enrolment)' : '$50 / season';
  document.getElementById('ld-key-given').checked = data.keyGiven;
  document.getElementById('ld-key-returned').checked = data.keyReturned;
  document.getElementById('ld-key-lost').checked = data.keyLost;
  document.getElementById('ld-notes').value = data.notes || '';
  openModal('modal-locker-detail');
}
function openAssignLockerFor(name) {
  document.getElementById('locker-assign-student').value = name;
  document.getElementById('locker-assign-type').value = 'free';
  openModal('modal-assign-locker');
}

// ── Forms & Documents ────────────────────────────────────────────────────────
var _formDefs = {
  'parq': {
    name: 'Health, Injury & PAR-Q Questionnaire',
    desc: 'Complete before your first class. Your answers help us keep you safe.',
    fields: [
      {label:'Full Name',type:'text',required:true},
      {label:'Date of Birth',type:'date',required:true},
      {label:'Emergency Contact Name & Phone',type:'text',required:true},
      {label:'Do you have any current injuries or health conditions?',type:'yesno',required:true},
      {label:'Please describe (if yes)',type:'textarea',required:false},
      {label:'Are you pregnant or post-natal (within 6 months)?',type:'yesno',required:true},
    ]
  },
  'photo-consent': {
    name: 'Photo & Media Consent',
    desc: 'Duality Pole Studio may photograph and video classes for promotional use.',
    fields: [
      {label:'I consent to being photographed / filmed during classes',type:'checkbox',required:false},
      {label:'I consent to images being shared on social media',type:'checkbox',required:false},
      {label:'I consent to images being used in marketing materials',type:'checkbox',required:false},
    ]
  },
  'studio-waiver': {
    name: 'Studio Waiver',
    desc: 'Please read carefully and sign. Required each term.',
    fields: [
      {label:'I understand pole dance carries inherent risk of injury',type:'checkbox',required:true},
      {label:'I agree to follow all instructor and studio safety guidelines',type:'checkbox',required:true},
      {label:'I release Duality Pole Studio from liability for injury during class',type:'checkbox',required:true},
      {label:'Full Name (signature)',type:'text',required:true},
      {label:'Date',type:'date',required:true},
    ]
  },
  'season-agreement': {
    name: 'Season Enrolment Agreement',
    desc: 'By enrolling you agree to the following terms for the current season.',
    fields: [
      {label:'I understand the cancellation policy (4hr window, no-show fee applies)',type:'checkbox',required:true},
      {label:'I understand fees are non-refundable unless a transfer is arranged',type:'checkbox',required:true},
      {label:'I agree to the catch-up class policy',type:'checkbox',required:true},
      {label:'Full Name',type:'text',required:true},
    ]
  }
};
function openFormEdit(id) {
  var def = _formDefs[id] || _formDefs['studio-waiver'];
  document.getElementById('form-builder-title').textContent = 'Edit — ' + (def.name || id);
  document.getElementById('form-builder-name').value = def.name || id;
  document.getElementById('form-builder-desc').value = def.desc || '';
  var el = document.getElementById('form-builder-fields');
  el.innerHTML = (def.fields || []).map(function(f) {
    return '<div style="background:#1a1a1a;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px;">' +
      '<span style="font-size:13px;flex:1;">' + f.label + ' <span style="color:var(--grey);font-size:11px;">(' + f.type + (f.required?', required':'') + ')</span></span>' +
      '<button class="btn btn-ghost btn-xs" onclick="alert(\'Edit field (mockup)\')">Edit</button>' +
      '<button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="this.closest(\'div\').remove()">×</button></div>';
  }).join('');
  openModal('modal-form-builder');
}
function openFormPreview(id) {
  var def = _formDefs[id] || _formDefs['studio-waiver'];
  document.getElementById('form-preview-title').textContent = def.name || id;
  var content = document.getElementById('form-preview-content');
  content.innerHTML = '<div style="font-size:13px;color:var(--grey);font-style:italic;margin-bottom:4px;">' + (def.desc||'') + '</div>' +
    (def.fields||[]).map(function(f) {
      var inp = '';
      if (f.type==='text') inp = '<input type="text" disabled placeholder="Student answer…" style="width:100%;background:#222;border:1px solid var(--border);border-radius:6px;color:var(--grey);font-family:inherit;padding:7px 10px;font-size:12px;margin-top:4px;box-sizing:border-box;" />';
      else if (f.type==='date') inp = '<input type="date" disabled style="background:#222;border:1px solid var(--border);border-radius:6px;color:var(--grey);padding:7px 10px;font-size:12px;margin-top:4px;" />';
      else if (f.type==='textarea') inp = '<textarea disabled rows="2" style="width:100%;background:#222;border:1px solid var(--border);border-radius:6px;color:var(--grey);font-family:inherit;padding:7px 10px;font-size:12px;margin-top:4px;box-sizing:border-box;resize:none;"></textarea>';
      else if (f.type==='yesno') inp = '<div style="display:flex;gap:10px;margin-top:6px;"><label style="font-size:12px;"><input type="radio" disabled /> Yes</label><label style="font-size:12px;"><input type="radio" disabled /> No</label></div>';
      else if (f.type==='checkbox') inp = '';
      var lbl = f.type==='checkbox'
        ? '<label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;"><input type="checkbox" disabled style="margin-top:2px;" /> <span style="font-size:13px;">' + f.label + '</span></label>'
        : '<div style="font-size:13px;font-weight:500;">' + f.label + (f.required?' <span style="color:#ff6b6b;">*</span>':'') + '</div>' + inp;
      return '<div>' + lbl + '</div>';
    }).join('');
  openModal('modal-form-preview');
}
</script>
'''

html = html.replace('</body>', NEW_MODALS_AND_JS + '\n</body>', 1)

# Safety check
assert html.count('<script>') >= 2, "Should have at least 2 script tags (original + new)"
assert 'posCheckout' in html, "posCheckout function missing"
assert 'openLockerDetail' in html, "openLockerDetail function missing"
assert 'openFormEdit' in html, "openFormEdit function missing"
assert '</html>' in html, "HTML end tag missing"
print(f"Final file: {len(html.splitlines())} lines, {html.count('<script>')} script tags")

# Validate original JS block
import re as _re
# The original script block
m = _re.search(r'<script>(.*?)</script>', html, _re.DOTALL)
if m:
    js = m.group(1)
    with open('/tmp/_check_rl2.js', 'w') as f:
        f.write(js)
    r = subprocess.run(['node', '--check', '/tmp/_check_rl2.js'], capture_output=True, text=True)
    print('Original JS block: VALID' if r.returncode == 0 else 'Original JS block ERROR: ' + r.stderr[:200])
else:
    print("No original script block found!")

# Validate new JS block
m2 = _re.findall(r'<script>(.*?)</script>', html, _re.DOTALL)
if len(m2) >= 2:
    js2 = m2[-1]
    with open('/tmp/_check_rl2b.js', 'w') as f:
        f.write(js2)
    r2 = subprocess.run(['node', '--check', '/tmp/_check_rl2b.js'], capture_output=True, text=True)
    print('New JS block: VALID' if r2.returncode == 0 else 'New JS block ERROR: ' + r2.stderr[:200])

with open('admin-founder.html', 'w') as f:
    f.write(html)
print("Written admin-founder.html")
