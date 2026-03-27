import os
import re

FRONTEND_SRC = r'd:\MYP\ReviseAI\frontend\src'

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Find all <i> tags with malformed style
    # The malformed styles look like: `style={fontSize: 14}` or `style={color: "red", fontSize: 14}}` or `style={marginBottom: 16, opacity: 0.5, fontSize: 48}}`
    
    def replacer(match):
        full_tag = match.group(0)
        # Find style=...
        
        style_match = re.search(r'style=\{([^}]*)\}\}?', full_tag)
        if not style_match:
            return full_tag
            
        inner_content = style_match.group(1).strip()
        
        # If the tag ended up with extra '}' at the end of style=..., strip it from inner_content
        # Actually regex `style=\{([^}]*)\}\}?` captures everything inside the first `{` and `}`.
        # Let's cleanly replace the entire style=... part
        
        # Let's extract the raw style attribute text
        raw_style_attr = re.search(r'style=\{.*?\}?(?:\}|$|\s|\/)', full_tag)
        if not raw_style_attr:
            return full_tag
            
        attr_text = raw_style_attr.group(0)
        # Extract just the CSS properties
        # It could be `style={fontSize: 14}` or `style={color: "red", fontSize: 36}}`
        props_match = re.search(r'style=\{(.*?)\}*$', attr_text.rstrip(' />'))
        if not props_match:
            return full_tag
            
        props = props_match.group(1).strip()
        if props.endswith('}'):
            props = props[:-1].strip()
            
        fixed_style = f'style={{{{{props}}}}}'
        
        # Replace in full_tag
        return full_tag.replace(attr_text.rstrip(' />'), fixed_style)

    # regex to match <i className="fi... " style=... />
    # We will just find all <i className="fi..." ... />
    fixed_content = re.sub(r'<i className="fi [^>]+>', replacer, content)

    if fixed_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Fixed: {filepath}")

for root, dirs, files in os.walk(FRONTEND_SRC):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            fix_file(os.path.join(root, file))

print("Done fixing!")
