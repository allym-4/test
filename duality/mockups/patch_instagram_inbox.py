#!/usr/bin/env python3
"""
Add an Instagram / Messages unified inbox screen.
- Nav item with unread badge
- Two-column layout: conversation list + thread view
- Third column: matched student profile context
- Conversations matched to known students where handle is known
- Reply input, mark read, assign to staff
- Settings > Instagram section stub
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ── 1. Add nav item after Community ──────────────────────────────────────────
OLD_NAV = '    <div class="nav-item" onclick="showScreen(\'community\')"><span class="nav-icon">💬</span> Community</div>'
NEW_NAV = '''    <div class="nav-item" onclick="showScreen(\'community\')"><span class="nav-icon">💬</span> Community</div>
    <div class="nav-item" onclick="showScreen(\'messages\')" style="position:relative;"><span class="nav-icon">📩</span> Messages <span style="margin-left:auto;background:#ff3333;color:#fff;border-radius:10px;font-size:10px;font-weight:700;padding:1px 6px;line-height:16px;">3</span></div>'''
html = html.replace(OLD_NAV, NEW_NAV, 1)
print('Added Messages nav item')

# ── 2. Add screenTitles entry ─────────────────────────────────────────────────
html = html.replace(
    "recommendations:'Recommendations', assistant:'Assistant'",
    "recommendations:'Recommendations', assistant:'Assistant', messages:'Messages'",
    1
)

# ── 3. Insert screen-messages before screen-community ────────────────────────
SCREEN_INSERT_BEFORE = '    <!-- ===== COMMUNITY ===== -->'

MESSAGES_SCREEN = '''    <!-- ===== MESSAGES ===== -->
    <div id="screen-messages" class="screen">
      <div class="page-header" style="margin-bottom:16px;">
        <div>
          <div class="page-title">Messages</div>
          <div class="page-sub">Instagram DMs · connected via Meta Messaging API</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="showScreen(\'settings\')">⚙ Manage Connection</button>
          <button class="btn btn-ghost btn-sm" onclick="alert(\'All messages marked as read\')">Mark all read</button>
        </div>
      </div>

      <!-- Three-column layout -->
      <div style="display:grid;grid-template-columns:300px 1fr 280px;gap:0;background:#111;border:1px solid var(--border);border-radius:12px;overflow:hidden;height:calc(100vh - 220px);min-height:500px;">

        <!-- ── Col 1: Conversation list ── -->
        <div style="border-right:1px solid var(--border);display:flex;flex-direction:column;">
          <div style="padding:12px;border-bottom:1px solid var(--border);">
            <input type="text" class="search-input" placeholder="Search messages…" style="width:100%;padding:8px 12px;font-size:13px;box-sizing:border-box;" />
          </div>
          <div style="display:flex;gap:0;border-bottom:1px solid var(--border);">
            <button class="msg-tab active" onclick="setMsgTab(this,\'all\')" style="flex:1;padding:8px 4px;background:none;border:none;color:var(--lime);font-size:12px;cursor:pointer;border-bottom:2px solid var(--lime);">All (7)</button>
            <button class="msg-tab" onclick="setMsgTab(this,\'unread\')" style="flex:1;padding:8px 4px;background:none;border:none;color:var(--grey);font-size:12px;cursor:pointer;border-bottom:2px solid transparent;">Unread (3)</button>
            <button class="msg-tab" onclick="setMsgTab(this,\'unknown\')" style="flex:1;padding:8px 4px;background:none;border:none;color:var(--grey);font-size:12px;cursor:pointer;border-bottom:2px solid transparent;">Unknown (2)</button>
          </div>
          <div style="overflow-y:auto;flex:1;" id="msg-list">

            <!-- Belle Currie — unread -->
            <div class="msg-row active" data-convo="belle" onclick="openConvo(this,\'belle\')" style="display:flex;gap:10px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);background:#0f1600;">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--lime);display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:14px;color:#000;flex-shrink:0;">B</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                  <div style="font-size:13px;font-weight:600;">Belle Currie</div>
                  <div style="font-size:11px;color:var(--grey);">2m</div>
                </div>
                <div style="font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@bellecurrie · Hey! Just checking about Thurs...</div>
                <div style="width:8px;height:8px;border-radius:50%;background:#ff3333;margin-top:4px;"></div>
              </div>
            </div>

            <!-- Unknown enquiry — unread -->
            <div class="msg-row" data-convo="unknown1" onclick="openConvo(this,\'unknown1\')" style="display:flex;gap:10px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);">
              <div style="width:36px;height:36px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">?</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                  <div style="font-size:13px;font-weight:600;color:var(--grey);">@pole_lover_syd</div>
                  <div style="font-size:11px;color:var(--grey);">15m</div>
                </div>
                <div style="font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Hi! Do you have any beginner classes avail...</div>
                <div style="width:8px;height:8px;border-radius:50%;background:#ff3333;margin-top:4px;"></div>
              </div>
            </div>

            <!-- Jade Thompson — unread -->
            <div class="msg-row" data-convo="jade" onclick="openConvo(this,\'jade\')" style="display:flex;gap:10px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--lav);display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:14px;color:#000;flex-shrink:0;">J</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                  <div style="font-size:13px;font-weight:600;">Jade Thompson</div>
                  <div style="font-size:11px;color:var(--grey);">1h</div>
                </div>
                <div style="font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@jadepoles · I've been a bit MIA lately, just...</div>
                <div style="width:8px;height:8px;border-radius:50%;background:#ff3333;margin-top:4px;"></div>
              </div>
            </div>

            <!-- Ruby Kim — read -->
            <div class="msg-row" data-convo="ruby" onclick="openConvo(this,\'ruby\')" style="display:flex;gap:10px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);">
              <div style="width:36px;height:36px;border-radius:50%;background:#e05555;display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:14px;color:#fff;flex-shrink:0;">R</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                  <div style="font-size:13px;font-weight:500;color:var(--grey);">Ruby Kim</div>
                  <div style="font-size:11px;color:var(--grey);">3h</div>
                </div>
                <div style="font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@rubykim.dance · Got my grip aid, thanks!</div>
              </div>
            </div>

            <!-- Unknown enquiry 2 — read -->
            <div class="msg-row" data-convo="unknown2" onclick="openConvo(this,\'unknown2\')" style="display:flex;gap:10px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);">
              <div style="width:36px;height:36px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">?</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                  <div style="font-size:13px;font-weight:500;color:var(--grey);">@fitnessgirl_au</div>
                  <div style="font-size:11px;color:var(--grey);">Yesterday</div>
                </div>
                <div style="font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">What are your prices for casual classes?</div>
              </div>
            </div>

            <!-- Stella Mitchell — read -->
            <div class="msg-row" data-convo="stella" onclick="openConvo(this,\'stella\')" style="display:flex;gap:10px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);">
              <div style="width:36px;height:36px;border-radius:50%;background:#555;display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:14px;color:#fff;flex-shrink:0;">S</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                  <div style="font-size:13px;font-weight:500;color:var(--grey);">Stella Mitchell</div>
                  <div style="font-size:11px;color:var(--grey);">Yesterday</div>
                </div>
                <div style="font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@stella.moves · So sorry about missing class...</div>
              </div>
            </div>

            <!-- Dana Park — read -->
            <div class="msg-row" data-convo="dana" onclick="openConvo(this,\'dana\')" style="display:flex;gap:10px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);">
              <div style="width:36px;height:36px;border-radius:50%;background:#4a9eff;display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:14px;color:#fff;flex-shrink:0;">D</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                  <div style="font-size:13px;font-weight:500;color:var(--grey);">Dana Park</div>
                  <div style="font-size:11px;color:var(--grey);">2d</div>
                </div>
                <div style="font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@dana_dances · Quick question about the workshop</div>
              </div>
            </div>

          </div>
        </div>

        <!-- ── Col 2: Thread view ── -->
        <div style="display:flex;flex-direction:column;" id="msg-thread-wrap">
          <!-- Thread header -->
          <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--lime);display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:13px;color:#000;" id="thread-avatar">B</div>
              <div>
                <div style="font-size:14px;font-weight:600;" id="thread-name">Belle Currie</div>
                <div style="font-size:12px;color:var(--grey);" id="thread-handle">@bellecurrie · Instagram</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-ghost btn-xs" onclick="alert(\'Assigned to Chloe\')">Assign</button>
              <button class="btn btn-ghost btn-xs" id="view-profile-btn" onclick="openStudentById(\'bellecurrie\')">View Profile</button>
            </div>
          </div>

          <!-- Messages -->
          <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;" id="thread-messages">
          </div>

          <!-- Reply input -->
          <div style="padding:12px 14px;border-top:1px solid var(--border);display:flex;gap:10px;align-items:flex-end;">
            <div style="flex:1;background:#1a1a1a;border:1px solid var(--border);border-radius:10px;padding:10px 14px;">
              <textarea id="msg-reply-input" rows="2" placeholder="Reply via Instagram…" style="width:100%;background:none;border:none;color:var(--white);font-family:inherit;font-size:13px;resize:none;outline:none;line-height:1.5;box-sizing:border-box;"></textarea>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-ghost btn-xs" onclick="insertQuickReply(\'prices\')">Prices</button>
                  <button class="btn btn-ghost btn-xs" onclick="insertQuickReply(\'trial\')">Book trial</button>
                  <button class="btn btn-ghost btn-xs" onclick="insertQuickReply(\'schedule\')">Schedule</button>
                </div>
                <button class="btn btn-lime btn-xs" onclick="sendMsgReply()">Send ↑</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Col 3: Student context ── -->
        <div style="border-left:1px solid var(--border);overflow-y:auto;padding:16px;" id="msg-context-panel">
        </div>

      </div>
    </div>

    <!-- ===== COMMUNITY ===== -->'''

html = html.replace(SCREEN_INSERT_BEFORE, MESSAGES_SCREEN, 1)
print('Inserted screen-messages')

# ── 4. Add JS ─────────────────────────────────────────────────────────────────
MESSAGES_JS = r"""<script>
var CONVOS = {
  belle: {
    name: 'Belle Currie', handle: '@bellecurrie', avatar: 'B', color: 'var(--lime)', avatarColor: '#000',
    studentId: 'bellecurrie',
    messages: [
      {from:'them', text:"Hey! Just checking — is the Thursday Level 2 class still running this week? I've missed a few and want to make sure I'm not too behind 😅", time:'9:14am'},
      {from:'them', text:"Also sorry about the no-shows, life has been hectic 😔", time:'9:15am'},
    ]
  },
  unknown1: {
    name: '@pole_lover_syd', handle: 'Instagram · not a student', avatar: '?', color: '#333', avatarColor: '#fff',
    studentId: null,
    messages: [
      {from:'them', text:"Hi! Do you have any beginner classes available? I've always wanted to try pole dancing 🙈", time:'9:01am'},
    ]
  },
  jade: {
    name: 'Jade Thompson', handle: '@jadepoles', avatar: 'J', color: 'var(--lav)', avatarColor: '#000',
    studentId: 'jade',
    messages: [
      {from:'them', text:"Hey Mimi! I've been a bit MIA lately, just wanted to reach out and say I'm hoping to get back next week", time:'8:22am'},
      {from:'me', text:"Hey Jade! So glad to hear from you 💛 No worries at all — your spot is still here. See you next week!", time:'8:45am'},
    ]
  },
  ruby: {
    name: 'Ruby Kim', handle: '@rubykim.dance', avatar: 'R', color: '#e05555', avatarColor: '#fff',
    studentId: 'ruby',
    messages: [
      {from:'them', text:"Got my grip aid from the front desk, thanks so much! It's amazing 🙌", time:'6:42am'},
      {from:'me', text:"So glad you love it! It's our fave 😄 See you in class!", time:'7:10am'},
    ]
  },
  unknown2: {
    name: '@fitnessgirl_au', handle: 'Instagram · not a student', avatar: '?', color: '#333', avatarColor: '#fff',
    studentId: null,
    messages: [
      {from:'them', text:"What are your prices for casual classes? And do you need any experience?", time:'Yesterday 3:30pm'},
      {from:'me', text:"Hi! Casual drop-in is $35, no experience needed at all 😊 We have Level 1 classes perfect for beginners — you can book via the link in our bio!", time:'Yesterday 4:02pm'},
    ]
  },
  stella: {
    name: 'Stella Mitchell', handle: '@stella.moves', avatar: 'S', color: '#555', avatarColor: '#fff',
    studentId: 'stella',
    messages: [
      {from:'them', text:"So sorry about missing class again this week 😭 Thursday nights have been impossible lately with work. Is there any other time I could catch up?", time:'Yesterday 7:18pm'},
    ]
  },
  dana: {
    name: 'Dana Park', handle: '@dana_dances', avatar: 'D', color: '#4a9eff', avatarColor: '#fff',
    studentId: 'dana',
    messages: [
      {from:'them', text:"Quick question about the Choreo Intensive workshop — is it suitable for Level 2 students or more advanced?", time:'2 days ago'},
      {from:'me', text:"Hey Dana! It's open to Level 2+ — you'll be totally fine 🙌 There are a few spots left if you want to grab one!", time:'2 days ago'},
      {from:'them', text:"Amazing, I'll book now! Thanks 😊", time:'2 days ago'},
    ]
  }
};

