#!/usr/bin/env python3
"""
Rebuild screen-notifications as a Zapier-style visual node-flow automation builder.
Left panel: automation list with status.
Right panel: vertical node canvas — Trigger → Delay → Condition → Action nodes.
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# Identify the exact block to replace
# ─────────────────────────────────────────────────────────────────────────────
OLD_SCREEN_START = '    <div id="screen-notifications" class="screen">'
OLD_SCREEN_END   = '    </div>\n\n    <!-- ===== MARKETING ===== -->'
NEW_SCREEN_END   = '    <!-- ===== MARKETING ===== -->'

start_idx = html.find(OLD_SCREEN_START)
end_idx   = html.find(OLD_SCREEN_END, start_idx)
assert start_idx != -1, 'screen-notifications start not found'
assert end_idx   != -1, 'screen-notifications end not found'

OLD_SCREEN = html[start_idx : end_idx + len(OLD_SCREEN_END)]

# ─────────────────────────────────────────────────────────────────────────────
# New screen HTML
# ─────────────────────────────────────────────────────────────────────────────
NEW_SCREEN = '''    <div id="screen-notifications" class="screen">
      <!-- ── Top bar ─────────────────────────────────────────────────────── -->
      <div class="page-header" style="margin-bottom:16px;">
        <div>
          <div class="page-title">Automations</div>
          <div class="page-sub">Visual flow builder — triggers, delays, conditions and actions</div>
        </div>
        <button class="btn btn-lime" onclick="openNewAutomationModal()">+ New Automation</button>
      </div>

      <!-- ── Gmail status strip ───────────────────────────────────────────── -->
      <div style="background:#0f1600;border:1px solid var(--lime);border-radius:10px;padding:10px 16px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span style="font-size:12px;font-weight:600;">Gmail connected — <span style="color:var(--lime);">mimi@dualitypole.com.au</span></span>
          <span style="font-size:12px;color:var(--grey);">· Bulk campaigns via Mailchimp</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="showScreen(\'settings\');setTimeout(function(){document.getElementById(\'settings-gmail\').scrollIntoView({behavior:\'smooth\'})},300)">Manage Gmail &#8594;</button>
      </div>

      <!-- ── Two-column layout ─────────────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:260px 1fr;gap:16px;min-height:600px;">

        <!-- LEFT: automation list -->
        <div style="background:#111;border:1px solid var(--border);border-radius:12px;overflow:hidden;">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--grey);">Automations</div>
          <div id="automation-list"></div>
        </div>

        <!-- RIGHT: flow canvas -->
        <div style="background:#111;border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;">
          <div id="flow-canvas-header" style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div id="flow-canvas-title" style="font-family:\'Archivo Black\',sans-serif;font-size:15px;"></div>
              <div id="flow-canvas-sub" style="font-size:12px;color:var(--grey);margin-top:2px;"></div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <span id="flow-canvas-status" style="font-size:11px;padding:3px 9px;border-radius:4px;"></span>
              <label class="toggle" style="transform:scale(0.85);" id="flow-toggle-wrap"><input type="checkbox" id="flow-toggle-cb" onchange="toggleAutomation(this)" /><span class="toggle-slider"></span></label>
            </div>
          </div>
          <div id="flow-canvas" style="flex:1;padding:24px;overflow-y:auto;"></div>
        </div>
      </div>

      <!-- ── Node edit modal ───────────────────────────────────────────────── -->
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

html = html.replace(OLD_SCREEN, NEW_SCREEN, 1)
print('Replaced screen-notifications with flow builder shell')

# ─────────────────────────────────────────────────────────────────────────────
# Automation JS — data + rendering
# ─────────────────────────────────────────────────────────────────────────────
AUTO_JS = r"""<script>
// ── Automation data ──────────────────────────────────────────────────────────
var AUTOMATIONS = [
  {
    id:'booking-confirm', name:'Booking Confirmation', cat:'Booking & Class',
    enabled:true, lastRun:'Today', runCount:312,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'Student completes checkout'},
      {type:'action-mc', label:'Email via Mailchimp', detail:'Subject: Your booking is confirmed!', template:'booking-confirm'},
    ]
  },
  {
    id:'class-reminder', name:'Class Reminder', cat:'Booking & Class',
    enabled:true, lastRun:'Today', runCount:1420,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'24 hours before scheduled class'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: See you tomorrow, {first_name}!', template:'class-reminder'},
    ]
  },
  {
    id:'first-class', name:'First Class Welcome', cat:'Booking & Class',
    enabled:true, lastRun:'Mon 11 May', runCount:28,
    nodes:[
      {type:'trigger', label:'Trigger', detail:"Student's very first class within 24 hours"},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Your first class at Duality Pole!', template:'first-class'},
    ]
  },
  {
    id:'waitlist', name:'Waitlist Promotion', cat:'Booking & Class',
    enabled:true, lastRun:'Sat 10 May', runCount:64,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'Spot opens on a class with waitlisted students'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: A spot just opened up for you!', template:'waitlist'},
    ]
  },
  {
    id:'noshow-fee', name:'No-show Fee Notification', cat:'Billing & Fees',
    enabled:true, lastRun:'Yesterday', runCount:89,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'No-show fee added to student account'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: No-show fee — {class_name}', template:'noshow-fee'},
    ]
  },
  {
    id:'overdue-chase', name:'Overdue Balance Chase', cat:'Billing & Fees',
    enabled:true, lastRun:'Mon 11 May', runCount:43,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'Balance overdue by 7 days'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Your Duality balance — quick reminder', template:'overdue-1'},
      {type:'delay', label:'Wait', detail:'7 days'},
      {type:'condition', label:'Condition', detail:'Balance still unpaid?', yes:'Continue', no:'Stop — paid'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Second reminder — overdue balance', template:'overdue-2'},
    ]
  },
  {
    id:'season-reenrol', name:'Season Re-enrolment', cat:'Billing & Fees',
    enabled:true, lastRun:'2 weeks ago', runCount:127,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'2 weeks before new season opens'},
      {type:'condition', label:'Condition', detail:'Currently enrolled in prior season?', yes:'Continue', no:'Stop'},
      {type:'action-mc', label:'Email via Mailchimp', detail:'Subject: Season 5 enrolments are open!', template:'season-open'},
    ]
  },
  {
    id:'lapsed-3w', name:'Re-engagement — 3 weeks', cat:'Re-engagement',
    enabled:true, lastRun:'Yesterday', runCount:56,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'No booking in 3 weeks'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: We miss you at Duality, {first_name}!', template:'lapsed-3w'},
    ]
  },
  {
    id:'lapsed-6w', name:'Re-engagement — 6 weeks', cat:'Re-engagement',
    enabled:true, lastRun:'Last week', runCount:31,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'No booking in 6 weeks'},
      {type:'delay', label:'Wait', detail:'Check: sent lapsed-3w email?'},
      {type:'condition', label:'Condition', detail:'Still no booking after 3w email?', yes:'Continue', no:'Stop — re-booked'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Come back — discounted trial class inside', template:'lapsed-6w'},
    ]
  },
  {
    id:'lapsed-12w', name:'Re-engagement — 12 weeks', cat:'Re-engagement',
    enabled:false, lastRun:'Never', runCount:0,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'No booking in 12 weeks'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Should we say goodbye? (opt-out)', template:'lapsed-12w'},
    ]
  },
  {
    id:'post-season', name:'Post-season Check-in', cat:'Re-engagement',
    enabled:true, lastRun:'End of Season 4', runCount:19,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'1 week after season ends — not re-enrolled'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: How was Season 4 for you, {first_name}?', template:'post-season'},
    ]
  },
  {
    id:'referral', name:'Referral Reminder', cat:'Re-engagement',
    enabled:false, lastRun:'Never', runCount:0,
    nodes:[
      {type:'trigger', label:'Trigger', detail:'4 weeks into season — referral code unused'},
      {type:'action-gmail', label:'Email via Gmail', detail:'Subject: Share Duality with a friend!', template:'referral'},
    ]
  },
];

