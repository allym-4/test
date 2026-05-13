#!/usr/bin/env python3
"""
Add to student portal:
1. Studio Info screen (address, parking, what to bring, policies, FAQ)
2. Instructor bios (modal cards accessible from booking + a dedicated section)
"""
import re, subprocess

with open('student-ux.html') as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add nav item (after Community, before Account)
# ─────────────────────────────────────────────────────────────────────────────
OLD_NAV = '''    <div class="nav-item" onclick="showScreen('community')">
      <span class="nav-icon">&#9836;</span> Community
    </div>'''

NEW_NAV = '''    <div class="nav-item" onclick="showScreen('community')">
      <span class="nav-icon">&#9836;</span> Community
    </div>
    <div class="nav-item" onclick="showScreen('studio-info')">
      <span class="nav-icon">&#9679;</span> Studio Info
    </div>'''

assert OLD_NAV in html, 'Community nav not found'
html = html.replace(OLD_NAV, NEW_NAV, 1)
print('Added Studio Info nav item')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add Studio Info screen before screen-forms
# ─────────────────────────────────────────────────────────────────────────────
OLD_FORMS = '    <div class="screen" id="screen-forms">'
NEW_BEFORE_FORMS = '''    <!-- ===== STUDIO INFO ===== -->
    <div class="screen" id="screen-studio-info">
      <div class="page-header">
        <div class="page-title">Studio Info</div>
      </div>

      <!-- Address + getting there -->
      <div class="card mb-24" style="max-width:760px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;margin-bottom:16px;">Finding Us</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:8px;">Address</div>
            <div style="font-size:15px;font-weight:500;line-height:1.6;">Duality Pole<br>Level 1, 123 Foveaux St<br>Surry Hills NSW 2010</div>
            <a href="#" onclick="event.preventDefault();showToast(\'Opening maps...\')" style="display:inline-block;margin-top:10px;font-size:13px;color:var(--lime);">Open in Maps &#8594;</a>
          </div>
          <div>
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:8px;">Getting There</div>
            <div style="font-size:13px;color:var(--grey);line-height:1.8;">
              <div>&#128652; Central Station — 7 min walk</div>
              <div>&#128652; Museum Station — 5 min walk</div>
              <div>&#128664; Street parking on Foveaux St (free after 6pm)</div>
              <div>&#128664; Wilson Parking on Bourke St</div>
            </div>
          </div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:8px;">Studio Hours</div>
          <div style="display:flex;gap:24px;font-size:13px;flex-wrap:wrap;">
            <div><span style="color:var(--grey);">Mon–Fri</span>&nbsp; 9am – 9pm</div>
            <div><span style="color:var(--grey);">Saturday</span>&nbsp; 8am – 4pm</div>
            <div><span style="color:var(--grey);">Sunday</span>&nbsp; Closed</div>
          </div>
        </div>
      </div>

      <!-- Your first class -->
      <div class="card mb-24" style="max-width:760px;background:#0f1600;border-color:var(--lime);">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;margin-bottom:16px;color:var(--lime);">Your First Class</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:10px;">What to Wear</div>
            <div style="font-size:13px;color:var(--white);line-height:1.8;">
              <div>&#10003; Shorts or bike shorts (skin contact is needed for grip)</div>
              <div>&#10003; Fitted crop top or sports bra</div>
              <div>&#10003; Bare feet or pole shoes</div>
              <div style="color:var(--grey);">&#10005; No moisturiser on legs or hands on class day</div>
              <div style="color:var(--grey);">&#10005; No long jewellery or rings</div>
            </div>
          </div>
          <div>
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:10px;">What to Bring</div>
            <div style="font-size:13px;color:var(--white);line-height:1.8;">
              <div>&#10003; Water bottle</div>
              <div>&#10003; A small towel</div>
              <div>&#10003; Grip aid (we sell Dry Hands at reception)</div>
              <div>&#10003; An open mind — everyone starts somewhere!</div>
            </div>
          </div>
        </div>
        <div style="margin-top:16px;padding:12px 16px;background:rgba(0,0,0,0.3);border-radius:8px;font-size:13px;color:var(--grey);line-height:1.6;">
          Arrive 5–10 minutes early for your first class so we can get you settled, introduce you to your instructor, and answer any questions.
        </div>
      </div>

      <!-- Instructors -->
      <div class="card mb-24" style="max-width:760px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;margin-bottom:16px;">Meet the Team</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;" id="instructor-bios-grid"></div>
      </div>

      <!-- Policies + FAQ -->
      <div class="card mb-24" style="max-width:760px;">
        <div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;margin-bottom:16px;">Policies &amp; FAQ</div>
        <div id="faq-list"></div>
      </div>
    </div>

    <div class="screen" id="screen-forms">'''

