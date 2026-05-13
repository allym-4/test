#!/usr/bin/env python3
"""
Replace per-row inline onclick on student rows with data-student-id attr.
Add a single delegated listener on #students-tbody instead.
This avoids potential CSP/inline-handler issues in htmlpreview.
"""
import re, subprocess

with open('admin-founder.html', 'r') as f:
    html = f.read()

# 1. Replace onclick on each <tr class="clickable-row student-row"> with data-student-id
# Pattern: onclick="openStudentDetail(STUDENTS.find(function(x){return x.id==='SOMEID';}))"
pattern = r"""onclick="openStudentDetail\(STUDENTS\.find\(function\(x\)\{return x\.id===\'([^']+)\';\}\)\)"""
def replace_tr_onclick(m):
    sid = m.group(1)
    return f'data-student-id="{sid}"'

html, count = re.subn(pattern, replace_tr_onclick, html)
print(f'Replaced {count} inline student row onclicks with data-student-id')

# 2. Also replace the View button onclicks similarly
# onclick="event.stopPropagation();openStudentDetail(STUDENTS.find(function(x){return x.id==='SOMEID';}))"
pattern2 = r"""onclick="event\.stopPropagation\(\);openStudentDetail\(STUDENTS\.find\(function\(x\)\{return x\.id===\'([^']+)\';\}\)\)"""
def replace_btn_onclick(m):
    sid = m.group(1)
    return f'onclick="event.stopPropagation();openStudentById(\'{sid}\')"'

html, count2 = re.subn(pattern2, replace_btn_onclick, html)
print(f'Replaced {count2} View button onclicks')

# 3. Inject the delegated listener + openStudentById into the last script block (before </body>)
DELEGATION_JS = '''
<script>
// Student row click delegation
function openStudentById(id) {
  var s = STUDENTS.find(function(x){ return x.id === id; });
  if (s) openStudentDetail(s);
}
document.addEventListener('DOMContentLoaded', function() {
  var tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  tbody.addEventListener('click', function(e) {
    var row = e.target.closest('tr[data-student-id]');
    if (!row) return;
    // Don't fire if a button was clicked
    if (e.target.closest('button')) return;
    var id = row.getAttribute('data-student-id');
    if (id) openStudentById(id);
  });
});
</script>
'''

html = html.replace('</body>', DELEGATION_JS + '\n</body>', 1)
print('Added delegation JS')

# Safety checks
assert 'openStudentById' in html
assert 'students-tbody' in html
assert '</body>' in html

with open('admin-founder.html', 'w') as f:
    f.write(html)

# Validate all JS blocks
blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f'Total lines: {len(html.splitlines())}, script blocks: {len(blocks)}')
for i, js in enumerate(blocks):
    with open(f'/tmp/_chksc{i}.js','w') as f: f.write(js)
    r = subprocess.run(['node','--check',f'/tmp/_chksc{i}.js'], capture_output=True, text=True)
    print(f'Block {i}: {"VALID" if r.returncode==0 else "ERROR: "+r.stderr[:200]}')
print('Written.')