var QUICK_REPLIES = {
  prices: "Hi! Our season enrolment is $160–$220 depending on class, casual drop-in is $35, and trials are $25. Happy to answer any questions 😊",
  trial: "We'd love to have you try a class! You can book a trial ($25) via the link in our bio, or I can book you in directly — just let me know which class and day works for you!",
  schedule: "Our full schedule is on the website at dualitypole.com.au — we have classes Monday to Sunday across all levels. Feel free to DM me if you want help finding the right class for you!"
};

var _activeConvo = 'belle';

function openConvo(rowEl, convoId) {
  document.querySelectorAll('.msg-row').forEach(function(r) { r.style.background = ''; r.classList.remove('active'); });
  rowEl.style.background = '#0f1600';
  rowEl.classList.add('active');
  // Remove unread dot
  var dot = rowEl.querySelector('div[style*="border-radius:50%;background:#ff3333"]');
  if (dot) dot.remove();
  _activeConvo = convoId;
  var c = CONVOS[convoId];
  if (!c) return;
  document.getElementById('thread-avatar').textContent = c.avatar;
  document.getElementById('thread-avatar').style.background = c.color;
  document.getElementById('thread-avatar').style.color = c.avatarColor;
  document.getElementById('thread-name').textContent = c.name;
  document.getElementById('thread-handle').textContent = c.handle + ' · Instagram';
  var vpBtn = document.getElementById('view-profile-btn');
  if (c.studentId) { vpBtn.style.display = ''; vpBtn.onclick = function() { openStudentById(c.studentId); }; }
  else { vpBtn.style.display = 'none'; }
  renderThread(c);
  renderContext(c);
}

