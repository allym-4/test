#!/usr/bin/env python3
"""Add Helpdesk screen to admin-founder.html and student-ux.html."""
import re, subprocess

# ══════════════════════════════════════════════════════
#  ADMIN — admin-founder.html
# ══════════════════════════════════════════════════════
with open('admin-founder.html') as f:
    html = f.read()

# ── 1. Nav item (before Settings) ────────────────────
OLD_SETTINGS_NAV = '    <div class="nav-item" onclick="showScreen(\'settings\')"><span class="nav-icon">⚙️</span> Settings</div>'
NEW_SETTINGS_NAV = '''    <div class="nav-item" onclick="showScreen(\'helpdesk\')" style="position:relative;"><span class="nav-icon">🎧</span> Helpdesk <span id="helpdesk-badge" style="margin-left:auto;background:#ff3333;color:#fff;border-radius:10px;font-size:10px;font-weight:700;padding:1px 6px;line-height:16px;">5</span></div>
    <div class="nav-item" onclick="showScreen(\'settings\')"><span class="nav-icon">⚙️</span> Settings</div>'''

assert OLD_SETTINGS_NAV in html, 'Settings nav not found'
html = html.replace(OLD_SETTINGS_NAV, NEW_SETTINGS_NAV, 1)
print('Added Helpdesk nav item')

# ── 2. Screen HTML (insert before </body>) ────────────
HELPDESK_SCREEN = '''
    <!-- ═══════════════════════ HELPDESK ═══════════════════════ -->
    <div id="screen-helpdesk" class="screen">
      <div class="page-header" style="margin-bottom:16px;">
        <div>
          <div class="page-title">Helpdesk</div>
          <div class="page-sub">Student support requests &amp; enquiries</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="hdSetFilter('all')">All</button>
          <button class="btn btn-ghost btn-sm" onclick="showToast('Export CSV downloaded')">Export</button>
        </div>
      </div>

      <!-- KPI bar -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
        <div class="section" style="padding:14px 16px;display:flex;flex-direction:column;gap:4px;">
          <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;">Open Tickets</div>
          <div style="font-family:'Archivo Black',sans-serif;font-size:26px;color:var(--amber);" id="hd-stat-open">5</div>
          <div style="font-size:11px;color:var(--grey);">Awaiting response</div>
        </div>
        <div class="section" style="padding:14px 16px;display:flex;flex-direction:column;gap:4px;">
          <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;">Avg Response Time</div>
          <div style="font-family:'Archivo Black',sans-serif;font-size:26px;color:var(--lav);">3.2h</div>
          <div style="font-size:11px;color:var(--grey);">This week</div>
        </div>
        <div class="section" style="padding:14px 16px;display:flex;flex-direction:column;gap:4px;">
          <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;">Resolved This Week</div>
          <div style="font-family:'Archivo Black',sans-serif;font-size:26px;color:var(--lime);" id="hd-stat-resolved">12</div>
          <div style="font-size:11px;color:var(--grey);">+3 vs last week</div>
        </div>
        <div class="section" style="padding:14px 16px;display:flex;flex-direction:column;gap:4px;">
          <div style="font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;">Satisfaction</div>
          <div style="font-family:'Archivo Black',sans-serif;font-size:26px;color:var(--lime);">94%</div>
          <div style="font-size:11px;color:var(--grey);">Based on 18 ratings</div>
        </div>
      </div>

      <!-- Three-column layout -->
      <div style="display:grid;grid-template-columns:300px 1fr 270px;gap:0;background:#111;border:1px solid var(--border);border-radius:12px;overflow:hidden;height:calc(100vh - 290px);min-height:480px;">

        <!-- Col 1: Ticket list -->
        <div style="border-right:1px solid var(--border);display:flex;flex-direction:column;">
          <div style="padding:10px 12px;border-bottom:1px solid var(--border);">
            <input type="text" class="search-input" placeholder="Search tickets…" style="width:100%;padding:7px 12px;font-size:13px;box-sizing:border-box;" oninput="hdSearch(this.value)" />
          </div>
          <div style="display:flex;border-bottom:1px solid var(--border);">
            <button class="hd-tab active" id="hd-tab-open" onclick="hdSetFilter('open')" style="flex:1;padding:8px 4px;background:none;border:none;color:var(--amber);font-size:12px;cursor:pointer;border-bottom:2px solid var(--amber);">Open (5)</button>
            <button class="hd-tab" id="hd-tab-pending" onclick="hdSetFilter('pending')" style="flex:1;padding:8px 4px;background:none;border:none;color:var(--grey);font-size:12px;cursor:pointer;border-bottom:2px solid transparent;">Pending (2)</button>
            <button class="hd-tab" id="hd-tab-resolved" onclick="hdSetFilter('resolved')" style="flex:1;padding:8px 4px;background:none;border:none;color:var(--grey);font-size:12px;cursor:pointer;border-bottom:2px solid transparent;">Resolved (12)</button>
          </div>
          <div style="overflow-y:auto;flex:1;" id="hd-ticket-list"></div>
        </div>

        <!-- Col 2: Thread -->
        <div style="display:flex;flex-direction:column;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;" id="hd-thread-header">
            <div>
              <div style="font-size:14px;font-weight:600;" id="hd-thread-title">Select a ticket</div>
              <div style="font-size:12px;color:var(--grey);margin-top:2px;" id="hd-thread-meta"></div>
            </div>
            <div style="display:flex;gap:8px;" id="hd-thread-actions"></div>
          </div>
          <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;" id="hd-thread-body">
            <div style="text-align:center;color:var(--grey);font-size:13px;margin-top:40px;">Select a ticket to view the conversation</div>
          </div>
          <div style="border-top:1px solid var(--border);padding:12px;" id="hd-reply-area" style="display:none;">
            <textarea id="hd-reply-input" placeholder="Type a reply…" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);padding:10px 12px;font-size:13px;resize:none;font-family:inherit;box-sizing:border-box;" rows="3"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
              <button class="btn btn-ghost btn-sm" onclick="hdInsertTemplate()">Insert template</button>
              <button class="btn btn-lime btn-sm" onclick="hdSendReply()">Send reply</button>
            </div>
          </div>
        </div>

        <!-- Col 3: Ticket details -->
        <div style="border-left:1px solid var(--border);overflow-y:auto;padding:16px;" id="hd-ticket-details">
          <div style="color:var(--grey);font-size:13px;text-align:center;margin-top:40px;">No ticket selected</div>
        </div>
      </div>
    </div>
    <!-- ══════════════════════════════════════════════════════════ -->

'''

