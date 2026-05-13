#!/usr/bin/env python3
"""Add Retention and Referrals subtabs to Analytics screen."""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ── 1. Add subtab buttons ─────────────────────────────────────────────────────
OLD_SUBTABS = '''            <div class="subtab" onclick="switchSubTab(this,\'rep-kisi\')">Kisi Logs</div>
          </div>'''

NEW_SUBTABS = '''            <div class="subtab" onclick="switchSubTab(this,\'rep-kisi\')">Kisi Logs</div>
            <div class="subtab" onclick="switchSubTab(this,\'rep-retention\')">Retention</div>
            <div class="subtab" onclick="switchSubTab(this,\'rep-referrals\')">Referrals</div>
          </div>'''

assert OLD_SUBTABS in html, 'Subtabs not found'
html = html.replace(OLD_SUBTABS, NEW_SUBTABS, 1)
print('Added Retention + Referrals subtab buttons')

# ── 2. Add subscreen content (insert before the right-panel closing) ──────────
OLD_KISI_END = '''          </div>
        </div>
        <!-- Right: report generator panel -->'''

NEW_KISI_END = '''          </div>

          <!-- RETENTION TAB -->
          <div id="rep-retention" class="subscreen">
            <!-- Season-over-season headline stats -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
              <div class="section" style="padding:16px;text-align:center;">
                <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">S3 → S4 Retention</div>
                <div style="font-family:\'Archivo Black\',sans-serif;font-size:28px;color:var(--lime);">74%</div>
                <div style="font-size:11px;color:var(--grey);margin-top:4px;">86 of 116 returned</div>
              </div>
              <div class="section" style="padding:16px;text-align:center;">
                <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">New This Season</div>
                <div style="font-family:\'Archivo Black\',sans-serif;font-size:28px;color:var(--lav);">22</div>
                <div style="font-size:11px;color:var(--grey);margin-top:4px;">First-time students</div>
              </div>
              <div class="section" style="padding:16px;text-align:center;">
                <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Lapsed (didn\'t return)</div>
                <div style="font-family:\'Archivo Black\',sans-serif;font-size:28px;color:var(--amber);">30</div>
                <div style="font-size:11px;color:var(--grey);margin-top:4px;">14 re-engaged via email</div>
              </div>
              <div class="section" style="padding:16px;text-align:center;">
                <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Avg Seasons per Student</div>
                <div style="font-family:\'Archivo Black\',sans-serif;font-size:28px;color:var(--white);">3.2</div>
                <div style="font-size:11px;color:var(--grey);margin-top:4px;">Up from 2.8 last season</div>
              </div>
            </div>
            <!-- Per-instructor retention -->
            <div class="tbl-section" style="margin-bottom:20px;">
              <div style="font-family:\'Archivo Black\',sans-serif;font-size:13px;padding:12px 16px;border-bottom:1px solid var(--border);">Retention by Instructor</div>
              <table>
                <thead><tr><th>Instructor</th><th>S3 Students</th><th>Returned S4</th><th>Retention Rate</th><th>Avg Seasons</th></tr></thead>
                <tbody>
                  <tr><td>Chloe</td><td>42</td><td>36</td><td><span class="tag tag-lime">85.7%</span></td><td>3.8</td></tr>
                  <tr><td>Mimi</td><td>38</td><td>29</td><td><span class="tag tag-lime">76.3%</span></td><td>4.1</td></tr>
                  <tr><td>Maz</td><td>24</td><td>14</td><td><span class="tag tag-amber">58.3%</span></td><td>2.1</td></tr>
                  <tr><td>Viv</td><td>12</td><td>7</td><td><span class="tag tag-amber">58.3%</span></td><td>1.9</td></tr>
                </tbody>
              </table>
            </div>
            <!-- Churn reasons -->
            <div class="section" style="padding:16px;">
              <div style="font-family:\'Archivo Black\',sans-serif;font-size:13px;margin-bottom:14px;">Why Students Lapsed (exit survey — 18 responses)</div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="font-size:12px;width:180px;color:var(--grey);">Schedule didn\'t suit</div>
                  <div style="flex:1;background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;"><div style="width:44%;height:100%;background:var(--amber);border-radius:4px;"></div></div>
                  <div style="font-size:12px;width:30px;text-align:right;">44%</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="font-size:12px;width:180px;color:var(--grey);">Financial / cost</div>
                  <div style="flex:1;background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;"><div style="width:28%;height:100%;background:var(--amber);border-radius:4px;"></div></div>
                  <div style="font-size:12px;width:30px;text-align:right;">28%</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="font-size:12px;width:180px;color:var(--grey);">Injury / health</div>
                  <div style="flex:1;background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;"><div style="width:17%;height:100%;background:var(--lav);border-radius:4px;"></div></div>
                  <div style="font-size:12px;width:30px;text-align:right;">17%</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="font-size:12px;width:180px;color:var(--grey);">Moving / relocation</div>
                  <div style="flex:1;background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;"><div style="width:11%;height:100%;background:#555;border-radius:4px;"></div></div>
                  <div style="font-size:12px;width:30px;text-align:right;">11%</div>
                </div>
              </div>
            </div>
          </div>

          <!-- REFERRALS TAB -->
          <div id="rep-referrals" class="subscreen">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
              <div class="section" style="padding:16px;text-align:center;">
                <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Referrals This Season</div>
                <div style="font-family:\'Archivo Black\',sans-serif;font-size:28px;color:var(--lime);">14</div>
                <div style="font-size:11px;color:var(--grey);margin-top:4px;">New students via referral</div>
              </div>
              <div class="section" style="padding:16px;text-align:center;">
                <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Conversion Rate</div>
                <div style="font-family:\'Archivo Black\',sans-serif;font-size:28px;color:var(--lav);">68%</div>
                <div style="font-size:11px;color:var(--grey);margin-top:4px;">20 codes shared → 14 used</div>
              </div>
              <div class="section" style="padding:16px;text-align:center;">
                <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Revenue from Referrals</div>
                <div style="font-family:\'Archivo Black\',sans-serif;font-size:28px;color:var(--white);">$1,820</div>
                <div style="font-size:11px;color:var(--grey);margin-top:4px;">$130 avg per referral</div>
              </div>
              <div class="section" style="padding:16px;text-align:center;">
                <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Unused Codes</div>
                <div style="font-family:\'Archivo Black\',sans-serif;font-size:28px;color:var(--amber);">89</div>
                <div style="font-size:11px;color:var(--grey);margin-top:4px;">Active but not yet shared</div>
              </div>
            </div>
            <div class="tbl-section">
              <div style="font-family:\'Archivo Black\',sans-serif;font-size:13px;padding:12px 16px;border-bottom:1px solid var(--border);">Referral Activity</div>
              <table>
                <thead><tr><th>Referrer</th><th>Code</th><th>Referred Student</th><th>Joined</th><th>Seasons Completed</th><th>Value</th></tr></thead>
                <tbody>
                  <tr><td>Jess Malone</td><td style="font-family:monospace;color:var(--lime);">JESS20</td><td>Amy Turner</td><td>Season 4</td><td>1</td><td>$180</td></tr>
                  <tr><td>Belle Harrison</td><td style="font-family:monospace;color:var(--lime);">BELLE20</td><td>Chloe Park</td><td>Season 4</td><td>1</td><td>$180</td></tr>
                  <tr><td>Belle Harrison</td><td style="font-family:monospace;color:var(--lime);">BELLE20</td><td>Dana Kim</td><td>Season 4</td><td>1</td><td>$180</td></tr>
                  <tr><td>Ruby Chen</td><td style="font-family:monospace;color:var(--lime);">RUBY20</td><td>Mia Russo</td><td>Season 3</td><td>2</td><td>$360</td></tr>
                  <tr><td>Stella Nguyen</td><td style="font-family:monospace;color:var(--lime);">STELLA20</td><td>Tara Singh</td><td>Season 4</td><td>1</td><td>$180</td></tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
        <!-- Right: report generator panel -->'''

assert OLD_KISI_END in html, 'Kisi end marker not found'
html = html.replace(OLD_KISI_END, NEW_KISI_END, 1)
print('Added Retention + Referrals subscreen content')

assert 'rep-retention' in html
assert 'rep-referrals' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkat{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkat{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:300]}')
print('Written.')
