#!/usr/bin/env python3
"""
Patch: Retail checkout + Lockers overhaul
1. Retail: Add "New Purchase" POS button + modal-new-purchase
2. Lockers: 36 total, free (4+ classes) vs paid ($50/season), key status,
   unassigned alert banner, fix action buttons
"""
import subprocess, re

with open('admin-founder.html', 'r') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. RETAIL — Add "New Purchase" button next to "+ Add Product"
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    '<div style="display:flex;gap:8px;">\n          <button class="btn btn-ghost" onclick="openModal(\'modal-square-sync\')">🔄 Sync with Square</button>\n          <button class="btn btn-lime" onclick="openModal(\'modal-add-product\')">+ Add Product</button>\n        </div>',
    '<div style="display:flex;gap:8px;">\n          <button class="btn btn-ghost" onclick="openModal(\'modal-square-sync\')">🔄 Sync with Square</button>\n          <button class="btn btn-ghost" onclick="openModal(\'modal-add-product\')">+ Add Product</button>\n          <button class="btn btn-lime" onclick="openModal(\'modal-new-purchase\')">🛒 New Purchase</button>\n        </div>'
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. LOCKERS — Full overhaul: 36 lockers, free vs paid, key status, alerts
# ─────────────────────────────────────────────────────────────────────────────

# Free (auto, 4+ classes): lockers 01-08  → amber
# Paid ($50/season): lockers 09-20 → lime
# Available: lockers 21-36 → grey
# Locker 07 (paid) = overdue → red
# Total: 36. Free=8, Paid=11 (one overdue), Available=17

