#!/usr/bin/env python3
"""Replace Studio Info screen with real handbook content (address, dynamic first-class, real FAQs, Duality Code, contact)."""
import re, subprocess

with open('student-ux.html') as f:
    html = f.read()

# ── 1. Fix address ────────────────────────────────────────────────────────────
html = html.replace(
    'Level 1, 123 Foveaux St<br>Surry Hills NSW 2010',
    'Level 1, 88 Kippax St<br>Surry Hills NSW 2010'
)
# Fix parking copy that still says Foveaux
html = html.replace(
    'Street parking on Foveaux St (free after 6pm)',
    'Street parking on Kippax St (free after 6pm)'
)
print('Fixed address + parking')

# ── 2. Replace static first-class card with a placeholder div ─────────────────
OLD_FIRST_CLASS = '''      <!-- Your first class -->
      <div class="card mb-24" style="max-width:760px;background:#0f1600;border-color:var(--lime);">
        <div style="font-family:'Archivo Black',sans-serif;font-size:16px;margin-bottom:16px;color:var(--lime);">Your First Class</div>
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
      </div>'''

NEW_FIRST_CLASS = '''      <!-- Your first class (rendered dynamically by renderFirstClassSection) -->
      <div id="si-first-class-section" class="mb-24" style="max-width:760px;"></div>'''

assert OLD_FIRST_CLASS in html, 'First class card not found'
html = html.replace(OLD_FIRST_CLASS, NEW_FIRST_CLASS, 1)
print('Replaced first-class card with dynamic placeholder')

# ── 3. Add Duality Code + Contact cards after the FAQ card ────────────────────
OLD_END_FAQ = '''      <!-- Policies + FAQ -->
      <div class="card mb-24" style="max-width:760px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:16px;margin-bottom:16px;">Policies &amp; FAQ</div>
        <div id="faq-list"></div>
      </div>
    </div>'''

NEW_END_FAQ = '''      <!-- Policies + FAQ -->
      <div class="card mb-24" style="max-width:760px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:16px;margin-bottom:16px;">Policies &amp; FAQ</div>
        <div id="faq-list"></div>
      </div>

      <!-- Duality Code -->
      <div class="card mb-24" style="max-width:760px;background:#0a0010;border-color:var(--lav);">
        <div style="font-family:'Archivo Black',sans-serif;font-size:16px;margin-bottom:4px;color:var(--lav);">The Duality Code</div>
        <div style="font-size:12px;color:var(--grey);margin-bottom:16px;">Our community values — what makes this space special.</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <span style="font-size:16px;flex-shrink:0;">&#127775;</span>
            <div><div style="font-size:13px;font-weight:600;margin-bottom:2px;">Body-neutral space</div><div style="font-size:12px;color:var(--grey);line-height:1.6;">No body commentary — positive or negative. We celebrate what bodies can do, not how they look.</div></div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <span style="font-size:16px;flex-shrink:0;">&#129505;</span>
            <div><div style="font-size:13px;font-weight:600;margin-bottom:2px;">Inclusive &amp; affirming</div><div style="font-size:12px;color:var(--grey);line-height:1.6;">Duality welcomes all genders, bodies, backgrounds and abilities. Discrimination of any kind will not be tolerated.</div></div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <span style="font-size:16px;flex-shrink:0;">&#128247;</span>
            <div><div style="font-size:13px;font-weight:600;margin-bottom:2px;">Filming consent</div><div style="font-size:12px;color:var(--grey);line-height:1.6;">You may film yourself only, with your instructor's permission. Never film other students without their explicit consent.</div></div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <span style="font-size:16px;flex-shrink:0;">&#129504;</span>
            <div><div style="font-size:13px;font-weight:600;margin-bottom:2px;">No unsolicited coaching</div><div style="font-size:12px;color:var(--grey);line-height:1.6;">Leave the teaching to the instructors. Unsolicited corrections — even well-meaning ones — can undermine someone's confidence.</div></div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <span style="font-size:16px;flex-shrink:0;">&#128722;</span>
            <div><div style="font-size:13px;font-weight:600;margin-bottom:2px;">Shared equipment</div><div style="font-size:12px;color:var(--grey);line-height:1.6;">Wipe down apparatus after use. Return props to where you found them. Be mindful of space during practice time.</div></div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <span style="font-size:16px;flex-shrink:0;">&#128588;</span>
            <div><div style="font-size:13px;font-weight:600;margin-bottom:2px;">Cheer each other on</div><div style="font-size:12px;color:var(--grey);line-height:1.6;">We celebrate each other's wins — big and small. This is a supportive community, not a competition.</div></div>
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div class="card mb-24" style="max-width:760px;">
        <div style="font-family:'Archivo Black',sans-serif;font-size:16px;margin-bottom:16px;">Get in Touch</div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
            <div style="min-width:180px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:4px;">General enquiries</div>
              <a href="#" onclick="event.preventDefault();showToast('Opening email...')" style="font-size:14px;color:var(--lime);">intrigued@dualitypole.com</a>
            </div>
            <div>
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:4px;">Urgent (same-day class issues)</div>
              <a href="#" onclick="event.preventDefault();showToast('Opening email...')" style="font-size:14px;color:var(--lime);">staff@dualitypole.com</a>
            </div>
          </div>
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:4px;">Instagram</div>
            <a href="#" onclick="event.preventDefault();showToast('Opening Instagram...')" style="font-size:14px;color:var(--lav);">@dualitypole</a>
          </div>
          <div style="padding:12px 14px;background:#111;border-radius:8px;font-size:12px;color:var(--grey);line-height:1.6;">
            For same-day issues (e.g. can't access Kisi, running late) please email <span style="color:var(--white);">staff@dualitypole.com</span> — this inbox is monitored before and during class time. The general inbox may not be checked until the next business day.
          </div>
        </div>
      </div>
    </div>'''

