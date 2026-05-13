#!/usr/bin/env python3
"""Replace openNodeEdit + saveNodeEdit using line-based splice (avoids quote-escape issues)."""
import re, subprocess

with open('admin-founder.html') as f:
    lines = f.readlines()

# Find the range: openNodeEdit (line 10908) up to but not including deleteNode (line 10958)
start = None
end = None
for i, l in enumerate(lines):
    if 'function openNodeEdit(idx)' in l and start is None:
        start = i
    if start is not None and 'function deleteNode(idx)' in l:
        end = i
        break

assert start is not None and end is not None, f'Range not found: {start} {end}'
print(f'Replacing lines {start+1}–{end} (0-indexed {start}–{end-1})')

NEW_FUNCS = r"""function _sel(id, opts, cur) {
  var s = '<select id="' + id + '" onchange="onNodeFieldChange()" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">';
  opts.forEach(function(o) { s += '<option value="' + o.v + '"' + (o.v === cur ? ' selected' : '') + '>' + o.l + '</option>'; });
  return s + '</select>';
}

var TRIGGER_OPTS = [
  {v:'booking',     l:'Student completes booking'},
  {v:'noshow',      l:'Student marked no-show'},
  {v:'overdue',     l:'Balance becomes overdue'},
  {v:'lapsed',      l:'No booking for X weeks'},
  {v:'waitlist',    l:'Spot opens on waitlist'},
  {v:'firstclass',  l:"Student's first class within 24h"},
  {v:'season_open', l:'New season opens (X days before)'},
  {v:'season_end',  l:'Season ends (X days after)'},
  {v:'referral',    l:'Referral code unused after X weeks'},
  {v:'manual',      l:'Manual / on demand'},
];
var TRIGGER_HAS_NUMBER   = {lapsed:true, overdue:true, season_open:true, season_end:true, referral:true};
var TRIGGER_NUMBER_LABEL = {lapsed:'Weeks of inactivity', overdue:'Days overdue', season_open:'Days before season opens', season_end:'Days after season ends', referral:'Weeks into season'};
var TRIGGER_NUMBER_DEFAULT = {lapsed:3, overdue:7, season_open:14, season_end:7, referral:4};

function _triggerTypeFromDetail(detail) {
  var d = (detail || '').toLowerCase();
  if (d.indexOf('no booking') !== -1 || d.indexOf('inactivity') !== -1 || d.indexOf('lapsed') !== -1) return 'lapsed';
  if (d.indexOf('overdue') !== -1)    return 'overdue';
  if (d.indexOf('no-show') !== -1 || d.indexOf('no show') !== -1) return 'noshow';
  if (d.indexOf('waitlist') !== -1 || d.indexOf('spot opens') !== -1) return 'waitlist';
  if (d.indexOf('first class') !== -1) return 'firstclass';
  if (d.indexOf('season') !== -1 && (d.indexOf('open') !== -1 || d.indexOf('before') !== -1)) return 'season_open';
  if (d.indexOf('season') !== -1 && (d.indexOf('end') !== -1 || d.indexOf('after') !== -1)) return 'season_end';
  if (d.indexOf('referral') !== -1)   return 'referral';
  if (d.indexOf('manual') !== -1)     return 'manual';
  if (d.indexOf('booking') !== -1 || d.indexOf('checkout') !== -1) return 'booking';
  return 'booking';
}
function _triggerNumFromDetail(detail) {
  var m = (detail || '').match(/\d+/);
  return m ? parseInt(m[0]) : null;
}

function openNodeEdit(idx) {
  var auto = AUTOMATIONS.find(function(a) { return a.id === _activeAutoId; });
  if (!auto) return;
  _editingNodeIdx = idx;
  var node = auto.nodes[idx];
  var s = NODE_STYLES[node.type] || NODE_STYLES['trigger'];
  document.getElementById('node-edit-title').textContent = 'Edit ' + s.label;
  var body = '';

  /* ── Trigger ── */
  if (node.type === 'trigger') {
    var curType = _triggerTypeFromDetail(node.detail);
    var curNum  = _triggerNumFromDetail(node.detail) || TRIGGER_NUMBER_DEFAULT[curType] || 3;
    body += '<div class="field"><label>Trigger event</label>' + _sel('ne-trigger-type', TRIGGER_OPTS, curType) + '</div>';
    body += '<div id="ne-trigger-num-wrap" class="field" style="display:' + (TRIGGER_HAS_NUMBER[curType] ? 'block' : 'none') + ';">';
    body += '<label id="ne-trigger-num-label">' + (TRIGGER_NUMBER_LABEL[curType] || 'Number') + '</label>';
    body += '<input type="number" id="ne-trigger-num" min="1" max="52" value="' + curNum + '" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;" />';
    body += '</div>';
    body += '<div class="field"><label>Filter (optional)</label>';
    body += '<select id="ne-trigger-filter" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">';
    ['All students','Currently enrolled only','Seasonal students only','Casual students only','New students (first season)'].forEach(function(opt) {
      var sel = (node.filter === opt) ? ' selected' : '';
      body += '<option' + sel + '>' + opt + '</option>';
    });
    body += '</select></div>';

  /* ── Email ── */
  } else if (node.type === 'action-gmail' || node.type === 'action-mc') {
    var isMc = node.type === 'action-mc';
    body += '<div class="field"><label>Send via</label><div style="display:flex;gap:8px;margin-top:4px;">';
    body += '<button id="ne-ch-gmail" onclick="switchEmailChannel(\'gmail\')" class="btn ' + (!isMc ? 'btn-lime' : 'btn-ghost') + ' btn-sm" style="flex:1;">&#9993; Gmail</button>';
    body += '<button id="ne-ch-mc"   onclick="switchEmailChannel(\'mc\')"   class="btn ' + ( isMc ? 'btn-lime' : 'btn-ghost') + ' btn-sm" style="flex:1;">&#9993; Mailchimp</button>';
    body += '</div><div style="font-size:11px;color:var(--grey);margin-top:6px;">' + (isMc ? 'Designed template · lands in Promotions tab' : 'Plain text from mimi@dualitypole.com.au · lands in Primary inbox') + '</div></div>';
    body += '<div class="field"><label>Subject line</label><input type="text" id="ne-subject" value="' + (node.detail || '').replace(/"/g, '&quot;') + '" placeholder="e.g. We miss you, {first_name}!" /></div>';
    body += '<div class="field"><label>Body / writing brief</label><textarea id="ne-body" rows="4" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;resize:vertical;box-sizing:border-box;" placeholder="Describe what this email says — used as a brief for the template.">' + (node.bodyNote || '') + '</textarea></div>';
    body += '<div style="background:#111;border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--grey);line-height:1.8;">';
    body += '<span style="font-weight:600;color:var(--white);">Merge tags: </span>';
    body += '{first_name} &nbsp;{full_name} &nbsp;{class_name} &nbsp;{class_date} &nbsp;{instructor} &nbsp;{balance} &nbsp;{season} &nbsp;{referral_code}';
    body += '</div>';

  /* ── Delay ── */
  } else if (node.type === 'delay') {
    var durOpts = ['1 hour','3 hours','6 hours','12 hours','24 hours','2 days','3 days','7 days','14 days','21 days','30 days'];
    body += '<div class="field"><label>Wait duration</label><select id="ne-duration" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">';
    durOpts.forEach(function(d) { body += '<option' + (node.detail === d ? ' selected' : '') + '>' + d + '</option>'; });
    body += '</select></div>';
    body += '<div class="field"><label>Send timing</label><select id="ne-send-timing" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;">';
    [{v:'anytime',l:'Any time'},{v:'business',l:'Business hours only (9am–6pm)'},{v:'morning',l:'Morning only (8–10am)'}].forEach(function(o) {
      body += '<option value="' + o.v + '"' + ((node.timing||'anytime')===o.v?' selected':'') + '>' + o.l + '</option>';
    });
    body += '</select></div>';

  /* ── Condition ── */
  } else if (node.type === 'condition') {
    body += '<div class="field"><label>Condition to check</label><input type="text" id="ne-cond" value="' + (node.detail || '').replace(/"/g,'&quot;') + '" placeholder="e.g. Balance still unpaid?" /></div>';
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    body += '<div class="field"><label style="color:var(--lime);">Yes branch</label><input type="text" id="ne-yes" value="' + (node.yes || 'Continue') + '" /></div>';
    body += '<div class="field"><label style="color:#ff8888;">No branch</label><input type="text" id="ne-no" value="' + (node.no || 'Stop') + '" /></div>';
    body += '</div>';
    body += '<p style="font-size:12px;color:var(--grey);margin-top:4px;">The "No" branch stops the automation for that student. "Yes" continues to the next node.</p>';

  /* ── Push ── */
  } else if (node.type === 'push') {
    body += '<div class="field"><label>Notification title</label><input type="text" id="ne-push-title" value="' + (node.pushTitle || '').replace(/"/g,'&quot;') + '" placeholder="e.g. Spot just opened for you!" /></div>';
    body += '<div class="field"><label>Message body</label><textarea id="ne-subject" rows="3" style="width:100%;background:#1a1a1a;border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:13px;padding:10px 12px;resize:vertical;box-sizing:border-box;" placeholder="Keep it short — push notifications truncate after ~100 chars.">' + (node.detail || '') + '</textarea></div>';
  }

  body += '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);"><button class="btn btn-ghost btn-sm" onclick="deleteNode(' + idx + ')" style="color:#ff6666;border-color:#ff6666;">Delete this node</button></div>';
  document.getElementById('node-edit-body').innerHTML = body;
  openModal('modal-node-edit');
}

function onNodeFieldChange() {
  var typeEl = document.getElementById('ne-trigger-type');
  if (!typeEl) return;
  var t = typeEl.value;
  var wrap = document.getElementById('ne-trigger-num-wrap');
  var lbl  = document.getElementById('ne-trigger-num-label');
  if (wrap) wrap.style.display = TRIGGER_HAS_NUMBER[t] ? 'block' : 'none';
  if (lbl)  lbl.textContent = TRIGGER_NUMBER_LABEL[t] || 'Number';
  var numEl = document.getElementById('ne-trigger-num');
  if (numEl && TRIGGER_NUMBER_DEFAULT[t]) numEl.value = TRIGGER_NUMBER_DEFAULT[t];
}

function switchEmailChannel(ch) {
  var auto = AUTOMATIONS.find(function(a) { return a.id === _activeAutoId; });
  if (!auto || _editingNodeIdx === null) return;
  auto.nodes[_editingNodeIdx].type = (ch === 'mc') ? 'action-mc' : 'action-gmail';
  var isMc = (ch === 'mc');
  var gBtn = document.getElementById('ne-ch-gmail');
  var mBtn = document.getElementById('ne-ch-mc');
  if (gBtn) { gBtn.className = 'btn ' + (!isMc ? 'btn-lime' : 'btn-ghost') + ' btn-sm'; gBtn.style.flex = '1'; }
  if (mBtn) { mBtn.className = 'btn ' + ( isMc ? 'btn-lime' : 'btn-ghost') + ' btn-sm'; mBtn.style.flex = '1'; }
}

function saveNodeEdit() {
  var auto = AUTOMATIONS.find(function(a) { return a.id === _activeAutoId; });
  if (!auto || _editingNodeIdx === null) return;
  var node = auto.nodes[_editingNodeIdx];

  if (node.type === 'trigger') {
    var typeEl = document.getElementById('ne-trigger-type');
    var numEl  = document.getElementById('ne-trigger-num');
    var filterEl = document.getElementById('ne-trigger-filter');
    if (typeEl) {
      var t = typeEl.value;
      var opt = TRIGGER_OPTS.find(function(o) { return o.v === t; });
      var label = opt ? opt.l : t;
      if (TRIGGER_HAS_NUMBER[t] && numEl) label = label.replace('X', numEl.value);
      node.detail = label;
    }
    if (filterEl) node.filter = filterEl.value;
  } else if (node.type === 'action-gmail' || node.type === 'action-mc') {
    var subjectEl = document.getElementById('ne-subject');
    if (subjectEl) node.detail = subjectEl.value;
    var bodyEl = document.getElementById('ne-body');
    if (bodyEl) node.bodyNote = bodyEl.value;
  } else if (node.type === 'delay') {
    var durEl = document.getElementById('ne-duration');
    if (durEl) node.detail = durEl.value;
    var timingEl = document.getElementById('ne-send-timing');
    if (timingEl) node.timing = timingEl.value;
  } else if (node.type === 'condition') {
    var condEl = document.getElementById('ne-cond');
    if (condEl) node.detail = condEl.value;
    var yesEl = document.getElementById('ne-yes');
    if (yesEl) node.yes = yesEl.value;
    var noEl = document.getElementById('ne-no');
    if (noEl) node.no = noEl.value;
  } else if (node.type === 'push') {
    var ptEl = document.getElementById('ne-push-title');
    if (ptEl) node.pushTitle = ptEl.value;
    var msgEl = document.getElementById('ne-subject');
    if (msgEl) node.detail = msgEl.value;
  }

  closeModal('modal-node-edit');
  renderFlowCanvas(auto);
  showToast('Node saved');
}

"""

new_lines = lines[:start] + [NEW_FUNCS] + lines[end:]

with open('admin-founder.html', 'w') as f:
    f.writelines(new_lines)

print(f'Spliced in {len(NEW_FUNCS.splitlines())} lines replacing {end - start} old lines')

with open('admin-founder.html') as f:
    html = f.read()

assert 'TRIGGER_OPTS' in html
assert 'switchEmailChannel' in html
assert 'ne-trigger-type' in html
assert 'ne-body' in html
assert 'onNodeFieldChange' in html

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkne{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkne{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:400]}')
print('Written.')