NEW_LOCKERS_SCREEN = '''    <div id="screen-lockers" class="screen">
      <div class="page-header">
        <div><div class="page-title">Lockers</div><div class="page-sub">36 lockers · Season 4</div></div>
        <button class="btn btn-lime" onclick="openModal('modal-assign-locker')">+ Assign Locker</button>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px;">
        <div class="kpi kpi-amber"><div class="kpi-label">Free Lockers</div><div class="kpi-value">8</div><div class="kpi-sub">Auto — 4+ classes/wk</div></div>
        <div class="kpi kpi-lime"><div class="kpi-label">Paid Lockers</div><div class="kpi-value">11</div><div class="kpi-sub">$50/season</div></div>
        <div class="kpi"><div class="kpi-label">Available</div><div class="kpi-value">17</div><div class="kpi-sub">Unassigned</div></div>
        <div class="kpi kpi-red"><div class="kpi-label">Overdue</div><div class="kpi-value">2</div><div class="kpi-sub">Chase needed</div></div>
      </div>

      <!-- Auto-assign alert: students in 4+ classes without a locker -->
      <div style="background:#1a1200;border:1px solid var(--amber);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:13px;color:var(--amber);margin-bottom:10px;">⚡ Auto-Assign Required — students in 4+ classes without a locker</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;background:#0f0c00;border-radius:8px;padding:10px 14px;">
            <div>
              <div style="font-size:13px;font-weight:600;">Belle Currie</div>
              <div style="font-size:11px;color:var(--grey);margin-top:2px;">4 classes this season — entitled to a free locker</div>
            </div>
            <button class="btn btn-amber btn-xs" style="background:var(--amber);color:#000;border:none;padding:5px 14px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;" onclick="openAssignLockerFor('Belle Currie')">Assign Locker</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;background:#0f0c00;border-radius:8px;padding:10px 14px;">
            <div>
              <div style="font-size:13px;font-weight:600;">Avalon Carnall</div>
              <div style="font-size:11px;color:var(--grey);margin-top:2px;">4 classes this season — entitled to a free locker</div>
            </div>
            <button class="btn btn-amber btn-xs" style="background:var(--amber);color:#000;border:none;padding:5px 14px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;" onclick="openAssignLockerFor('Avalon Carnall')">Assign Locker</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;background:#0f0c00;border-radius:8px;padding:10px 14px;">
            <div>
              <div style="font-size:13px;font-weight:600;">Krys Kapsimallis</div>
              <div style="font-size:11px;color:var(--grey);margin-top:2px;">5 classes this season — entitled to a free locker</div>
            </div>
            <button class="btn btn-amber btn-xs" style="background:var(--amber);color:#000;border:none;padding:5px 14px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;" onclick="openAssignLockerFor('Krys Kapsimallis')">Assign Locker</button>
          </div>
        </div>
      </div>

      <!-- Locker map -->
      <div style="font-family:'Archivo Black',sans-serif;font-size:14px;margin-bottom:8px;">Locker Map</div>
      <div style="display:flex;gap:16px;margin-bottom:10px;font-size:12px;">
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#1a1000;border:1px solid var(--amber);display:inline-block;"></span> Free (auto)</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#0f1600;border:1px solid var(--lime);display:inline-block;"></span> Paid</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#2a0000;border:1px solid #ff3333;display:inline-block;"></span> Overdue</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#111;border:1px solid var(--border);display:inline-block;"></span> Available</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:24px;" id="locker-map-grid">
        <!-- Free (auto) lockers 01-08 — amber -->
        <div class="locker-cell" style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(1,'Jess Malone','free')"><div style="font-size:11px;font-weight:700;color:var(--amber)">01</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div class="locker-cell" style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(2,'Ruby Kim','free')"><div style="font-size:11px;font-weight:700;color:var(--amber)">02</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div class="locker-cell" style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(3,'Nina Torres','free')"><div style="font-size:11px;font-weight:700;color:var(--amber)">03</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div class="locker-cell" style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(4,'Dana Park','free')"><div style="font-size:11px;font-weight:700;color:var(--amber)">04</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div class="locker-cell" style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(5,'Amber Cole','free')"><div style="font-size:11px;font-weight:700;color:var(--amber)">05</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div class="locker-cell" style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(6,'Sophie Lawson','free')"><div style="font-size:11px;font-weight:700;color:var(--amber)">06</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div class="locker-cell" style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(7,'Hannah Webb','free')"><div style="font-size:11px;font-weight:700;color:var(--amber)">07</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <div class="locker-cell" style="background:#1a1000;border:1px solid var(--amber);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(8,'Tara Bell','free')"><div style="font-size:11px;font-weight:700;color:var(--amber)">08</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Free</div></div>
        <!-- Paid lockers 09-19 — lime -->
        <div class="locker-cell" style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(9,'Kylie Rhodes','paid')"><div style="font-size:11px;font-weight:700;color:var(--lime)">09</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div class="locker-cell" style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(10,'Maya Tran','paid')"><div style="font-size:11px;font-weight:700;color:var(--lime)">10</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div class="locker-cell" style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(11,'Cleo Nguyen','paid')"><div style="font-size:11px;font-weight:700;color:var(--lime)">11</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div class="locker-cell" style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(12,'Rika Tyebally','paid')"><div style="font-size:11px;font-weight:700;color:var(--lime)">12</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div class="locker-cell" style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(13,'Gee Chan','paid')"><div style="font-size:11px;font-weight:700;color:var(--lime)">13</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div class="locker-cell" style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(14,'Zoe Clarke','paid')"><div style="font-size:11px;font-weight:700;color:var(--lime)">14</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div class="locker-cell" style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(15,'Jordan Lee','paid')"><div style="font-size:11px;font-weight:700;color:var(--lime)">15</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <div class="locker-cell" style="background:#0f1600;border:1px solid var(--lime);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(16,'Lily Chen','paid')"><div style="font-size:11px;font-weight:700;color:var(--lime)">16</div><div style="font-size:9px;margin-top:2px;color:var(--grey)">Paid</div></div>
        <!-- Overdue paid lockers — red -->
        <div class="locker-cell" style="background:#2a0000;border:1px solid #ff3333;border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(17,'Sophie Lawson','overdue')"><div style="font-size:11px;font-weight:700;color:#ff6b6b">17</div><div style="font-size:9px;margin-top:2px;color:#ff6b6b">Overdue</div></div>
        <div class="locker-cell" style="background:#2a0000;border:1px solid #ff3333;border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openLockerDetail(18,'Mia Park','overdue')"><div style="font-size:11px;font-weight:700;color:#ff6b6b">18</div><div style="font-size:9px;margin-top:2px;color:#ff6b6b">Overdue</div></div>
        <!-- Unassigned 19-36 — grey -->
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">19</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">20</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">21</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">22</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">23</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">24</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">25</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">26</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">27</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">28</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">29</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">30</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">31</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">32</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">33</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">34</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">35</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
        <div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;" onclick="openModal('modal-assign-locker')"><div style="font-size:11px;font-weight:700;color:var(--grey)">36</div><div style="font-size:9px;margin-top:2px;color:var(--border)">Free</div></div>
      </div>

      <!-- Assignments table -->
      <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;margin-bottom:12px;">Assignments</div>
      <div class="tbl-section">
        <table>
          <thead><tr><th>Locker</th><th>Student</th><th>Type</th><th>Fee</th><th>Paid Until</th><th>Key Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr>
              <td><b>#01</b></td><td>Jess Malone</td>
              <td><span class="tag tag-amber" style="font-size:10px;">Free</span></td>
              <td style="color:var(--grey);">—</td><td style="color:var(--grey);">Season 4</td>
              <td>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label>
              </td>
              <td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(1,\'Jess Malone\',\'free\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign Jess Malone from locker #01?\'))alert(\'Unassigned\')">Unassign</button></td>
            </tr>
            <tr>
              <td><b>#02</b></td><td>Ruby Kim</td>
              <td><span class="tag tag-amber" style="font-size:10px;">Free</span></td>
              <td style="color:var(--grey);">—</td><td style="color:var(--grey);">Season 4</td>
              <td><label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(2,\'Ruby Kim\',\'free\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td>
            </tr>
            <tr>
              <td><b>#03</b></td><td>Nina Torres</td>
              <td><span class="tag tag-amber" style="font-size:10px;">Free</span></td>
              <td style="color:var(--grey);">—</td><td style="color:var(--grey);">Season 4</td>
              <td>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;margin-top:2px;"><input type="checkbox" style="accent-color:var(--lime);" /> Key returned</label>
              </td>
              <td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(3,\'Nina Torres\',\'free\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td>
            </tr>
            <tr>
              <td><b>#09</b></td><td>Kylie Rhodes</td>
              <td><span class="tag tag-lime" style="font-size:10px;">Paid</span></td>
              <td style="color:var(--lime);">$50</td><td style="color:var(--grey);">Season 4</td>
              <td><label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(9,\'Kylie Rhodes\',\'paid\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td>
            </tr>
            <tr>
              <td><b>#10</b></td><td>Maya Tran</td>
              <td><span class="tag tag-lime" style="font-size:10px;">Paid</span></td>
              <td style="color:var(--lime);">$50</td><td style="color:var(--grey);">Season 4</td>
              <td><label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openLockerDetail(10,\'Maya Tran\',\'paid\')">Edit</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td>
            </tr>
            <tr>
              <td><b>#17</b></td><td>Sophie Lawson</td>
              <td><span class="tag tag-lime" style="font-size:10px;">Paid</span></td>
              <td style="color:#ff6b6b;">$50 OVERDUE</td><td style="color:#ff6b6b;">Overdue</td>
              <td>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;margin-top:2px;"><input type="checkbox" style="accent-color:#ff6b6b;" /> Key lost</label>
              </td>
              <td><button class="btn btn-ghost btn-xs" onclick="openChaseModal(\'Sophie Lawson\',\'Locker #17 fee\',\'$50\',1)">Chase</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td>
            </tr>
            <tr>
              <td><b>#18</b></td><td>Mia Park</td>
              <td><span class="tag tag-lime" style="font-size:10px;">Paid</span></td>
              <td style="color:#ff6b6b;">$50 OVERDUE</td><td style="color:#ff6b6b;">Overdue</td>
              <td><label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--lime);" /> Key given</label></td>
              <td><button class="btn btn-ghost btn-xs" onclick="openChaseModal(\'Mia Park\',\'Locker #18 fee\',\'$50\',1)">Chase</button> <button class="btn btn-ghost btn-xs" style="color:#e05555;" onclick="if(confirm(\'Unassign?\'))alert(\'Unassigned\')">Unassign</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>'''