assert OLD_END_FAQ in html, 'FAQ card end not found'
html = html.replace(OLD_END_FAQ, NEW_END_FAQ, 1)
print('Added Duality Code + Contact cards')

# ── 4. Replace FAQS array using line-based splice ─────────────────────────────
lines = html.splitlines(keepends=True)
faqs_start = next(i for i, l in enumerate(lines) if 'var FAQS = [' in l)
# Find the closing ]; after the FAQS start
faqs_end = faqs_start + 1
while faqs_end < len(lines) and not lines[faqs_end].strip().startswith('];'):
    faqs_end += 1
faqs_end += 1  # include the ]; line
print(f'FAQS array at lines {faqs_start+1}–{faqs_end} (0-indexed {faqs_start}–{faqs_end-1})')

NEW_FAQS = r"""var FAQS = [
  {q:'How do I access the studio with Kisi?', a:'Download the Kisi app (iOS or Android) and accept the invite email we sent you. Your access is activated 15 minutes before your class starts and the door locks automatically 1 minute after the scheduled start time. If you have issues, email staff@dualitypole.com before heading in.'},
  {q:'What happens if I\'m late?', a:'If you arrive 5 or more minutes after class starts you will not be admitted — this protects the experience for students who are already mid-warm-up. A missed class due to lateness is treated as a no-show and a $20 penalty fee applies. The Kisi door lock enforces this: it locks 5–15 minutes into class depending on the class type.'},
  {q:'How do I cancel a season class?', a:'Cancel through the app at least 4 hours before class and a make-up credit is issued automatically. Cancellations inside 4 hours are forfeited with no credit. If you do not cancel and do not attend, a $20 no-show fee applies. You cannot cancel season classes on the day — plan ahead!'},
  {q:'How do make-up credits work?', a:'Make-up credits are issued when you cancel a season class with 4+ hours notice. Credits are valid for the current season only, expire at the end of the season, and are non-transferable. Use them to book any casual or catch-up slot at your level through the app.'},
  {q:'What do I wear to a levelled pole class?', a:'Skin contact is essential for grip: wear shorts or bike shorts and a fitted crop top or sports bra. Bare feet are best; pole shoes are also fine. Avoid moisturiser on your legs, arms and hands on class day — it makes the pole slippery. Remove rings and long jewellery before class.'},
  {q:'What do I wear to a supplementary or dance class?', a:'Comfortable, flexible clothing is fine. Knee pads are strongly recommended for floor work — most students use basic volleyball knee pads. Pole shoes are optional but great if you have them. You can wear a light moisturiser for these classes as there is no pole grip required.'},
  {q:'What should I bring to class?', a:'Water bottle and a small towel are essentials. For pole classes, bring grip aid if you have it — we sell Dry Hands at reception. For supplementary classes, bring your knee pads. Leave valuables at home or use a studio locker.'},
  {q:'How does practice time work?', a:'Practice time is bookable through the app. Cost is $20\/hr for currently-enrolled students and $30\/hr for non-enrolled students. Practice time is free if you attend 3 or more classes in the same week. Book in advance — slots fill quickly!'},
  {q:'How do studio lockers work?', a:'Lockers are free if you attend 4 or more classes per week. Otherwise, a seasonal locker is $50\/season. Day-use lockers are available free of charge for every student — just bring your own lock or grab one from reception.'},
  {q:'Can I film in class?', a:'You may film yourself only, and only with your instructor\'s permission. Never film other students without their explicit consent. This is a firm community rule — the studio is a space where people feel free to move without worrying about being recorded.'},
  {q:'Can I bring a guest to watch?', a:'No visitors during class time. The studio is a private, focused space and having observers changes the energy for everyone. If your guest wants to experience Duality, get them to book their own class!'},
  {q:'What if I have an injury?', a:'Please tell your instructor before class — they can usually modify your session around most injuries. For serious or recent injuries, get clearance from a physio first and update your health form in the app. We want you to be safe above everything else.'},
  {q:'How do I move up a level?', a:'Your instructor will let you know when you\'re ready — usually once you\'ve achieved the prerequisite moves listed in your Progress tab. You\'ll never be pushed into a level you\'re not ready for. If you\'re keen to progress, chat to your instructor after class.'},
  {q:'Is there parking nearby?', a:'Street parking on Kippax St is free after 6pm on weekdays and all day on weekends. Wilson Parking on Bourke St is about a 3-minute walk. Central Station is a 7-minute walk and Museum Station is about 5 minutes.'},
];
"""

