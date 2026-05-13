#!/usr/bin/env python3
"""
Rebuild Recommendations screen as a full studio-intelligence panel:
- Urgent action cards (no-shows, cancellations, attendance risk)
- Retention / engagement drop analysis (S3→S4)
- Class & instructor health
- Revenue & billing signals
- Growth & scheduling (existing demand table, kept)
- "Run Recommendations" button with scanning animation
- Dashboard notification for "Recommendations ready"
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Remove data-stub from recommendations nav item
# ─────────────────────────────────────────────────────────────────────────────
html = html.replace(
    'onclick="showScreen(\'recommendations\')" data-stub="1"',
    'onclick="showScreen(\'recommendations\')"',
    1
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add "Recommendations ready" notification to dashboard
# ─────────────────────────────────────────────────────────────────────────────
OLD_NOTIF_BADGE = '<span id="notif-badge" style="background:var(--lime);color:#000;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;font-size:11px;font-weight:700;">4</span>'
NEW_NOTIF_BADGE = '<span id="notif-badge" style="background:var(--lime);color:#000;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;font-size:11px;font-weight:700;">5</span>'
html = html.replace(OLD_NOTIF_BADGE, NEW_NOTIF_BADGE, 1)

OLD_NOTIF_LAST = '''          <div class="notif-action-row" id="ni-4" data-label="Exemption request — Dana Park ($75 workshop)"'''
NEW_NOTIF_LAST = '''          <div class="notif-action-row" id="ni-rec" data-label="Recommendations ready — 8 insights to review" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <input type="checkbox" style="accent-color:var(--lime);width:16px;height:16px;flex-shrink:0;margin-top:2px;" onchange="markNotifDone(this,'rec')" />
            <span style="font-size:18px;line-height:1;">💡</span>
            <div style="flex:1;">
              <div style="font-size:13px;color:var(--white);">Weekly recommendations ready — 8 insights</div>
              <div style="font-size:12px;color:var(--grey);margin-top:2px;">3 urgent action items · 2 student engagement drops · 3 class/instructor flags</div>
              <button class="btn btn-ghost btn-xs" style="margin-top:6px;" onclick="showScreen(\'recommendations\')">Review →</button>
            </div>
            <span style="font-size:11px;color:var(--lime);white-space:nowrap;margin-top:1px;">New</span>
          </div>
          <div class="notif-action-row" id="ni-4" data-label="Exemption request — Dana Park ($75 workshop)"'''
html = html.replace(OLD_NOTIF_LAST, NEW_NOTIF_LAST, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Replace screen-recommendations with new version
# ─────────────────────────────────────────────────────────────────────────────
start_marker = '<div id="screen-recommendations" class="screen">'
start = html.find(start_marker)
depth = 0
i = start
while i < len(html):
    if html[i:i+4] == '<div':
        depth += 1; i += 4
    elif html[i:i+6] == '</div>':
        depth -= 1
        if depth == 0:
            end = i + 6; break
        i += 6
    else:
        i += 1

NEW_SCREEN = '''<div id="screen-recommendations" class="screen">
      <div class="page-header">
        <div>
          <div class="page-title">Recommendations</div>
          <div id="rec-status-line" style="font-size:13px;color:var(--grey);margin-top:4px;">Last run: <b style="color:var(--white);">Today 9:15am</b> · Next scheduled: Monday 9am · <span style="color:var(--lime);">8 active insights</span></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div id="rec-scan-indicator" style="display:none;align-items:center;gap:8px;font-size:13px;color:var(--grey);">
            <div style="width:14px;height:14px;border:2px solid var(--lime);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            Scanning studio data…
          </div>
          <button class="btn btn-lime" onclick="runRecsAnimation()">▶ Run Recommendations</button>
        </div>
      </div>

      <!-- ── Urgent: Action needed now ─────────────────────────────────── -->
      <div id="rec-results">

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:15px;">🚨 Action Needed</div>
        <span class="tag tag-red" style="font-size:10px;">3 items</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-bottom:32px;">

        <div style="background:#1a1a1a;border:1px solid #ff6b6b;border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Belle Currie</div>
            <span class="tag tag-red" style="font-size:10px;">No-shows ×3</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">3 consecutive no-shows — Level 2 (29 Apr, 6 May, 13 May). No contact made. Still enrolled and balance outstanding.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Reach out personally — check if she\'s OK and still wants her spot. If no response in 48h, consider releasing to waitlist.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Draft message sent to Belle Currie\')">Send message</button>
            <button class="btn btn-ghost btn-xs" onclick="openStudentById(\'bellecurrie\')">View profile</button>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid #ff6b6b;border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Stella Mitchell</div>
            <span class="tag tag-red" style="font-size:10px;">4-week cancels</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">Cancelled Spin Virgin (Thu 6pm) 4 weeks in a row — 22 Apr, 29 Apr, 6 May, 13 May. Always cancelled same day.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Check if Thursday 6pm no longer works for her. Could she move to the Friday session? Free up the spot if she can\'t commit.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Draft message sent to Stella Mitchell\')">Send message</button>
            <button class="btn btn-ghost btn-xs" onclick="alert(\'Student: Stella Mitchell\')">View profile</button>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid var(--amber);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Jade Thompson</div>
            <span class="tag tag-amber" style="font-size:10px;">Zero attendance</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">Enrolled in Level 3 + Invert Tech but hasn\'t attended any class in 3 weeks. Still on season, no injury on file.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Welfare check — is everything OK? If disengaged, a personal message now is easier than a churn conversation later.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Draft welfare check sent to Jade Thompson\')">Send message</button>
            <button class="btn btn-ghost btn-xs" onclick="alert(\'Student: Jade Thompson\')">View profile</button>
          </div>
        </div>

      </div>

      <!-- ── Student engagement & retention ─────────────────────────────── -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:15px;">📉 Retention & Engagement Drops</div>
        <span class="tag tag-amber" style="font-size:10px;">2 groups</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-bottom:32px;">

        <div style="background:#1a1a1a;border:1px solid var(--amber);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">High-value students scaling back</div>
            <span class="tag tag-amber" style="font-size:10px;">5 students</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:8px;line-height:1.5;">5 students who took 5+ classes in Season 3 are now enrolled in only 1–2 this season.</div>
          <div style="font-size:12px;margin-bottom:4px;color:var(--white);">Emma Harris, Sophie Lawson, Dana Park, Kylie Rhodes, Rachel Kim</div>
          <div style="font-size:11px;color:var(--grey);margin-bottom:12px;">Combined revenue drop: ~$1,200 vs last season.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Send a personalised "we miss you in more classes" email — offer a multi-class incentive or just check what changed.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="showAssistantQuery(\'Show Emma Harris, Sophie Lawson, Dana Park, Kylie Rhodes, Rachel Kim email addresses\')">Pull email list</button>
            <button class="btn btn-ghost btn-xs" onclick="alert(\'Draft re-engagement email created\')">Draft email</button>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid var(--amber);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Season 3 students who didn\'t return</div>
            <span class="tag tag-amber" style="font-size:10px;">8 students</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:8px;line-height:1.5;">8 students were active all of Season 3 but didn\'t enrol in Season 4. No cancellation on file.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Early churn — these are your most likely re-activations if reached out to soon. A quick "we\'d love to have you back" goes a long way.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="showAssistantQuery(\'Which students were enrolled last season but not this season?\')">Pull list →</button>
            <button class="btn btn-ghost btn-xs" onclick="alert(\'Draft win-back email created\')">Draft email</button>
          </div>
        </div>

      </div>

      <!-- ── Class & instructor health ───────────────────────────────────── -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:15px;">🏫 Class & Instructor Health</div>
        <span class="tag tag-lav" style="font-size:10px;">4 flags</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-bottom:32px;">

        <div style="background:#1a1a1a;border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">6 Virgin — poor attendance</div>
            <span class="tag" style="font-size:10px;background:#222;color:var(--grey);">At risk</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">Only 3 enrolled. Average attendance this season: 40%. 2 of 3 students have each missed 3+ weeks. Current timeslot: Wednesday 7pm.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Email the 3 students — ask if Wednesday 7pm works or if another slot would suit better. If no traction, consider folding into Dance Virgin or cancelling.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="showAssistantQuery(\'list all 6 Virgin students\')">Email students</button>
            <button class="btn btn-ghost btn-xs" onclick="showScreen(\'timetable\')">Adjust schedule</button>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Dance — low enrolment, strong casuals</div>
            <span class="tag tag-lime" style="font-size:10px;">Healthy</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">Only 3 enrolled but 6–8 casual drop-ins every week. Revenue is solid — don\'t let the enrolment number mislead.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> No action needed. Consider offering casuals a season enrolment incentive — converting even 2 would lock in $300+.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-xs" onclick="alert(\'Draft casual→enrolment offer created\')">Draft offer</button>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid var(--amber);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Maz — Level 3 retention dip</div>
            <span class="tag tag-amber" style="font-size:10px;">Instructor flag</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">2 students from Maz\'s Tuesday Level 3 didn\'t re-enrol this season. 4 no-shows in her class over the past 4 weeks (vs 1 in Chloe\'s equivalent).</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Worth a gentle check-in with Maz — not a performance issue necessarily, but worth understanding. Could be scheduling, vibe, or just life stuff.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Note added to Maz staff file\')">Add staff note</button>
            <button class="btn btn-ghost btn-xs" onclick="showAssistantQuery(\'List students in Maz Level 3\')">View class</button>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Mimi — teaching load 60%</div>
            <span class="tag" style="font-size:10px;background:#1a1a1a;border:1px solid var(--grey);color:var(--grey);">FYI</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">Mimi is currently running 16 of 27 class sessions (59%). Chloe covers 6, Maz 5. The imbalance is a burnout risk heading into a busy season.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Consider shifting the new Level 5 or Advanced Floor session to Chloe. Redistributing 2 sessions would bring Mimi to ~50%.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-xs" onclick="showScreen(\'staff\')">View staff schedule</button>
          </div>
        </div>

      </div>

      <!-- ── Revenue & billing signals ──────────────────────────────────── -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:15px;">💳 Revenue & Billing Signals</div>
        <span class="tag tag-amber" style="font-size:10px;">2 flags</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-bottom:32px;">

        <div style="background:#1a1a1a;border:1px solid var(--amber);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Overdue plans — no recent chase</div>
            <span class="tag tag-amber" style="font-size:10px;">2 plans</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">Belle Currie ($120 overdue) and Jessica Neary ($75 overdue) both have payment plans that have been overdue for 14+ days with no chase action recorded.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Send a reminder now — payment plans only work if they\'re followed up consistently.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="openChaseModal(\'Belle Currie\',\'Season 4 payment plan — overdue\',\'$120\',1)">Chase Belle</button>
            <button class="btn btn-ghost btn-xs" onclick="openChaseModal(\'Jessica Neary\',\'Season 4 payment plan — overdue\',\'$75\',1)">Chase Jess N.</button>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Casual-to-season upsell window</div>
            <span class="tag tag-lime" style="font-size:10px;">Opportunity</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">14 students have attended 3+ casual classes this season but haven\'t enrolled. Based on past seasons, ~30% convert if contacted before week 6.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Week 5 now — this is the ideal conversion window. A targeted "lock in your spot" message could add $1,400+ this season.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="showAssistantQuery(\'List students who attended casual classes but are not enrolled this season\')">Pull casual list</button>
          </div>
        </div>

      </div>

      <!-- ── Growth & scheduling ─────────────────────────────────────────── -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:15px;">📅 Demand & Scheduling</div>
        <span class="tag" style="font-size:10px;background:#222;color:var(--grey);">Season 4</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:28px;">
        <div style="background:#1a1a1a;border:1px solid #ff6b6b;border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;">Level 2</div>
            <span class="tag tag-red">24 enrolled</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;">2 sessions × ~12 cap = 24 spots. Zero buffer — any late enrolments go to waitlist.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Add a <b>Wednesday or Friday 6:30pm</b> Level 2 session. Estimated demand: 8–10 students.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Opening timetable to add Level 2 session\')">Add Session</button>
            <button class="btn btn-ghost btn-xs" onclick="showAssistantQuery(\'list all Level 2 students\')">View Students</button>
          </div>
        </div>
        <div style="background:#1a1a1a;border:1px solid #ff6b6b;border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;">Level 5</div>
            <span class="tag tag-red">23 enrolled</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;">1 session × ~12 cap = significant overflow. Level 5 is your second-biggest class.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Add a <b>Tuesday or Saturday 10am</b> Level 5. Mimi already teaches Saturday morning.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Opening timetable to add Level 5 session\')">Add Session</button>
            <button class="btn btn-ghost btn-xs" onclick="showAssistantQuery(\'list all Level 5 students\')">View Students</button>
          </div>
        </div>
        <div style="background:#1a1a1a;border:1px solid #ff6b6b;border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;">Level 3</div>
            <span class="tag tag-red">23 enrolled</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;">1 main + 1 overflow session. Tight for 23 students.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Add a <b>Thursday 7:30pm</b> Level 3. Frees Maz\'s session and absorbs overflow.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="alert(\'Opening timetable to add Level 3 session\')">Add Session</button>
            <button class="btn btn-ghost btn-xs" onclick="showAssistantQuery(\'list all Level 3 students\')">View Students</button>
          </div>
        </div>
        <div style="background:#1a1a1a;border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">Level 1 — low intake</div>
            <span class="tag tag-amber">7 enrolled</span>
          </div>
          <div style="font-size:12px;color:var(--grey);margin-bottom:10px;line-height:1.5;">Your pipeline for all other levels. Low intake now = lower numbers across the board in 2–3 seasons.</div>
          <div style="font-size:12px;margin-bottom:12px;"><span style="color:var(--lime);">✦</span> Run a beginner campaign before season end — target the casual list and social media.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-lime btn-xs" onclick="showScreen(\'marketing\')" data-stub="1">Launch Campaign</button>
          </div>
        </div>
      </div>

      <!-- Full demand table -->
      <div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;margin-bottom:12px;color:var(--grey);">Full class demand — Season 4</div>
      <div class="tbl-section" style="margin-bottom:28px;">
        <table>
          <thead><tr><th>Class</th><th>Students</th><th>Demand</th><th>Sessions</th><th>Recommendation</th></tr></thead>
          <tbody id="rec-demand-tbody"></tbody>
        </table>
      </div>

      </div><!-- end #rec-results -->
    </div>'''

html = html[:start] + NEW_SCREEN + html[end:]
print('Replaced screen-recommendations')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add runRecsAnimation JS function (new script block before </body>)
# ─────────────────────────────────────────────────────────────────────────────
REC_JS = '''<script>
function runRecsAnimation() {
  var btn = event.target;
  var scanEl = document.getElementById('rec-scan-indicator');
  var resultsEl = document.getElementById('rec-results');
  var statusEl = document.getElementById('rec-status-line');
  btn.disabled = true;
  btn.textContent = 'Running…';
  resultsEl.style.opacity = '0.3';
  if (scanEl) { scanEl.style.display = 'flex'; }
  setTimeout(function() {
    resultsEl.style.opacity = '1';
    if (scanEl) scanEl.style.display = 'none';
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    var timeStr = h + ':' + (m < 10 ? '0' : '') + m + ampm;
    if (statusEl) statusEl.innerHTML = 'Last run: <b style="color:var(--white);">' + timeStr + '</b> · Next scheduled: Monday 9am · <span style="color:var(--lime);">8 active insights</span>';
    btn.disabled = false;
    btn.textContent = '▶ Run Recommendations';
    btn.style.background = 'var(--lime)';
  }, 2200);
}
</script>
'''

ADD_CSS = '''<style>
@keyframes spin { to { transform: rotate(360deg); } }
</style>
'''

html = html.replace('</body>', ADD_CSS + REC_JS + '</body>', 1)
print('Added runRecsAnimation JS + spin CSS')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Safety checks + JS validation
# ─────────────────────────────────────────────────────────────────────────────
assert 'screen-recommendations' in html
assert 'runRecsAnimation' in html
assert 'Belle Currie' in html
assert 'Stella Mitchell' in html
assert 'rec-demand-tbody' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkr2_{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkr2_{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: "+r.stderr[:300]}')
print('Written.')
