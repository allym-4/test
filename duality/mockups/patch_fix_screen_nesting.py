#!/usr/bin/env python3
"""
screen-recommendations, screen-assistant, screen-stub, screen-action-log
were accidentally placed outside </div><!-- end .content --> and
</div><!-- end .main -->, so they rendered outside the styled content
area (no padding, wrong layout, outside visible boundaries).

Fix: extract those 4 screens, re-insert them inside .content, then
properly close .content and .main after them.
"""
import re, subprocess

with open('admin-founder.html') as f:
    html = f.read()

CONTENT_CLOSE = '</div><!-- end .content -->'
MAIN_CLOSE    = '</div><!-- end .main -->'

assert CONTENT_CLOSE in html, 'content close marker missing'
assert MAIN_CLOSE    in html, 'main close marker missing'

# ── 1. Identify and extract the four orphaned screens ────────────────────────
# We grab everything from the first screen start to the last screen end
# (which is the </div> that closes screen-action-log).

first_marker = '<div id="screen-recommendations" class="screen">'
first_pos = html.find(first_marker)
assert first_pos != -1

# Find the end of screen-action-log by tracking div depth from its start
last_marker = '<div id="screen-action-log" class="screen">'
last_start = html.find(last_marker)
assert last_start != -1

# Walk from last_start to find its closing </div>
depth = 0
i = last_start
while i < len(html):
    if html[i:i+4] == '<div':
        depth += 1
        i += 4
    elif html[i:i+6] == '</div>':
        depth -= 1
        if depth == 0:
            last_end = i + 6  # include the </div>
            break
        i += 6
    else:
        i += 1

orphaned_block = html[first_pos:last_end]
print(f'Orphaned block: lines {html[:first_pos].count(chr(10))+1}–{html[:last_end].count(chr(10))+1}')

# ── 2. Remove orphaned block from current position ───────────────────────────
# Also strip any whitespace/blank lines immediately around it
# Find from first_pos back to nearest newline, forward to nearest non-blank line
remove_start = html.rfind('\n', 0, first_pos) + 1   # start of line
# Find end of last_end line including trailing newline
remove_end = last_end
while remove_end < len(html) and html[remove_end] in ' \t\n':
    remove_end += 1

html = html[:remove_start] + html[remove_end:]
print('Removed orphaned screens from original positions')

# ── 3. Reinsert inside .content, just before its closing tag ─────────────────
# After removal, the content close marker is still in the html
cc_pos = html.find(CONTENT_CLOSE)
assert cc_pos != -1

insertion = '\n' + orphaned_block + '\n\n  '
html = html[:cc_pos] + insertion + html[cc_pos:]
print('Re-inserted orphaned screens inside .content')

# ── 4. Safety checks ─────────────────────────────────────────────────────────
assert 'screen-recommendations' in html
assert 'screen-assistant'       in html
assert 'screen-stub'            in html
assert 'screen-action-log'      in html
assert CONTENT_CLOSE            in html
assert MAIN_CLOSE               in html
assert '</body>'                in html

# Verify screens now appear BEFORE the content close
for sid in ['recommendations', 'assistant', 'stub', 'action-log']:
    marker = f'id="screen-{sid}"'
    sc_pos = html.find(marker)
    cc_pos2 = html.find(CONTENT_CLOSE)
    assert sc_pos < cc_pos2, f'screen-{sid} is still outside .content!'
    print(f'  screen-{sid}: inside .content ✓')

with open('admin-founder.html', 'w') as f:
    f.write(html)

# ── 5. Validate all JS blocks ─────────────────────────────────────────────────
blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chkfn{i}.js', 'w') as f: f.write(js)
    r = subprocess.run(['node', '--check', f'/tmp/_chkfn{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: "+r.stderr[:300]}')
print('Written.')