# Replace old screen-lockers with new one
old_start = html.find('    <div id="screen-lockers" class="screen">')
old_end = html.find('\n    <!-- ===== ', old_start)
if old_end == -1:
    old_end = html.find('\n  </div><!-- end .content -->', old_start)
html = html[:old_start] + NEW_LOCKERS_SCREEN + '\n' + html[old_end:]

# ─────────────────────────────────────────────────────────────────────────────
# 3. MODALS — New Purchase, Assign Locker (updated), Locker Detail
# ─────────────────────────────────────────────────────────────────────────────

NEW_MODALS = '''
<!-- New Purchase / POS Modal -->
<div class="modal-overlay" id="modal-new-purchase">
  <div class="modal" style="max-width:520px;">
    <div class="modal-title">New Purchase <button class="modal-close" onclick="closeModal('modal-new-purchase')">✕</button></div>

    <!-- Customer -->
    <div class="field">
      <label>Customer</label>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button id="pos-customer-toggle" class="btn btn-ghost btn-sm" onclick="togglePosGuest()" style="font-size:12px;">Switch to Guest</button>
      </div>
      <div id="pos-student-row">
        <input type="text" id="pos-student-search" placeholder="Search student by name or email…" oninput="posSearchStudent(this.value)" autocomplete="off" />
        <div id="pos-student-results" style="display:none;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;margin-top:4px;max-height:160px;overflow-y:auto;"></div>
        <div id="pos-student-selected" style="display:none;background:#111;border:1px solid var(--lime);border-radius:8px;padding:8px 12px;margin-top:4px;display:none;align-items:center;justify-content:space-between;">
          <span id="pos-student-name" style="font-size:13px;font-weight:600;">—</span>
          <button class="btn btn-ghost btn-xs" onclick="clearPosStudent()">✕</button>
        </div>
      </div>
      <div id="pos-guest-row" style="display:none;">
        <input type="text" placeholder="Guest name (optional)" style="background:#1a1a1a;border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--white);font-family:inherit;width:100%;font-size:13px;" />
      </div>
    </div>

    <!-- Cart -->
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:10px;">Items</div>
    <div id="pos-cart" style="background:#111;border-radius:8px;padding:0 14px;margin-bottom:12px;">
      <div id="pos-cart-items">
        <!-- populated dynamically -->
        <div style="padding:12px 0;font-size:13px;color:var(--grey);">No items added yet.</div>
      </div>
    </div>

    <!-- Add item row -->
    <div style="display:flex;gap:8px;margin-bottom:18px;">
      <select id="pos-product-select" class="select-input" style="flex:1;" onchange="posUpdatePrice()">
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

    <!-- Total -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1a1a1a;border-radius:8px;margin-bottom:18px;">
      <span style="font-size:13px;color:var(--grey);">Total</span>
      <span id="pos-total" style="font-family:'Archivo Black',sans-serif;font-size:22px;color:var(--lime);">$0.00</span>
    </div>

    <!-- Payment method -->
    <div class="field">
      <label>Payment Method</label>
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

<!-- Assign Locker Modal -->
<div class="modal-overlay" id="modal-assign-locker">
  <div class="modal" style="max-width:440px;">
    <div class="modal-title">Assign Locker <button class="modal-close" onclick="closeModal('modal-assign-locker')">✕</button></div>
    <div class="field">
      <label>Student</label>
      <input type="text" id="locker-assign-student" placeholder="Name or email…" />
    </div>
    <div class="field-row">
      <div class="field">
        <label>Locker Number</label>
        <select class="select-input" id="locker-assign-num">
          <option>19</option><option>20</option><option>21</option><option>22</option>
          <option>23</option><option>24</option><option>25</option><option>26</option>
          <option>27</option><option>28</option><option>29</option><option>30</option>
          <option>31</option><option>32</option><option>33</option><option>34</option>
          <option>35</option><option>36</option>
        </select>
      </div>
      <div class="field">
        <label>Type</label>
        <select class="select-input" id="locker-assign-type">
          <option value="free">Free (4+ classes)</option>
          <option value="paid">Paid ($50/season)</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>Key Status</label>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;"><input type="checkbox" id="locker-key-given" style="accent-color:var(--lime);" /> Key given to student</label>
      </div>
    </div>
    <div class="field"><label>Notes</label><textarea placeholder="e.g. Combo: 1234" rows="2"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-assign-locker')">Cancel</button>
      <button class="btn btn-lime" onclick="alert('Locker assigned!');closeModal('modal-assign-locker')">Assign</button>
    </div>
  </div>
</div>

<!-- Locker Detail / Edit Modal -->
<div class="modal-overlay" id="modal-locker-detail">
  <div class="modal" style="max-width:460px;">
    <div class="modal-title">Locker <span id="ld-num">#01</span> — <span id="ld-student">Jess Malone</span> <button class="modal-close" onclick="closeModal('modal-locker-detail')">✕</button></div>

    <div style="background:#1a1a1a;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;">
        <span style="color:var(--grey);">Type</span><span id="ld-type-badge"></span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;">
        <span style="color:var(--grey);">Season</span><span>Season 4 (11 May – 5 Jul 2026)</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;">
        <span style="color:var(--grey);">Fee</span><span id="ld-fee">—</span>
      </div>
    </div>

    <!-- Key status -->
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:10px;">Key Status</div>
    <div style="background:#111;border-radius:8px;padding:14px 16px;margin-bottom:18px;display:flex;flex-direction:column;gap:10px;">
      <label style="display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer;">
        <input type="checkbox" id="ld-key-given" style="accent-color:var(--lime);width:16px;height:16px;" />
        <span>Key given to student</span>
      </label>
      <label style="display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer;">
        <input type="checkbox" id="ld-key-returned" style="accent-color:var(--lime);width:16px;height:16px;" />
        <span>Key returned</span>
      </label>
      <label style="display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer;">
        <input type="checkbox" id="ld-key-lost" style="accent-color:#ff6b6b;width:16px;height:16px;" onchange="if(this.checked){document.getElementById('ld-key-given').checked=false;document.getElementById('ld-key-returned').checked=false;}" />
        <span style="color:#ff9999;">Key lost — replacement fee applies ($15)</span>
      </label>
    </div>

    <div class="field"><label>Notes / Combo</label><textarea id="ld-notes" placeholder="e.g. Combo: 1234, special access etc." rows="2"></textarea></div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-locker-detail')">Cancel</button>
      <button class="btn btn-ghost" style="color:#e05555;" onclick="if(confirm('Unassign this locker?')){alert('Locker unassigned');closeModal('modal-locker-detail')}">Unassign</button>
      <button class="btn btn-lime" onclick="alert('Changes saved');closeModal('modal-locker-detail')">Save</button>
    </div>
  </div>
</div>

'''