function renderThread(c) {
  var el = document.getElementById('thread-messages');
  el.innerHTML = c.messages.map(function(m) {
    var isMe = m.from === 'me';
    return '<div style="display:flex;justify-content:' + (isMe ? 'flex-end' : 'flex-start') + ';">' +
      '<div style="max-width:75%;background:' + (isMe ? 'var(--lime)' : '#1a1a1a') + ';color:' + (isMe ? '#000' : 'var(--white)') + ';border-radius:' + (isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px') + ';padding:10px 14px;font-size:13px;line-height:1.5;">' +
      m.text + '<div style="font-size:10px;color:' + (isMe ? 'rgba(0,0,0,0.5)' : 'var(--grey)') + ';margin-top:4px;text-align:right;">' + m.time + '</div></div></div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function renderContext(c) {
  var panel = document.getElementById('msg-context-panel');
  if (!c.studentId) {
    panel.innerHTML = '<div style="text-align:center;padding:24px 12px;">' +
      '<div style="font-size:28px;margin-bottom:12px;">👤</div>' +
      '<div style="font-size:13px;font-weight:600;margin-bottom:6px;">Unknown contact</div>' +
      '<div style="font-size:12px;color:var(--grey);line-height:1.5;margin-bottom:16px;">This Instagram account isn\'t linked to a student record.</div>' +
      '<button class="btn btn-ghost btn-sm" style="width:100%;" onclick="alert(\'Match to student flow\')">Match to student</button>' +
      '<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px;" onclick="alert(\'New lead added\')">Add as lead</button></div>';
    return;
  }
  var s = STUDENTS.find(function(x) { return x.id === c.studentId; });
  if (!s) { panel.innerHTML = '<div style="padding:16px;color:var(--grey);font-size:13px;">Student data loading…</div>'; return; }
  var bal = s.balance || 0;
  var plan = s.paymentPlan || null;
  var balHtml = bal < 0 ? '<span style="color:#ff6b6b;">−$' + Math.abs(bal) + ' owing</span>' : bal > 0 ? '<span style="color:var(--lime);">+$' + bal + ' credit</span>' : '<span style="color:var(--grey);">$0</span>';
  panel.innerHTML =
    '<div style="text-align:center;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:14px;">' +
      '<div style="width:48px;height:48px;border-radius:50%;background:' + c.color + ';display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:20px;color:' + c.avatarColor + ';margin:0 auto 8px;">' + c.avatar + '</div>' +
      '<div style="font-weight:600;font-size:14px;">' + s.name + '</div>' +
      '<div style="font-size:11px;color:var(--grey);margin-top:2px;">' + c.handle + '</div>' +
    '</div>' +
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:8px;">Season 4</div>' +
    '<div style="font-size:12px;line-height:1.8;margin-bottom:14px;">' + (s.classes || []).join('<br>') + '</div>' +
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);margin-bottom:6px;">Balance</div>' +
    '<div style="font-size:14px;margin-bottom:' + (plan ? '4px' : '14px') + ';">' + balHtml + '</div>' +
    (plan ? '<div style="font-size:11px;color:var(--amber);margin-bottom:14px;">Payment plan ' + plan.status + '</div>' : '') +
    '<div style="display:flex;flex-direction:column;gap:6px;">' +
      '<button class="btn btn-lime btn-sm" onclick="openStudentById(\'' + s.id + '\')" style="width:100%;">Open Profile</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="openChaseModal(\'' + s.name + '\',\'Via Instagram DM\',\'' + (bal < 0 ? \'$\' + Math.abs(bal) : \'$0\') + '\',0)" style="width:100%;">Chase Payment</button>' +
    '</div>';
}

function sendMsgReply() {
  var input = document.getElementById('msg-reply-input');
  var text = input.value.trim();
  if (!text) return;
  var c = CONVOS[_activeConvo];
  if (!c) return;
  c.messages.push({ from: 'me', text: text, time: 'Just now' });
  renderThread(c);
  input.value = '';
  showToast('Sent via Instagram');
}

function insertQuickReply(key) {
  document.getElementById('msg-reply-input').value = QUICK_REPLIES[key] || '';
  document.getElementById('msg-reply-input').focus();
}

function setMsgTab(btn, filter) {
  document.querySelectorAll('.msg-tab').forEach(function(b) {
    b.style.color = 'var(--grey)'; b.style.borderBottomColor = 'transparent';
  });
  btn.style.color = 'var(--lime)'; btn.style.borderBottomColor = 'var(--lime)';
}

// Load Belle's convo on first visit
document.addEventListener('DOMContentLoaded', function() {
  var firstRow = document.querySelector('.msg-row');
  if (firstRow) { renderThread(CONVOS['belle']); renderContext(CONVOS['belle']); }
});
</script>
"""

html = html.replace('</body>', MESSAGES_JS + '</body>', 1)
print('Added Messages JS')

# ── 5. Validate ────────────────────────────────────────────────────────────────
assert 'screen-messages' in html
assert 'openConvo' in html
assert 'renderThread' in html
assert 'CONVOS' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkm{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkm{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:300]}')
print('Written.')
