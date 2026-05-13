#!/usr/bin/env python3
"""Add data-level/teacher/enrolled/waitlist attrs to each tt-season-view row."""
import re, subprocess

with open('admin-founder.html', 'r') as f:
    html = f.read()

# Each row in tt-season-view looks like:
# <div style="background:#111;border:...;border-radius:10px;">
#   <div style="...cursor:pointer;" onclick="openSeasonClassDetail('NAME','SLOT','TEACHER','ROOM',ENROLLED,CAP,WAITLIST)">

rows_data = [
    ("Level 1",          "Chloe", 10, 12, 1),
    ("Level 2",          "Chloe", 15, 15, 3),
    ("High Tricks",      "Mimi",   8, 10, 0),
    ("Inter Floor",      "Viv",    6, 10, 0),
    ("Level 3",          "Chloe",  5, 12, 0),
    ("Level 1",          "Jaz",    9, 12, 2),
    ("Level 3",          "Mimi",   7, 10, 0),
    ("Level 2",          "Jaz",   11, 12, 0),
    ("Strip Virgin",     "Viv",    9, 12, 2),
    ("Dance",            "Viv",    8, 10, 0),
    ("Inter Floor",      "Viv",    4, 10, 0),
    ("Choreo Intensive", "Mimi",   7, 10, 0),
]

# For each row, find the onclick and add data attrs to the surrounding outer div
for name, teacher, enrolled, cap, waitlist in rows_data:
    # The onclick string for this row
    onclick_str = f"openSeasonClassDetail('{name}','"
    # Find it in the tt-season-view block only
    sv_start = html.find('<div id="tt-season-view"')
    if sv_start == -1:
        print(f"  ✗ Could not find tt-season-view")
        break
    idx = html.find(onclick_str, sv_start)
    if idx == -1:
        print(f"  ✗ MISSING onclick for {name}/{teacher}")
        continue

    # Walk backwards to find the outermost container div for this row
    # It's two <div> levels up from the onclick div
    # The outer div looks like: <div style="background:#111;border:
    # Search backwards for it
    outer_start = html.rfind('<div style="background:#111;border:', sv_start, idx)
    if outer_start == -1:
        print(f"  ✗ Could not find outer div for {name}/{teacher}")
        continue

    # Check if it already has data-level
    chunk = html[outer_start:outer_start+200]
    if 'data-level' in chunk:
        print(f"  ~ Already has data-level: {name}/{teacher}")
        continue

    # Insert data attrs into this div
    old_div = html[outer_start:outer_start+40]  # enough to match the opening
    new_div = f'<div data-level="{name}" data-teacher="{teacher}" data-enrolled="{enrolled}" data-waitlist="{waitlist}" style="background:#111;border:'
    html = html[:outer_start] + new_div + html[outer_start + len('<div style="background:#111;border:'):]
    print(f"  ✓ Added data attrs: {name}/{teacher} ({enrolled}/{cap}, waitlist:{waitlist})")

with open('admin-founder.html', 'w') as f:
    f.write(html)

# Validate JS
script_match = __import__('re').search(r'<script>(.*?)</script>', html, __import__('re').DOTALL)
js = script_match.group(1) if script_match else ''
with open('/tmp/_check_b4b.js', 'w') as f:
    f.write(js)
r = subprocess.run(['node', '--check', '/tmp/_check_b4b.js'], capture_output=True, text=True)
print('JS VALID' if r.returncode == 0 else 'JS ERROR: ' + r.stderr[:300])

count = html.count('data-level=')
print(f"Total data-level attrs found: {count}")