lines[faqs_start:faqs_end] = [NEW_FAQS]
html = ''.join(lines)
print('Replaced FAQS array with real handbook content')

# ── 5. Add renderFirstClassSection + STUDENT_CLASS_TYPES data before renderFAQ ─
OLD_BEFORE_RENDER_FAQ = 'function renderFAQ() {'

NEW_BEFORE_RENDER_FAQ = r"""// Demo: which class types the student is enrolled in
// 'pole' = levelled pole; 'supplementary' = dance/supplementary; 'mat' = mat-based
var STUDENT_CLASS_TYPES = ['pole', 'supplementary'];

function renderFirstClassSection() {
  var el = document.getElementById('si-first-class-section');
  if (!el) return;
  var hasPole = STUDENT_CLASS_TYPES.indexOf('pole') !== -1;
  var hasSupp = STUDENT_CLASS_TYPES.indexOf('supplementary') !== -1;
  var hasMat  = STUDENT_CLASS_TYPES.indexOf('mat') !== -1;

  var h = '';

  if (isFirstTimer) {
    // Full first-class guide
    h += '<div class="card" style="background:#0f1600;border-color:var(--lime);">';
    h += '<div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;margin-bottom:4px;color:var(--lime);">Your First Class</div>';
    h += '<div style="font-size:12px;color:var(--grey);margin-bottom:16px;">Everything you need to know before you walk in.</div>';

    if (hasPole) {
      h += '<div style="margin-bottom:16px;">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:10px;">Levelled Pole Class (Level 2)</div>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
      h += '<div><div style="font-size:12px;font-weight:600;margin-bottom:8px;">What to wear</div>';
      h += '<div style="font-size:13px;color:var(--white);line-height:1.9;">';
      h += '<div>&#10003; Shorts or bike shorts</div>';
      h += '<div>&#10003; Fitted crop top or sports bra</div>';
      h += '<div>&#10003; Bare feet or pole shoes</div>';
      h += '<div style="color:var(--grey);">&#10005; No moisturiser on legs or hands</div>';
      h += '<div style="color:var(--grey);">&#10005; No rings or long jewellery</div>';
      h += '</div></div>';
      h += '<div><div style="font-size:12px;font-weight:600;margin-bottom:8px;">What to bring</div>';
      h += '<div style="font-size:13px;color:var(--white);line-height:1.9;">';
      h += '<div>&#10003; Water bottle</div>';
      h += '<div>&#10003; Small towel</div>';
      h += '<div>&#10003; Grip aid — we sell Dry Hands at reception</div>';
      h += '<div>&#10003; An open mind!</div>';
      h += '</div></div></div></div>';
    }

    if (hasSupp) {
      h += '<div style="margin-bottom:16px;' + (hasPole ? 'padding-top:16px;border-top:1px solid var(--border);' : '') + '">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:10px;">Dance / Supplementary Class</div>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
      h += '<div><div style="font-size:12px;font-weight:600;margin-bottom:8px;">What to wear</div>';
      h += '<div style="font-size:13px;color:var(--white);line-height:1.9;">';
      h += '<div>&#10003; Comfortable, flexible clothing</div>';
      h += '<div>&#10003; Knee pads (recommended for floor work)</div>';
      h += '<div>&#10003; Pole shoes optional</div>';
      h += '<div style="color:var(--grey);">&#10003; Light moisturiser is fine for these classes</div>';
      h += '</div></div>';
      h += '<div><div style="font-size:12px;font-weight:600;margin-bottom:8px;">What to bring</div>';
      h += '<div style="font-size:13px;color:var(--white);line-height:1.9;">';
      h += '<div>&#10003; Water bottle</div>';
      h += '<div>&#10003; Knee pads if you have them</div>';
      h += '<div>&#10003; Small towel</div>';
      h += '</div></div></div></div>';
    }

    if (hasMat) {
      h += '<div style="margin-bottom:16px;' + ((hasPole||hasSupp) ? 'padding-top:16px;border-top:1px solid var(--border);' : '') + '">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:10px;">Mat-Based Class</div>';
      h += '<div style="font-size:13px;color:var(--white);line-height:1.9;">';
      h += '<div>&#10003; Comfortable clothes — yoga wear or activewear</div>';
      h += '<div>&#10003; Grip socks optional</div>';
      h += '<div>&#10003; Water bottle</div>';
      h += '</div></div>';
    }

    h += '<div style="padding:12px 16px;background:rgba(0,0,0,0.3);border-radius:8px;font-size:13px;color:var(--grey);line-height:1.6;">';
    h += '<strong style="color:var(--white);">Arrive 15 minutes early</strong> for your very first class so we can say hello, show you around, and get you set up with Kisi access. After that, aim to arrive 5 minutes before class.';
    h += '</div></div>';

  } else {
    // Returning student — just show What to Bring
    h += '<div class="card">';
    h += '<div style="font-family:\'Archivo Black\',sans-serif;font-size:16px;margin-bottom:16px;">What to Bring</div>';

    if (hasPole) {
      h += '<div style="margin-bottom:' + (hasSupp || hasMat ? '16px' : '0') + ';">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:8px;">Levelled Pole Class</div>';
      h += '<div style="font-size:13px;color:var(--white);line-height:1.9;">';
      h += '<div>&#10003; Shorts / bike shorts + fitted top — bare skin for grip</div>';
      h += '<div>&#10003; Water bottle + small towel</div>';
      h += '<div>&#10003; Grip aid (Dry Hands available at reception)</div>';
      h += '<div style="color:var(--grey);">&#10005; No moisturiser on legs or hands</div>';
      h += '</div></div>';
    }

    if (hasSupp) {
      h += '<div style="' + (hasPole ? 'padding-top:14px;border-top:1px solid var(--border);' : '') + '">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:8px;">Dance / Supplementary Class</div>';
      h += '<div style="font-size:13px;color:var(--white);line-height:1.9;">';
      h += '<div>&#10003; Comfortable / flexible clothing</div>';
      h += '<div>&#10003; Knee pads recommended</div>';
      h += '<div>&#10003; Water bottle</div>';
      h += '</div></div>';
    }

    if (hasMat) {
      h += '<div style="' + ((hasPole||hasSupp) ? 'padding-top:14px;border-top:1px solid var(--border);' : '') + '">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--grey);margin-bottom:8px;">Mat-Based Class</div>';
      h += '<div style="font-size:13px;color:var(--white);line-height:1.9;">';
      h += '<div>&#10003; Comfortable clothing + water bottle</div>';
      h += '</div></div>';
    }

    h += '</div>';
  }

  el.innerHTML = h;
}

function renderFAQ() {"""

