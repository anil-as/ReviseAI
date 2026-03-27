import re

filepath = r'd:\MYP\ReviseAI\frontend\src\pages\student\StudentDashboard.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Colors
content = re.sub(r'#111117', 'var(--bg-surface-2)', content)
content = re.sub(r'#09090b', 'var(--bg-surface)', content)
content = re.sub(r'#fafafa', 'var(--text-primary)', content)
content = re.sub(r'#fff', 'var(--text-primary)', content)
content = re.sub(r'#e4e4e7', 'var(--text-primary)', content)
content = re.sub(r'#d4d4d8', 'var(--text-body)', content)
content = re.sub(r'#a1a1aa', 'var(--text-secondary)', content)
content = re.sub(r'#71717a', 'var(--text-muted)', content)
content = re.sub(r'#52525b', 'var(--text-muted)', content)
# rgba colors
content = re.sub(r'rgba\(255,255,255,0\.02\)', 'var(--bg-surface-3)', content)
content = re.sub(r'rgba\(255,255,255,0\.04\)', 'var(--bg-surface-3)', content)
content = re.sub(r'rgba\(255,255,255,0\.05\)', 'var(--border-color)', content)
content = re.sub(r'rgba\(255,255,255,0\.06\)', 'var(--border-color)', content)
content = re.sub(r'rgba\(255,255,255,0\.07\)', 'var(--border-color)', content)
content = re.sub(r'rgba\(255,255,255,0\.08\)', 'var(--border-color)', content)
content = re.sub(r'rgba\(255,255,255,0\.1\)', 'var(--border-bright)', content)
content = re.sub(r'rgba\(255,255,255,0\.12\)', 'var(--border-bright)', content)
content = re.sub(r'rgba\(255,255,255,0\.15\)', 'var(--border-bright)', content)

# Background gradients for banner (turn off dark linear gradients)
content = re.sub(r'linear-gradient\(135deg, rgba\(99,102,241,0\.2\), rgba\(139,92,246,0\.15\)\)', 'var(--bg-surface-3)', content)
content = re.sub(r'linear-gradient\(135deg, #1e1b4b, #312e81\)', 'var(--bg-surface-3)', content)
content = re.sub(r'linear-gradient\(135deg, #7f1d1d, #991b1b\)', 'var(--bg-surface-3)', content)

# Adjust font sizes
content = re.sub(r'fontSize: "0\.6[0-9]rem"', 'fontSize: "0.75rem"', content)
content = re.sub(r'fontSize: "0\.7[0-5]rem"', 'fontSize: "0.80rem"', content)
content = re.sub(r'fontSize: "0\.7[6-9]rem"', 'fontSize: "0.85rem"', content)
content = re.sub(r'fontSize: "0\.8[0-2]rem"', 'fontSize: "0.88rem"', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished replacing styles in StudentDashboard.js")