html = html.replace('</body>', NEW_MODALS + '</body>', 1)

# ─────────────────────────────────────────────────────────────────────────────
# 4. JS — POS + Locker functions
# ─────────────────────────────────────────────────────────────────────────────
LOCKER_RETAIL_JS = '''
// ── POS / New Purchase ──────────────────────────────────────────────────────
var _posIsGuest = false;
var _posCart = [];
var _posPayMethod = 'card';
var _posSelectedStudent = null;

function togglePosGuest() {
  _posIsGuest = !_posIsGuest;
  document.getElementById('pos-student-row').style.display = _posIsGuest ? 'none' : '';
  document.getElementById('pos-guest-row').style.display = _posIsGuest ? '' : 'none';
  document.getElementById('pos-customer-toggle').textContent = _posIsGuest ? 'Switch to Student' : 'Switch to Guest';
}

function posSearchStudent(q) {
  var res = document.getElementById('pos-student-results');
  if (!q || q.length < 2) { res.style.display = 'none'; return; }
  var matches = STUDENTS.filter(function(s) {
    return s.name.toLowerCase().indexOf(q.toLowerCase()) > -1 || (s.email && s.email.toLowerCase().indexOf(q.toLowerCase()) > -1);
  }).slice(0, 6);
  if (matches.length === 0) { res.style.display = 'none'; return; }
  res.innerHTML = matches.map(function(s) {
    return '<div style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);" ' +
      'onmouseenter="this.style.background=\'#222\'" onmouseleave="this.style.background=\'transparent\'" ' +
      'onclick="selectPosStudent(' + JSON.stringify({id:s.id,name:s.name}) + ')">' +
      '<span style="font-weight:600;">' + s.name + '</span>' +
      (s.email ? '<span style="color:var(--grey);font-size:11px;margin-left:8px;">' + s.email + '</span>' : '') +
      '</div>';
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
  var name = parts[0], price = parseFloat(parts[1]);
  _posCart.push({name: name, price: price, qty: qty});
  posRenderCart();
  sel.value = '';
  document.getElementById('pos-qty').value = 1;
}

function posRemoveItem(idx) {
  _posCart.splice(idx, 1);
  posRenderCart();
}

function posRenderCart() {
  var el = document.getElementById('pos-cart-items');
  if (_posCart.length === 0) {
    el.innerHTML = '<div style="padding:12px 0;font-size:13px;color:var(--grey);">No items added yet.</div>';
    document.getElementById('pos-total').textContent = '$0.00';
    return;
  }
  var total = 0;
  el.innerHTML = _posCart.map(function(item, i) {
    var lineTotal = item.price * item.qty;
    total += lineTotal;
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">' +
      '<div style="font-size:13px;">' + item.name + (item.qty > 1 ? ' × ' + item.qty : '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<span style="font-size:13px;color:var(--lime);">$' + lineTotal.toFixed(2) + '</span>' +
      '<button class="btn btn-ghost btn-xs" onclick="posRemoveItem(' + i + ')">✕</button>' +
      '</div></div>';
  }).join('');
  document.getElementById('pos-total').textContent = '$' + total.toFixed(2);
}

function posSelectPayment(method) {
  _posPayMethod = method;
  ['card','cash','credit','voucher'].forEach(function(m) {
    var btn = document.getElementById('pos-pay-' + m);
    if (btn) btn.className = m === method ? 'btn btn-lime btn-sm' : 'btn btn-ghost btn-sm';
  });
}

function posCheckout() {
  if (_posCart.length === 0) { alert('Add at least one item first.'); return; }
  var customer = _posIsGuest ? 'Guest' : (_posSelectedStudent ? _posSelectedStudent.name : null);
  if (!customer) { alert('Please select a student or switch to Guest.'); return; }
  var total = _posCart.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var methods = {card:'Card (Square)',cash:'Cash',credit:'Account Credit',voucher:'Voucher'};
  alert('Sale complete! ' + customer + ' — $' + total.toFixed(2) + ' via ' + methods[_posPayMethod] + '.');
  _posCart = [];
  _posSelectedStudent = null;
  posRenderCart();
  closeModal('modal-new-purchase');
}

// ── Lockers ─────────────────────────────────────────────────────────────────
var _lockerData = {
  1: {student:'Jess Malone', type:'free', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  2: {student:'Ruby Kim', type:'free', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  3: {student:'Nina Torres', type:'free', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  4: {student:'Dana Park', type:'free', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  5: {student:'Amber Cole', type:'free', keyGiven:false, keyReturned:false, keyLost:false, notes:''},
  6: {student:'Sophie Lawson', type:'free', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  7: {student:'Hannah Webb', type:'free', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  8: {student:'Tara Bell', type:'free', keyGiven:false, keyReturned:false, keyLost:false, notes:''},
  9: {student:'Kylie Rhodes', type:'paid', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  10: {student:'Maya Tran', type:'paid', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  11: {student:'Cleo Nguyen', type:'paid', keyGiven:true, keyReturned:false, keyLost:false, notes:'Combo: 4419'},
  12: {student:'Rika Tyebally', type:'paid', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  13: {student:'Gee Chan', type:'paid', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
  17: {student:'Sophie Lawson', type:'overdue', keyGiven:true, keyReturned:false, keyLost:true, notes:'Key reported lost 10 May'},
  18: {student:'Mia Park', type:'overdue', keyGiven:true, keyReturned:false, keyLost:false, notes:''},
};

function openLockerDetail(num, student, type) {
  var data = _lockerData[num] || {student: student, type: type, keyGiven: false, keyReturned: false, keyLost: false, notes: ''};
  document.getElementById('ld-num').textContent = '#' + String(num).padStart(2,'0');
  document.getElementById('ld-student').textContent = data.student;
  var typeBadge = document.getElementById('ld-type-badge');
  if (type === 'free') typeBadge.innerHTML = '<span class="tag tag-amber" style="font-size:11px;">Free — 4+ classes</span>';
  else if (type === 'paid') typeBadge.innerHTML = '<span class="tag tag-lime" style="font-size:11px;">Paid</span>';
  else typeBadge.innerHTML = '<span style="background:#3a0000;color:#ff6b6b;border:1px solid #ff3333;border-radius:4px;padding:2px 8px;font-size:11px;">Overdue</span>';
  document.getElementById('ld-fee').textContent = type === 'free' ? 'Free (included)' : '$50 / season';
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
'''