assert OLD_BEFORE_RENDER_FAQ in html, 'renderFAQ not found'
html = html.replace(OLD_BEFORE_RENDER_FAQ, NEW_BEFORE_RENDER_FAQ, 1)
print('Added STUDENT_CLASS_TYPES + renderFirstClassSection')

# ── 6. Update showScreen hook to also call renderFirstClassSection ─────────────
OLD_HOOK = '''  window.showScreen = function(id) {
    orig(id);
    if (id === 'studio-info') {
      setTimeout(function() {
        renderInstructorBios();
        renderFAQ();
      }, 10);
    }
  };'''

NEW_HOOK = '''  window.showScreen = function(id) {
    orig(id);
    if (id === 'studio-info') {
      setTimeout(function() {
        renderFirstClassSection();
        renderInstructorBios();
        renderFAQ();
      }, 10);
    }
  };'''

assert OLD_HOOK in html, 'showScreen hook not found'
html = html.replace(OLD_HOOK, NEW_HOOK, 1)
print('Updated showScreen hook')

# ── 7. Update demo bar first-timer toggle to also re-render first class section ─
OLD_DEMO_BTN = "onclick=\"isFirstTimer=!isFirstTimer;this.textContent='First-timer: '+(isFirstTimer?'ON':'OFF')\""
NEW_DEMO_BTN = "onclick=\"isFirstTimer=!isFirstTimer;this.textContent='First-timer: '+(isFirstTimer?'ON':'OFF');renderFirstClassSection()\""

assert OLD_DEMO_BTN in html, 'Demo bar first-timer button not found'
html = html.replace(OLD_DEMO_BTN, NEW_DEMO_BTN, 1)
print('Updated demo bar to re-render first class section on toggle')

# ── 8. Write + validate ───────────────────────────────────────────────────────
with open('student-ux.html', 'w') as f:
    f.write(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'\nLines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_si_{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_si_{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: " + r.stderr[:300]}')
print('Done.')