var _activeAutoId = null;
var _editingNodeIdx = null;

// ── Node colour scheme ────────────────────────────────────────────────────────
var NODE_STYLES = {
  'trigger':      {bg:'#1a0a2e', border:'#CDA5FF', color:'#CDA5FF', icon:'&#9889;', label:'Trigger'},
  'delay':        {bg:'#1a1a1a', border:'#555',    color:'#aaa',    icon:'&#8987;', label:'Wait'},
  'condition':    {bg:'#1a0f00', border:'#ffaa00', color:'#ffaa00', icon:'&#10022;', label:'Condition'},
  'action-gmail': {bg:'#0f1600', border:'#DBFF00', color:'#DBFF00', icon:'&#9993;',  label:'Email (Gmail)'},
  'action-mc':    {bg:'#1a1200', border:'#ffaa00', color:'#ffaa00', icon:'&#9993;',  label:'Email (Mailchimp)'},
  'push':         {bg:'#0a1a1a', border:'#00d4ff', color:'#00d4ff', icon:'&#128241;', label:'Push Notification'},
};

// ── Render automation list ────────────────────────────────────────────────────
function renderAutoList() {
  var el = document.getElementById('automation-list');
  if (!el) return;
  var cats = ['Booking & Class', 'Billing & Fees', 'Re-engagement'];
  var html = '';
  cats.forEach(function(cat) {
    html += '<div style="padding:8px 14px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#555;">' + cat + '</div>';
    AUTOMATIONS.filter(function(a){return a.cat===cat;}).forEach(function(a) {
      var active = a.id === _activeAutoId;
      html += '<div class="auto-list-row' + (active ? ' active' : '') + '" onclick="openAutomation(\'' + a.id + '\')" style="padding:10px 14px;cursor:pointer;border-left:3px solid ' + (active ? 'var(--lime)' : 'transparent') + ';background:' + (active ? '#1a1a1a' : 'transparent') + ';display:flex;align-items:center;justify-content:space-between;gap:8px;">';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + a.name + '</div>';
      html += '<div style="font-size:11px;color:var(--grey);margin-top:2px;">' + a.runCount + ' runs · ' + a.lastRun + '</div>';
      html += '</div>';
      html += '<div style="width:8px;height:8px;border-radius:50%;background:' + (a.enabled ? 'var(--lime)' : '#444') + ';flex-shrink:0;"></div>';
      html += '</div>';
    });
  });
  el.innerHTML = html;
}