html = html.replace(
    'function filterSeasonView()',
    LOCKER_RETAIL_JS + '\nfunction filterSeasonView()'
)

# ─────────────────────────────────────────────────────────────────────────────
# Validate JS
# ─────────────────────────────────────────────────────────────────────────────
with open('admin-founder.html', 'w') as f:
    f.write(html)

script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
js = script_match.group(1) if script_match else ''
with open('/tmp/_check_rl.js', 'w') as f:
    f.write(js)
r = subprocess.run(['node', '--check', '/tmp/_check_rl.js'], capture_output=True, text=True)
print('JS VALID' if r.returncode == 0 else 'JS ERROR:\n' + r.stderr[:600])

checks = [
    ('modal-new-purchase', 'New Purchase modal'),
    ('posCheckout', 'posCheckout function'),
    ('posSearchStudent', 'student search in POS'),
    ('pos-pay-card', 'payment method buttons'),
    ('36 lockers', '36 lockers subtitle'),
    ('Auto-Assign Required', 'auto-assign alert banner'),
    ('Belle Currie', 'Belle Currie in alerts'),
    ('Free Lockers', 'Free Lockers KPI'),
    ('Paid Lockers', 'Paid Lockers KPI'),
    ('$50', '$50/season pricing'),
    ('modal-locker-detail', 'locker detail modal'),
    ('ld-key-given', 'key given checkbox'),
    ('ld-key-returned', 'key returned checkbox'),
    ('ld-key-lost', 'key lost checkbox'),
    ('openLockerDetail', 'openLockerDetail function'),
    ('openAssignLockerFor', 'openAssignLockerFor function'),
]
for needle, label in checks:
    print(f"  {'✓' if needle in html else '✗ MISSING'}: {label}")