html = html.replace('</body>', HELPDESK_SCREEN + '</body>', 1)
print('Added Helpdesk screen HTML')

# ── 3. JS ────────────────────────────────────────────
HELPDESK_JS = '''<script>
var HD_TICKETS = [
  {id:'HD-001', student:'Belle Harrison', avatar:'B', avatarBg:'var(--lime)', avatarFg:'#000',
   subject:'Missed class — can I catch up?', category:'Attendance', priority:'normal',
   status:'open', created:'12 May, 9:14am', updated:'2h ago',
   messages:[
     {from:'student',name:'Belle Harrison',time:'12 May 9:14am',text:'Hey! I missed my Level 2 class on Monday due to illness. Is there a catch-up option or can I do a casual class instead? I have a medical certificate if needed.'},
     {from:'staff',name:'Mimi',time:'12 May 10:02am',text:'Hi Belle! So sorry to hear you were unwell. Yes, absolutely — you can attend any casual class this week at no charge. Just let me know which one works for you and I\'ll add you to the list.'},
     {from:'student',name:'Belle Harrison',time:'12 May 10:18am',text:'That\'s amazing, thank you! Would Thursday 7pm Level 2 work?'}
   ]},
  {id:'HD-002', student:'Nina Patel', avatar:'N', avatarBg:'var(--lav)', avatarFg:'#000',
   subject:'Payment plan query — Season 4', category:'Billing', priority:'high',
   status:'open', created:'11 May, 3:45pm', updated:'5h ago',
   messages:[
     {from:'student',name:'Nina Patel',time:'11 May 3:45pm',text:'Hi, I signed up for a payment plan but I\'m not sure when my next instalment is due. Could you confirm the dates? Also, can I pay early if I want to?'},
   ]},
  {id:'HD-003', student:'Jade Thompson', avatar:'J', avatarBg:'#e05555', avatarFg:'#fff',
   subject:'Injury — class modification request', category:'Medical', priority:'high',
   status:'open', created:'11 May, 1:20pm', updated:'6h ago',
   messages:[
     {from:'student',name:'Jade Thompson',time:'11 May 1:20pm',text:'Hi Duality team, I\'ve recently recovered from a shoulder injury and my physio has cleared me to return but with some modifications. Could you let me know if the instructors can accommodate this? I have a letter from my physio.'},
     {from:'staff',name:'Chloe',time:'11 May 2:05pm',text:'Hi Jade! So glad you\'re on the mend. Of course we can accommodate — I\'ll flag this with your instructor before your next class. Would you be able to email through the physio letter to studio@duality.com?'}
   ]},
  {id:'HD-004', student:'Mia Torres', avatar:'M', avatarBg:'#6644cc', avatarFg:'#fff',
   subject:'Timetable clash — can I swap classes?', category:'Enrolment', priority:'normal',
   status:'open', created:'10 May, 11:00am', updated:'1d ago',
   messages:[
     {from:'student',name:'Mia Torres',time:'10 May 11:00am',text:'I\'ve just started a new job and my Thursday 7pm slot now clashes with work. Is there any chance I can move to the Saturday 10am class? I\'m currently in Level 1.'},
   ]},
  {id:'HD-005', student:'Zoe Hart', avatar:'Z', avatarBg:'#cc8800', avatarFg:'#fff',
   subject:'Refund request — cancelled workshop', category:'Billing', priority:'normal',
   status:'open', created:'9 May, 4:30pm', updated:'2d ago',
   messages:[
     {from:'student',name:'Zoe Hart',time:'9 May 4:30pm',text:'Hi, I booked the May showcase workshop but had to cancel due to a family emergency. I was told refunds are possible within 7 days. Could you process a refund to my original card? Booking ref: WS-2024-089.'},
     {from:'staff',name:'Mimi',time:'9 May 5:15pm',text:'Hi Zoe, so sorry to hear about your family situation. I\'ve escalated this to our admin team and we\'ll process the refund within 2–3 business days. You\'ll receive a confirmation email shortly.'},
     {from:'student',name:'Zoe Hart',time:'9 May 5:22pm',text:'Thank you so much, I really appreciate it.'},
     {from:'staff',name:'Mimi',time:'9 May 5:25pm',text:'Of course — take care of yourself. We look forward to having you back when things settle down. 🤍'}
   ]},
  {id:'HD-006', student:'Ruby Chen', avatar:'R', avatarBg:'#cc4444', avatarFg:'#fff',
   subject:'Locker access not working', category:'Access', priority:'normal',
   status:'pending', created:'8 May, 6:10pm', updated:'3d ago',
   messages:[
     {from:'student',name:'Ruby Chen',time:'8 May 6:10pm',text:'My locker key fob stopped working after the weekend. I tried it twice last night and the light just flashed red. Could someone reset my access please?'},
     {from:'staff',name:'Maz',time:'8 May 7:00pm',text:'Hi Ruby, I\'ve logged this with our building manager. They\'ll reset your fob access by tomorrow morning. Apologies for the hassle!'}
   ]},
  {id:'HD-007', student:'Priya Mehta', avatar:'P', avatarBg:'#44aacc', avatarFg:'#fff',
   subject:'Group class booking for friends', category:'Booking', priority:'low',
   status:'pending', created:'7 May, 2:00pm', updated:'4d ago',
   messages:[
     {from:'student',name:'Priya Mehta',time:'7 May 2:00pm',text:'Hi! I want to bring 3 friends to a casual class as a birthday treat. Is there a group rate or can I book all 4 of us at once?'},
   ]},
];

var _hdFilter = 'open';
var _hdActiveId = null;

function hdSetFilter(f) {
  _hdFilter = f;
  ['open','pending','resolved'].forEach(function(s) {
    var btn = document.getElementById('hd-tab-' + s);
    if (!btn) return;
    var active = s === f;
    var colors = {open:'var(--amber)', pending:'var(--lav)', resolved:'var(--lime)'};
    btn.style.color = active ? (colors[s] || 'var(--lime)') : 'var(--grey)';
    btn.style.borderBottom = active ? '2px solid ' + (colors[s] || 'var(--lime)') : '2px solid transparent';
  });
  renderHdList();
}

function hdSearch(q) {
  renderHdList(q.toLowerCase());
}

function renderHdList(search) {
  var el = document.getElementById('hd-ticket-list');
  if (!el) return;
  var tickets = HD_TICKETS.filter(function(t) {
    if (t.status !== _hdFilter && _hdFilter !== 'all') return false;
    if (search) return (t.student + t.subject + t.category).toLowerCase().indexOf(search) !== -1;
    return true;
  });
  if (!tickets.length) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--grey);font-size:13px;">No tickets</div>';
    return;
  }
  var priorityColor = {high:'var(--amber)', normal:'var(--grey)', low:'#555'};
  var h = '';
  tickets.forEach(function(t) {
    var active = t.id === _hdActiveId;
    h += '<div class="hd-ticket-row" onclick="hdOpenTicket(\'' + t.id + '\')" style="padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);' + (active ? 'background:#0f1600;' : '') + '">';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
    h += '<div style="width:30px;height:30px;border-radius:50%;background:' + t.avatarBg + ';display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:12px;color:' + t.avatarFg + ';flex-shrink:0;">' + t.avatar + '</div>';
    h += '<div style="flex:1;min-width:0;">';
    h += '<div style="font-size:13px;font-weight:' + (active ? '600' : '500') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + t.student + '</div>';
    h += '<div style="font-size:11px;color:var(--grey);">' + t.id + ' &nbsp;·&nbsp; ' + t.updated + '</div>';
    h += '</div>';
    if (t.priority === 'high') h += '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#2a0f00;border:1px solid var(--amber);color:var(--amber);">!</span>';
    h += '</div>';
    h += '<div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' + (active ? 'var(--white)' : 'var(--grey)') + ';">' + t.subject + '</div>';
    h += '<div style="margin-top:4px;"><span style="font-size:10px;padding:2px 8px;border-radius:4px;background:#1a1a1a;color:var(--grey);border:1px solid #333;">' + t.category + '</span></div>';
    h += '</div>';
  });
  el.innerHTML = h;
}

function hdOpenTicket(id) {
  _hdActiveId = id;
  renderHdList();
  var t = HD_TICKETS.find(function(x){return x.id===id;});
  if (!t) return;

  var titleEl = document.getElementById('hd-thread-title');
  var metaEl = document.getElementById('hd-thread-meta');
  var actionsEl = document.getElementById('hd-thread-actions');
  var bodyEl = document.getElementById('hd-thread-body');
  var detailsEl = document.getElementById('hd-ticket-details');
  var replyArea = document.getElementById('hd-reply-area');

  if (titleEl) titleEl.textContent = t.subject;
  if (metaEl) metaEl.textContent = t.id + ' · ' + t.student + ' · ' + t.category;

  if (actionsEl) {
    var statusColors = {open:'var(--amber)', pending:'var(--lav)', resolved:'var(--lime)'};
    actionsEl.innerHTML =
      '<span style="font-size:12px;padding:4px 10px;border-radius:6px;background:#1a1a1a;border:1px solid ' + (statusColors[t.status]||'#555') + ';color:' + (statusColors[t.status]||'var(--grey)') + ';">' + t.status.charAt(0).toUpperCase()+t.status.slice(1) + '</span>' +
      (t.status !== 'resolved' ? '<button class="btn btn-lime btn-sm" onclick="hdResolve(\'' + t.id + '\')">Mark Resolved</button>' : '') +
      (t.status === 'resolved' ? '<button class="btn btn-ghost btn-sm" onclick="hdReopen(\'' + t.id + '\')">Reopen</button>' : '');
  }

  if (bodyEl) {
    var mh = '';
    t.messages.forEach(function(m) {
      var isStaff = m.from === 'staff';
      mh += '<div style="display:flex;flex-direction:column;align-items:' + (isStaff ? 'flex-end' : 'flex-start') + ';gap:4px;">';
      mh += '<div style="font-size:11px;color:var(--grey);">' + m.name + ' &nbsp;·&nbsp; ' + m.time + '</div>';
      mh += '<div style="max-width:80%;padding:10px 14px;border-radius:' + (isStaff ? '12px 12px 4px 12px' : '12px 12px 12px 4px') + ';background:' + (isStaff ? '#0f1600' : '#1a1a1a') + ';border:1px solid ' + (isStaff ? 'var(--lime)' : 'var(--border)') + ';font-size:13px;line-height:1.5;">' + m.text + '</div>';
      mh += '</div>';
    });
    bodyEl.innerHTML = mh;
  }

  if (replyArea) replyArea.style.display = (t.status !== 'resolved') ? 'block' : 'none';

  if (detailsEl) {
    detailsEl.innerHTML =
      '<div style="font-size:12px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Ticket Details</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;">' +
      hdDetailRow('Student', t.student) +
      hdDetailRow('Ticket ID', t.id) +
      hdDetailRow('Category', t.category) +
      hdDetailRow('Priority', t.priority.charAt(0).toUpperCase()+t.priority.slice(1)) +
      hdDetailRow('Status', t.status.charAt(0).toUpperCase()+t.status.slice(1)) +
      hdDetailRow('Created', t.created) +
      hdDetailRow('Last update', t.updated) +
      hdDetailRow('Messages', t.messages.length + '') +
      '</div>' +
      '<div style="margin-top:20px;">' +
      '<div style="font-size:12px;color:var(--grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Quick Actions</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
      '<button class="btn btn-ghost btn-sm" style="width:100%;text-align:left;" onclick="showToast(\'Student profile opened\')">View Student Profile</button>' +
      '<button class="btn btn-ghost btn-sm" style="width:100%;text-align:left;" onclick="showToast(\'Assigned to Mimi\')">Assign to Staff</button>' +
      '<button class="btn btn-ghost btn-sm" style="width:100%;text-align:left;" onclick="showToast(\'Priority updated\')">Change Priority</button>' +
      '</div></div>';
  }
}

function hdDetailRow(label, val) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1a1a1a;">' +
    '<div style="font-size:12px;color:var(--grey);">' + label + '</div>' +
    '<div style="font-size:12px;font-weight:500;">' + val + '</div>' +
    '</div>';
}

function hdSendReply() {
  var input = document.getElementById('hd-reply-input');
  if (!input || !input.value.trim()) { showToast('Please type a reply first'); return; }
  var t = HD_TICKETS.find(function(x){return x.id===_hdActiveId;});
  if (!t) return;
  t.messages.push({from:'staff', name:'You', time:'Just now', text: input.value.trim()});
  t.updated = 'Just now';
  t.status = 'pending';
  input.value = '';
  hdOpenTicket(t.id);
  renderHdList();
  showToast('Reply sent to ' + t.student);
}

function hdResolve(id) {
  var t = HD_TICKETS.find(function(x){return x.id===id;});
  if (!t) return;
  t.status = 'resolved';
  t.updated = 'Just now';
  var badge = document.getElementById('helpdesk-badge');
  var openCount = HD_TICKETS.filter(function(x){return x.status==='open';}).length;
  if (badge) badge.textContent = openCount || '';
  hdSetFilter('resolved');
  showToast('Ticket ' + id + ' resolved');
}

function hdReopen(id) {
  var t = HD_TICKETS.find(function(x){return x.id===id;});
  if (!t) return;
  t.status = 'open';
  t.updated = 'Just now';
  var badge = document.getElementById('helpdesk-badge');
  var openCount = HD_TICKETS.filter(function(x){return x.status==='open';}).length;
  if (badge) badge.textContent = openCount;
  hdSetFilter('open');
  showToast('Ticket ' + id + ' reopened');
}

function hdInsertTemplate() {
  var input = document.getElementById('hd-reply-input');
  if (!input) return;
  var t = HD_TICKETS.find(function(x){return x.id===_hdActiveId;});
  var firstName = t ? t.student.split(' ')[0] : 'there';
  input.value = 'Hi ' + firstName + ',\\n\\nThank you for reaching out! I\\'m looking into this for you and will follow up shortly.\\n\\nWarm regards,\\nDuality Team';
  input.focus();
}

(function() {
  var orig = window.showScreen;
  window.showScreen = function(id) {
    orig(id);
    if (id === 'helpdesk') {
      setTimeout(function() {
        hdSetFilter('open');
        if (HD_TICKETS.length) hdOpenTicket(HD_TICKETS[0].id);
      }, 10);
    }
  };
})();
</script>
'''