// ── Open an automation ────────────────────────────────────────────────────────
function openAutomation(id) {
  _activeAutoId = id;
  renderAutoList();
  var auto = AUTOMATIONS.find(function(a){return a.id===id;});
  if (!auto) return;
  document.getElementById('flow-canvas-title').textContent = auto.name;
  document.getElementById('flow-canvas-sub').textContent = auto.cat + ' · ' + auto.runCount + ' runs total';
  var statusEl = document.getElementById('flow-canvas-status');
  statusEl.textContent = auto.enabled ? 'Active' : 'Paused';
  statusEl.style.background = auto.enabled ? '#0f1600' : '#1a1a1a';
  statusEl.style.color = auto.enabled ? 'var(--lime)' : 'var(--grey)';
  statusEl.style.border = '1px solid ' + (auto.enabled ? 'var(--lime)' : '#444');
  var cb = document.getElementById('flow-toggle-cb');
  if (cb) cb.checked = auto.enabled;
  renderFlowCanvas(auto);
}

function toggleAutomation(cb) {
  var auto = AUTOMATIONS.find(function(a){return a.id===_activeAutoId;});
  if (!auto) return;
  auto.enabled = cb.checked;
  var statusEl = document.getElementById('flow-canvas-status');
  statusEl.textContent = auto.enabled ? 'Active' : 'Paused';
  statusEl.style.background = auto.enabled ? '#0f1600' : '#1a1a1a';
  statusEl.style.color = auto.enabled ? 'var(--lime)' : 'var(--grey)';
  statusEl.style.border = '1px solid ' + (auto.enabled ? 'var(--lime)' : '#444');
  renderAutoList();
  showToast(auto.name + (auto.enabled ? ' enabled' : ' paused'));
}