assert OLD_FORMS in html, 'screen-forms not found'
html = html.replace(OLD_FORMS, NEW_BEFORE_FORMS, 1)
print('Added Studio Info screen HTML')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Add instructor bio modal
# ─────────────────────────────────────────────────────────────────────────────
BIO_MODAL = '''<!-- Instructor bio modal -->
<div class="modal-overlay" id="modal-instructor-bio">
  <div class="modal" style="width:460px;max-width:95vw;">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
      <div id="bio-avatar" style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:22px;flex-shrink:0;background:var(--lime);color:#000;"></div>
      <div>
        <div id="bio-name" style="font-family:\'Archivo Black\',sans-serif;font-size:20px;"></div>
        <div id="bio-title" style="font-size:13px;color:var(--grey);margin-top:2px;"></div>
      </div>
      <button class="modal-close" style="margin-left:auto;" onclick="closeModal(\'modal-instructor-bio\')">&#10005;</button>
    </div>
    <div id="bio-body"></div>
  </div>
</div>
</body>'''

assert '</body>' in html
html = html.replace('</body>', BIO_MODAL, 1)
print('Added instructor bio modal')

# ─────────────────────────────────────────────────────────────────────────────
# 4. JS for bios + FAQ
# ─────────────────────────────────────────────────────────────────────────────
STUDIO_JS = r"""<script>
var INSTRUCTORS = [
  {
    name:'Mimi', initial:'M', color:'var(--lime)', titleText:'Founder & Instructor',
    bio:'Mimi founded Duality Pole in 2022 after 8 years of training across Sydney and Melbourne. She teaches High Tricks, intermediate and advanced levels, and is obsessed with strength-based progressions and helping students nail their first invert.',
    styles:['High Tricks','Intermediate','Advanced'],
    insta:'@dualitypole',
    years:8
  },
  {
    name:'Chloe', initial:'C', color:'#CDA5FF', titleText:'Senior Instructor',
    bio:'Chloe has been teaching pole for 5 years and specialises in Level 1 and Level 2. Her classes are known for being warm, encouraging and technically rigorous — she has a real talent for breaking down scary moves into manageable steps.',
    styles:['Level 1','Level 2','Beginner-friendly'],
    insta:'@chloe.pole',
    years:5
  },
  {
    name:'Maz', initial:'M', color:'var(--amber)', titleText:'Instructor',
    bio:'Maz brings a background in contemporary dance to her pole classes. She teaches Virgin and foundational classes and loves working with absolute beginners. Expect lots of laughs and a very non-intimidating vibe.',
    styles:['Virgin','Floor work','Beginners'],
    insta:'@mazonpole',
    years:3
  },
  {
    name:'Viv', initial:'V', color:'#00d4ff', titleText:'Instructor',
    bio:'Viv is a trained circus artist who discovered pole five years ago and never looked back. She teaches flexibility, exotic flow, and is the go-to for anyone wanting to add artistry and expression to their movement.',
    styles:['Exotic','Flexibility','Flow'],
    insta:'@vivmoves',
    years:5
  },
  {
    name:'Bambi', initial:'B', color:'#ff8888', titleText:'Dance & Style Instructor',
    bio:'Bambi comes from a commercial dance background and runs our Dance and style classes. Her Friday Dance class is the most popular in the studio — high energy, great music, and always a packed room.',
    styles:['Dance','Style','Choreo'],
    insta:'@bambi.dance',
    years:4
  },
];

var FAQS = [
  {q:'Can I cancel my season booking?', a:'Season class bookings are non-refundable once made, as per our terms and conditions. If you have an exceptional circumstance, please reach out to us directly via the Chat — we\'re always happy to discuss.'},
  {q:'What\'s the no-show policy?', a:'A $15 no-show fee applies if you don\'t attend a casual class you\'ve booked and don\'t cancel at least 2 hours before. For season students, repeated no-shows may affect future booking priority.'},
  {q:'How do make-up credits work?', a:'If you miss a season class, a make-up credit is issued automatically. Credits expire 60 days from issue and can be used to attend any casual or catch-up class at no extra cost.'},
  {q:'Can I bring a friend to watch?', a:'The studio is a women-only and femme-friendly space. Visitors who aren\'t participating aren\'t permitted in the studio during class time — it keeps the energy safe and comfortable for everyone.'},
  {q:'What if I have an injury?', a:'Please let your instructor know before class. We can usually modify moves to work around most injuries. For serious injuries, please get clearance from your physio first and update your health form in the app.'},
  {q:'How do I move up a level?', a:'Your instructor will let you know when you\'re ready to level up — usually when you\'ve completed the prerequisites listed in your Progress tab. You\'ll never be rushed into a level you\'re not comfortable with.'},
  {q:'Is there parking?', a:'Street parking on Foveaux St is free after 6pm on weekdays and all day on weekends. Wilson Parking on Bourke St is a 3-min walk and usually has availability.'},
];

function renderInstructorBios() {
  var grid = document.getElementById('instructor-bios-grid');
  if (!grid) return;
  var h = '';
  INSTRUCTORS.forEach(function(inst) {
    h += '<div onclick="openInstructorBio(\'' + inst.name + '\')" style="background:#1a1a1a;border:1px solid var(--border);border-radius:10px;padding:16px;cursor:pointer;transition:border-color 0.15s;" onmouseover="this.style.borderColor=\'' + inst.color + '\'" onmouseout="this.style.borderColor=\'var(--border)\'">';
    h += '<div style="width:44px;height:44px;border-radius:50%;background:' + inst.color + ';display:flex;align-items:center;justify-content:center;font-family:\'Archivo Black\',sans-serif;font-size:18px;color:#000;margin-bottom:10px;">' + inst.initial + '</div>';
    h += '<div style="font-family:\'Archivo Black\',sans-serif;font-size:14px;">' + inst.name + '</div>';
    h += '<div style="font-size:12px;color:var(--grey);margin-top:2px;">' + inst.titleText + '</div>';
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">';
    inst.styles.forEach(function(s) {
      h += '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#111;border:1px solid #333;color:var(--grey);">' + s + '</span>';
    });
    h += '</div></div>';
  });
  grid.innerHTML = h;
}

function openInstructorBio(name) {
  var inst = INSTRUCTORS.find(function(i){return i.name===name;});
  if (!inst) return;
  document.getElementById('bio-avatar').textContent = inst.initial;
  document.getElementById('bio-avatar').style.background = inst.color;
  document.getElementById('bio-name').textContent = inst.name;
  document.getElementById('bio-title').textContent = inst.titleText + ' · ' + inst.years + ' years teaching';
  var body = '<p style="font-size:14px;line-height:1.7;color:var(--grey);margin-bottom:16px;">' + inst.bio + '</p>';
  body += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">';
  inst.styles.forEach(function(s){
    body += '<span style="font-size:11px;padding:3px 9px;border-radius:4px;background:#1a1a1a;border:1px solid var(--border);color:var(--white);">' + s + '</span>';
  });
  body += '</div>';
  body += '<div style="font-size:13px;color:var(--grey);">Instagram: <a href="#" onclick="event.preventDefault()" style="color:' + inst.color + ';">' + inst.insta + '</a></div>';
  document.getElementById('bio-body').innerHTML = body;
  openModal('modal-instructor-bio');
}

function renderFAQ() {
  var el = document.getElementById('faq-list');
  if (!el) return;
  var h = '';
  FAQS.forEach(function(faq, i) {
    h += '<div style="border-bottom:1px solid var(--border);last-child:border-bottom:none;">';
    h += '<div onclick="toggleFAQ(' + i + ')" style="padding:14px 0;display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:12px;">';
    h += '<div style="font-size:14px;font-weight:500;">' + faq.q + '</div>';
    h += '<span id="faq-arrow-' + i + '" style="color:var(--grey);font-size:18px;flex-shrink:0;transition:transform 0.2s;">&#8964;</span>';
    h += '</div>';
    h += '<div id="faq-body-' + i + '" style="display:none;padding-bottom:14px;font-size:13px;color:var(--grey);line-height:1.7;">' + faq.a + '</div>';
    h += '</div>';
  });
  el.innerHTML = h;
}

function toggleFAQ(i) {
  var body = document.getElementById('faq-body-' + i);
  var arrow = document.getElementById('faq-arrow-' + i);
  if (!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
}

(function() {
  var orig = window.showScreen;
  window.showScreen = function(id) {
    orig(id);
    if (id === 'studio-info') {
      setTimeout(function() {
        renderInstructorBios();
        renderFAQ();
      }, 10);
    }
  };
})();
</script>
"""

html = html.replace('</body>', STUDIO_JS + '</body>', 1)
print('Added Studio Info + Bio JS')

assert 'screen-studio-info' in html
assert 'INSTRUCTORS' in html
assert 'renderInstructorBios' in html
assert 'renderFAQ' in html
assert 'modal-instructor-bio' in html

with open('student-ux.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_csi{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_csi{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:300]}')
print('Written.')