html = html.replace('</body>', HELPDESK_JS + '</body>', 1)
print('Added Helpdesk JS')

with open('admin-founder.html', 'w') as f:
    f.write(html)

# Validate JS blocks
blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'admin-founder.html: {len(html.splitlines())} lines, {len(blocks)} script blocks')
errors = 0
for i, js in enumerate(blocks):
    with open(f'/tmp/_hd_{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_hd_{i}.js'], capture_output=True, text=True)
    if r.returncode != 0:
        print(f'Block {i}: ERROR — {r.stderr[:300]}')
        errors += 1
if not errors:
    print('All JS blocks valid')

# ══════════════════════════════════════════════════════
#  STUDENT — student-ux.html
# ══════════════════════════════════════════════════════
with open('student-ux.html') as f:
    shtml = f.read()

# ── 1. Nav item (before Account) ─────────────────────
OLD_STUDIO_NAV = "    <div class=\"nav-item\" onclick=\"showScreen('studio-info')\">"
NEW_STUDIO_NAV = """    <div class=\"nav-item\" onclick=\"showScreen('support')\"><span class=\"nav-icon\">🎧</span> Help &amp; Support</div>
    <div class=\"nav-item\" onclick=\"showScreen('studio-info')\">"""

assert OLD_STUDIO_NAV in shtml, 'studio-info nav not found in student-ux.html'
shtml = shtml.replace(OLD_STUDIO_NAV, NEW_STUDIO_NAV, 1)
print('Added Help & Support nav item to student portal')