// ── Render flow canvas ────────────────────────────────────────────────────────
function renderFlowCanvas(auto) {
  var canvas = document.getElementById('flow-canvas');
  if (!canvas) return;
  var html = '<div style="display:flex;flex-direction:column;align-items:center;gap:0;">';
  auto.nodes.forEach(function(node, i) {
    var s = NODE_STYLES[node.type] || NODE_STYLES['trigger'];
    // Node card
    html += '<div style="width:100%;max-width:420px;background:' + s.bg + ';border:1px solid ' + s.border + ';border-radius:10px;padding:14px 16px;position:relative;" data-node="' + i + '">';
    html += '<div style="display:flex;align-items:flex-start;gap:12px;">';
    // Icon + type label
    html += '<div style="width:34px;height:34px;border-radius:8px;background:' + s.border + '22;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' + s.icon + '</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:' + s.color + ';margin-bottom:3px;">' + s.label + '</div>';
    html += '<div style="font-size:13px;font-weight:500;">' + node.label + '</div>';
    html += '<div style="font-size:12px;color:var(--grey);margin-top:3px;">' + node.detail + '</div>';
    if (node.template) {
      html += '<div style="margin-top:6px;font-size:11px;color:' + s.color + ';opacity:0.7;">Template: ' + node.template + '</div>';
    }
    if (node.type === 'condition') {
      html += '<div style="display:flex;gap:8px;margin-top:8px;">';
      html += '<span style="font-size:11px;background:#0f1600;border:1px solid var(--lime);border-radius:4px;padding:2px 8px;color:var(--lime);">Yes &#8594; ' + (node.yes||'Continue') + '</span>';
      html += '<span style="font-size:11px;background:#1a0000;border:1px solid #ff4444;border-radius:4px;padding:2px 8px;color:#ff8888;">No &#8594; ' + (node.no||'Stop') + '</span>';
      html += '</div>';
    }
    html += '</div>';
    // Edit button
    html += '<button onclick="openNodeEdit(' + i + ')" style="background:transparent;border:1px solid #333;border-radius:6px;color:var(--grey);font-size:11px;padding:4px 10px;cursor:pointer;">Edit</button>';
    html += '</div>';
    html += '</div>'; // end node card

    // Connector + add step button
    html += '<div style="display:flex;flex-direction:column;align-items:center;gap:0;width:100%;max-width:420px;">';
    html += '<div style="width:2px;height:16px;background:#333;"></div>';
    html += '<button onclick="addNodeAfter(' + i + ')" style="background:#1a1a1a;border:1px solid #333;border-radius:20px;color:var(--grey);font-size:11px;padding:4px 14px;cursor:pointer;margin:2px 0;">+ Add step</button>';
    html += '<div style="width:2px;height:16px;background:#333;"></div>';
    html += '</div>';
  });
  html += '</div>';
  canvas.innerHTML = html;
}

// ── Add node after index ──────────────────────────────────────────────────────
function addNodeAfter(idx) {
  var auto = AUTOMATIONS.find(function(a){return a.id===_activeAutoId;});
  if (!auto) return;
  var options = [
    {type:'delay',        label:'Wait',              detail:'Select duration...'},
    {type:'condition',    label:'Condition',          detail:'Define condition...', yes:'Continue', no:'Stop'},
    {type:'action-gmail', label:'Email via Gmail',    detail:'Write subject line...'},
    {type:'action-mc',    label:'Email via Mailchimp',detail:'Write subject line...'},
    {type:'push',         label:'Push Notification',  detail:'Write message...'},
  ];
  var menu = document.createElement('div');
  menu.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;border:1px solid var(--border);border-radius:12px;padding:16px;z-index:9999;min-width:260px;';
  menu.innerHTML = '<div style="font-size:13px;font-weight:700;margin-bottom:12px;">Add step after node ' + (idx+1) + '</div>';
  options.forEach(function(opt) {
    var s = NODE_STYLES[opt.type];
    menu.innerHTML += '<div onclick="insertNode('+idx+',\''+opt.type+'\',\''+opt.label+'\',\''+opt.detail+'\')" style="padding:10px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;margin-bottom:4px;border:1px solid '+s.border+'22;background:'+s.bg+';" onmouseover="this.style.borderColor=\''+s.border+'\'" onmouseout="this.style.borderColor=\''+s.border+'22\'">'
      + '<span style="font-size:15px;">' + s.icon + '</span>'
      + '<div><div style="font-size:13px;font-weight:500;color:'+s.color+'">'+opt.label+'</div><div style="font-size:11px;color:var(--grey);">'+opt.detail+'</div></div>'
      + '</div>';
  });
  menu.innerHTML += '<button onclick="this.parentNode.remove()" style="margin-top:8px;width:100%;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--grey);font-size:12px;padding:8px;cursor:pointer;">Cancel</button>';
  document.body.appendChild(menu);
  menu._cleanup = function(){menu.remove();};
}

