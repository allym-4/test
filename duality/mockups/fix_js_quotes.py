#!/usr/bin/env python3
"""Fix all unescaped apostrophes in single-quoted JS strings in admin-founder.html."""
import re, subprocess, sys

with open('admin-founder.html', 'r') as f:
    html = f.read()

# Extract the script block boundaries
script_match = re.search(r'(<script>)(.*?)(</script>)', html, re.DOTALL)
if not script_match:
    print("ERROR: no script block found")
    sys.exit(1)

pre = html[:script_match.start()]
script_open = script_match.group(1)
js = script_match.group(2)
script_close = script_match.group(3)
post = html[script_match.end():]

def node_check(js_code):
    with open('/tmp/_check.js', 'w') as f:
        f.write(js_code)
    r = subprocess.run(['node', '--check', '/tmp/_check.js'], capture_output=True, text=True)
    if r.returncode == 0:
        return None
    # Extract line number from error
    m = re.search(r'/tmp/_check\.js:(\d+)', r.stderr)
    lineno = int(m.group(1)) if m else None
    return lineno, r.stderr.strip()

MAX_ITERS = 30
for iteration in range(MAX_ITERS):
    result = node_check(js)
    if result is None:
        print(f"JS is VALID after {iteration} fixes")
        break
    lineno, err = result
    if lineno is None:
        print(f"ERROR (no line number): {err}")
        break

    lines = js.split('\n')
    bad_line = lines[lineno - 1]
    print(f"Iter {iteration+1}: fixing line {lineno}: {bad_line.strip()[:100]}")

    # Strategy: find single-quoted strings with unescaped apostrophes
    # and escape the apostrophes
    # Match: '...' where ... contains unescaped '
    def fix_single_quoted_strings(line):
        # Try replacing outer single quotes with double quotes if no double quotes inside
        # Work character by character to find strings
        result = []
        i = 0
        while i < len(line):
            if line[i] == "'" and (i == 0 or line[i-1] != '\\'):
                # Start of single-quoted string - find the end
                j = i + 1
                while j < len(line):
                    if line[j] == '\\':
                        j += 2  # skip escaped char
                        continue
                    if line[j] == "'":
                        break
                    j += 1
                string_content = line[i+1:j]
                # Check if content has apostrophes that would break it
                # i.e., check if there's a ' that's not preceded by \
                has_apostrophe = bool(re.search(r"(?<!\\)'", string_content))
                has_double_quote = '"' in string_content
                if has_apostrophe and not has_double_quote:
                    # Use double quotes instead
                    result.append('"' + string_content + '"')
                elif has_apostrophe and has_double_quote:
                    # Escape the apostrophes
                    fixed = re.sub(r"(?<!\\)'", "\\'", string_content)
                    result.append("'" + fixed + "'")
                else:
                    result.append(line[i:j+1])
                i = j + 1
            else:
                result.append(line[i])
                i += 1
        return ''.join(result)

    fixed_line = fix_single_quoted_strings(bad_line)
    lines[lineno - 1] = fixed_line
    js = '\n'.join(lines)
else:
    print(f"WARNING: still errors after {MAX_ITERS} iterations")

# Write back
html = pre + script_open + js + script_close + post
with open('admin-founder.html', 'w') as f:
    f.write(html)
print("Done. Written admin-founder.html")