# ── 2. Screen HTML ────────────────────────────────────
SUPPORT_SCREEN = '''
    <!-- ═══════════════ HELP & SUPPORT ═══════════════ -->
    <div id="screen-support" class="screen">
      <div class="page-header" style="margin-bottom:20px;">
        <div>
          <div class="page-title">Help &amp; Support</div>
          <div class="page-sub">Get in touch with the Duality team</div>
        </div>
      </div>

      <!-- FAQ quick links -->
      <div class="section" style="padding:18px 20px;margin-bottom:16px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:14px;margin-bottom:14px;">Common Questions</div>
        <div style="display:flex;flex-direction:column;gap:0;">
          <details style="border-bottom:1px solid var(--border);padding:10px 0;">
            <summary style="font-size:13px;font-weight:500;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">How do I reschedule a missed class? <span style="color:var(--grey);">+</span></summary>
            <div style="font-size:13px;color:var(--grey);margin-top:8px;line-height:1.6;">You can attend any casual class in the same level within 2 weeks of your missed session at no extra charge. Just contact us first so we can add you to the register.</div>
          </details>
          <details style="border-bottom:1px solid var(--border);padding:10px 0;">
            <summary style="font-size:13px;font-weight:500;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">Can I pause my season enrolment? <span style="color:var(--grey);">+</span></summary>
            <div style="font-size:13px;color:var(--grey);margin-top:8px;line-height:1.6;">Yes — with a valid reason (injury, illness, major life event) we can hold your spot for up to 4 weeks. Submit a request below and our team will review it within 24 hours.</div>
          </details>
          <details style="border-bottom:1px solid var(--border);padding:10px 0;">
            <summary style="font-size:13px;font-weight:500;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">What is your cancellation &amp; refund policy? <span style="color:var(--grey);">+</span></summary>
            <div style="font-size:13px;color:var(--grey);margin-top:8px;line-height:1.6;">Full refunds are available up to 14 days before a season starts. After that, credits can be issued at our discretion. Workshops are refundable within 7 days of booking.</div>
          </details>
          <details style="border-bottom:1px solid var(--border);padding:10px 0;">
            <summary style="font-size:13px;font-weight:500;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">How do I update my payment details? <span style="color:var(--grey);">+</span></summary>
            <div style="font-size:13px;color:var(--grey);margin-top:8px;line-height:1.6;">Go to Account → Billing → Update Payment Method. Changes take effect immediately for any upcoming instalments.</div>
          </details>
          <details style="padding:10px 0;">
            <summary style="font-size:13px;font-weight:500;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">I have an injury — can I still attend? <span style="color:var(--grey);">+</span></summary>
            <div style="font-size:13px;color:var(--grey);margin-top:8px;line-height:1.6;">Please reach out before coming back to class. Our instructors can modify movements, but we need to know your limitations in advance to keep you safe.</div>
          </details>
        </div>
      </div>

      <!-- Contact / new ticket -->
      <div class="section" style="padding:18px 20px;margin-bottom:16px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:14px;margin-bottom:4px;">Contact the Team</div>
        <div style="font-size:13px;color:var(--grey);margin-bottom:16px;">Didn't find your answer above? Send us a message and we'll get back to you within 24 hours.</div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <div style="font-size:12px;color:var(--grey);margin-bottom:6px;">Category</div>
            <select id="support-category" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);padding:9px 12px;font-size:13px;font-family:inherit;">
              <option value="">Select a topic…</option>
              <option>Attendance &amp; Make-ups</option>
              <option>Billing &amp; Payments</option>
              <option>Enrolment &amp; Class Changes</option>
              <option>Injury &amp; Medical</option>
              <option>Locker &amp; Access</option>
              <option>Technical Issue</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <div style="font-size:12px;color:var(--grey);margin-bottom:6px;">Subject</div>
            <input id="support-subject" type="text" placeholder="Brief description of your issue" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);padding:9px 12px;font-size:13px;font-family:inherit;box-sizing:border-box;" />
          </div>
          <div>
            <div style="font-size:12px;color:var(--grey);margin-bottom:6px;">Message</div>
            <textarea id="support-message" placeholder="Tell us what's going on…" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);padding:9px 12px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;" rows="5"></textarea>
          </div>
          <div>
            <button class="btn btn-lime" onclick="submitSupportTicket()" style="width:100%;">Submit Request</button>
          </div>
        </div>
      </div>

      <!-- Existing tickets -->
      <div class="section" style="padding:18px 20px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:14px;margin-bottom:14px;">My Previous Requests</div>
        <div id="support-tickets-list">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);">
            <div>
              <div style="font-size:13px;font-weight:500;">Missed class — can I catch up?</div>
              <div style="font-size:12px;color:var(--grey);margin-top:3px;">HD-001 &nbsp;·&nbsp; 12 May &nbsp;·&nbsp; Attendance</div>
            </div>
            <span class="tag tag-lime">Replied</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;">
            <div>
              <div style="font-size:13px;font-weight:500;">Payment plan query — Season 3</div>
              <div style="font-size:12px;color:var(--grey);margin-top:3px;">HD-088 &nbsp;·&nbsp; 15 Feb &nbsp;·&nbsp; Billing</div>
            </div>
            <span class="tag tag-grey">Resolved</span>
          </div>
        </div>
      </div>
    </div>
    <!-- ════════════════════════════════════════════════ -->

'''