function insertNode(afterIdx, type, label, detail) {
  document.querySelectorAll('div[style*="position:fixed"]').forEach(function(el){if(el.innerHTML.includes('Add step after')) el.remove();});
  var auto = AUTOMATIONS.find(function(a){return a.id===_activeAutoId;});
  if (!auto) return;
  var node = {type:type, label:label, detail:detail};
  if (type === 'condition') { node.yes = 'Continue'; node.no = 'Stop'; }
  auto.nodes.splice(afterIdx+1, 0, node);
  renderFlowCanvas(auto);
  showToast('Step added');
}

// ── Node edit modal ───────────────────────────────────────────────────────────
function openNodeEdit(idx) {
  var auto = AUTOMATIONS.find(function(a){return a.id===_activeAutoId;});
  if (!auto) return;
  _editingNodeIdx = idx;
  var node = auto.nodes[idx];
  var s = NODE_STYLES[node.type] || NODE_STYLES['trigger'];
  document.getElementById('node-edit-title').textContent = 'Edit ' + s.label;
  var body = '<div class="field"><label>Description / detail</label><input type="text" id="ne-detail" value="' + (node.detail||'').replace(/"/g,'&quot;') + '" /></div>';
  if (node.type === 'action-gmail' || node.type === 'action-mc') {
    body += '<div class="field"><label>Email subject</label><input type="text" id="ne-subject" value="' + (node.detail||'').replace(/"/g,'&quot;') + '" /></div>';
    body += '<div class="field"><label>Template ID</label><input type="text" id="ne-template" value="' + (node.template||'') + '" /></div>';
  }
  if (node.type === 'delay') {
    body += '<div class="field"><label>Duration</label><select id="ne-duration" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;"><option' + (node.detail==='1 hour'?' selected':'') + '>1 hour</option><option' + (node.detail==='6 hours'?' selected':'') + '>6 hours</option><option' + (node.detail==='24 hours'?' selected':'') + '>24 hours</option><option' + (node.detail==='2 days'?' selected':'') + '>2 days</option><option' + (node.detail==='3 days'?' selected':'') + '>3 days</option><option' + (node.detail==='7 days'?' selected':'') + '>7 days</option><option' + (node.detail==='14 days'?' selected':'') + '>14 days</option><option' + (node.detail==='30 days'?' selected':'') + '>30 days</option></select></div>';
  }
  if (node.type === 'condition') {
    body += '<div class="field"><label>Condition</label><input type="text" id="ne-cond" value="' + (node.detail||'').replace(/"/g,'&quot;') + '" /></div>';
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    body += '<div class="field"><label style="color:var(--lime);">Yes branch</label><input type="text" id="ne-yes" value="' + (node.yes||'Continue') + '" /></div>';
    body += '<div class="field"><label style="color:#ff8888;">No branch</label><input type="text" id="ne-no" value="' + (node.no||'Stop') + '" /></div>';
    body += '</div>';
  }
  body += '<div style="display:flex;gap:8px;"><button class="btn btn-ghost btn-sm" onclick="deleteNode('+idx+')" style="color:#ff6666;border-color:#ff6666;">Delete node</button></div>';
  document.getElementById('node-edit-body').innerHTML = body;
  document.getElementById('modal-node-edit').style.display = 'flex';
}

function saveNodeEdit() {
  var auto = AUTOMATIONS.find(function(a){return a.id===_activeAutoId;});
  if (!auto || _editingNodeIdx === null) return;
  var node = auto.nodes[_editingNodeIdx];
  var detailEl = document.getElementById('ne-detail');
  if (detailEl) node.detail = detailEl.value;
  var subjectEl = document.getElementById('ne-subject');
  if (subjectEl) node.detail = subjectEl.value;
  var tmplEl = document.getElementById('ne-template');
  if (tmplEl) node.template = tmplEl.value;
  var durEl = document.getElementById('ne-duration');
  if (durEl) node.detail = durEl.value;
  var condEl = document.getElementById('ne-cond');
  if (condEl) node.detail = condEl.value;
  var yesEl = document.getElementById('ne-yes');
  if (yesEl) node.yes = yesEl.value;
  var noEl = document.getElementById('ne-no');
  if (noEl) node.no = noEl.value;
  closeModal('modal-node-edit');
  renderFlowCanvas(auto);
  showToast('Node saved');
}

function deleteNode(idx) {
  var auto = AUTOMATIONS.find(function(a){return a.id===_activeAutoId;});
  if (!auto) return;
  if (auto.nodes.length <= 1) { showToast('Cannot delete the only node'); return; }
  auto.nodes.splice(idx, 1);
  closeModal('modal-node-edit');
  renderFlowCanvas(auto);
  showToast('Node deleted');
}

// ── New automation modal ──────────────────────────────────────────────────────
function openNewAutomationModal() {
  document.getElementById('modal-new-automation').style.display = 'flex';
}

function createNewAutomation() {
  var name = document.getElementById('new-auto-name').value.trim();
  var cat  = document.getElementById('new-auto-cat').value;
  var trigVal = document.getElementById('new-auto-trigger').value;
  var trigLabels = {
    'booking':'Student completes booking', 'noshow':'Student marked no-show',
    'overdue':'Balance becomes overdue', 'lapsed3':'No booking for 3 weeks',
    'lapsed6':'No booking for 6 weeks', 'lapsed12':'No booking for 12 weeks',
    'waitlist':'Spot opens on waitlist', 'firstclass':'First class within 24h',
    'season_end':'Season ends', 'manual':'Manual / on demand'
  };
  if (!name) { showToast('Please enter a name'); return; }
  var id = 'custom-' + Date.now();
  var auto = {
    id:id, name:name, cat:cat, enabled:false, lastRun:'Never', runCount:0,
    nodes:[
      {type:'trigger', label:'Trigger', detail: trigLabels[trigVal] || trigVal},
      {type:'action-gmail', label:'Email via Gmail', detail:'Add subject line...'},
    ]
  };
  AUTOMATIONS.push(auto);
  closeModal('modal-new-automation');
  document.getElementById('new-auto-name').value = '';
  renderAutoList();
  openAutomation(id);
  showToast('Automation created');
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function initAutomations() {
  // Hook into screen switch to render list when screen opens
  var origShowScreen = window.showScreen;
  window.showScreen = function(id) {
    origShowScreen(id);
    if (id === 'notifications') {
      setTimeout(function() {
        renderAutoList();
        if (!_activeAutoId) openAutomation('booking-confirm');
      }, 10);
    }
  };
  // Also try to render immediately if screen is already active on load
  if (document.getElementById('screen-notifications') &&
      document.getElementById('screen-notifications').classList.contains('active')) {
    renderAutoList();
    openAutomation('booking-confirm');
  }
})();
</script>
"""

html = html.replace('</body>', AUTO_JS + '</body>', 1)
print('Added Automations JS')

# ─────────────────────────────────────────────────────────────────────────────
# Safety assertions
# ─────────────────────────────────────────────────────────────────────────────
assert 'screen-notifications' in html
assert 'AUTOMATIONS' in html
assert 'renderFlowCanvas' in html
assert 'openNodeEdit' in html
assert 'openNewAutomationModal' in html
assert 'NODE_STYLES' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkab{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkab{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:400]}')
print('Written.')