# Insert before </body>
shtml = shtml.replace('</body>', SUPPORT_SCREEN + '</body>', 1)
print('Added Help & Support screen to student portal')

# ── 3. JS ─────────────────────────────────────────────
SUPPORT_JS = '''<script>
function submitSupportTicket() {
  var cat = document.getElementById('support-category');
  var sub = document.getElementById('support-subject');
  var msg = document.getElementById('support-message');
  if (!cat || !cat.value) { showToast('Please select a category'); return; }
  if (!sub || !sub.value.trim()) { showToast('Please add a subject'); return; }
  if (!msg || !msg.value.trim()) { showToast('Please write a message'); return; }
  var list = document.getElementById('support-tickets-list');
  if (list) {
    var newRow = document.createElement('div');
    newRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);';
    newRow.innerHTML = '<div><div style="font-size:13px;font-weight:500;">' + sub.value.trim() + '</div><div style="font-size:12px;color:var(--grey);margin-top:3px;">HD-NEW &nbsp;&middot;&nbsp; Just now &nbsp;&middot;&nbsp; ' + cat.value + '</div></div><span class="tag tag-amber">Open</span>';
    list.insertBefore(newRow, list.firstChild);
  }
  cat.value = ''; sub.value = ''; msg.value = '';
  showToast('Request submitted — we\'ll reply within 24 hours');
}
</script>
'''

shtml = shtml.replace('</body>', SUPPORT_JS + '</body>', 1)
print('Added student support JS')

with open('student-ux.html', 'w') as f:
    f.write(shtml)

# Validate
sblocks = re.findall(r'<script>(.*?)</script>', shtml, re.DOTALL)
print(f'student-ux.html: {len(shtml.splitlines())} lines, {len(sblocks)} script blocks')
serrors = 0
for i, js in enumerate(sblocks):
    with open(f'/tmp/_hds_{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_hds_{i}.js'], capture_output=True, text=True)
    if r.returncode != 0:
        print(f'Block {i}: ERROR — {r.stderr[:300]}')
        serrors += 1
if not serrors:
    print('All student JS blocks valid')

print('Done.')
