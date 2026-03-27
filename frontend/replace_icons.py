import os
import re

FRONTEND_SRC = r'd:\MYP\ReviseAI\frontend\src'

# Map react-icons to freestanding UIcons class
ICON_MAP = {
    'FiBell': 'fi fi-rr-bell',
    'FiBook': 'fi fi-rr-book',
    'FiClipboard': 'fi fi-rr-clipboard',
    'FiClock': 'fi fi-rr-time-fast',
    'FiTarget': 'fi fi-rr-bullseye',
    'FiAlertTriangle': 'fi fi-rr-triangle-warning',
    'FiCalendar': 'fi fi-rr-calendar',
    'FiChevronRight': 'fi fi-rr-angle-right',
    'FiLock': 'fi fi-rr-lock',
    'FiCheckCircle': 'fi fi-rr-check-circle',
    'FiPlayCircle': 'fi fi-rr-play-circle',
    'FiAlertCircle': 'fi fi-rr-info',
    'FiX': 'fi fi-rr-cross',
    'FiZap': 'fi fi-rr-bolt',
    'FiStar': 'fi fi-rr-star',
    'FiTrendingUp': 'fi fi-rr-arrow-trend-up',
    'MdMenuBook': 'fi fi-rr-book-alt',
    'MdOutlineAssignment': 'fi fi-rr-document',
    'FiArrowLeft': 'fi fi-rr-arrow-left',
    'FiMessageCircle': 'fi fi-rr-comment',
    'FiSun': 'fi fi-rr-brightness',
    'FiMoon': 'fi fi-rr-moon',
    'FiMoreVertical': 'fi fi-rr-menu-dots-vertical',
    'FiEdit2': 'fi fi-rr-edit',
    'FiTrash2': 'fi fi-rr-trash',
    'FiUsers': 'fi fi-rr-users'
}

def replace_icons_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Remove react-icons imports
    content = re.sub(r'import\s+\{.*?\}\s+from\s+["\']react-icons/[^"\']+["\'];?\s*', '', content, flags=re.DOTALL)

    # Simple regex to replace <IconName ... /> or <IconName>
    for icon_name, uicon_class in ICON_MAP.items():
        # Match <IconName size={10} color="red" />
        # and replace with <i className="uicon_class" style={{ fontSize: 10, color: "red" }} />
        # It's tricky with React props, but mostly we have `size={...}` or `style={{...}}`.
        
        def replacer(match):
            props = match.group(1)
            # convert size={15} to fontSize: 15 in style
            style_parts = []
            
            # Extract size
            size_match = re.search(r'size=\{?([\w\.]+)\}?', props)
            if size_match:
                size_val = size_match.group(1)
                # If it's a number string
                if size_val.isdigit():
                    style_parts.append(f'fontSize: {size_val}')
                else:
                    style_parts.append(f'fontSize: {size_val}')
                props = re.sub(r'size=\{?[\w\.]+\}?', '', props)

            # extract color
            color_match = re.search(r'color=\{?(["\'\w\#\.]+)\}?', props)
            if color_match:
                color_val = color_match.group(1)
                style_parts.append(f'color: {color_val}')
                props = re.sub(r'color=\{?(?:["\'\w\#\.]+)\}?', '', props)
                
            # check if there's already a style prop
            style_str = ""
            existing_style = re.search(r'style=\{\{(.*?)\}\}', props)
            if existing_style:
                inner = existing_style.group(1).strip()
                if inner and not inner.endswith(','): inner += ','
                style_str = f'style={{{inner} ' + ', '.join(style_parts) + '}}'
                props = re.sub(r'style=\{\{.*?\}\}', '', props)
            elif style_parts:
                style_str = f'style={{{", ".join(style_parts)}}}'

            # Build new tag
            new_tag = f'<i className="{uicon_class}" {props} {style_str} />'
            # Clean up double spaces
            new_tag = re.sub(r'\s+', ' ', new_tag).replace(' />', '/>')
            return new_tag

        pattern = r'<' + icon_name + r'\s+([^>]*?)/>'
        content = re.sub(pattern, replacer, content)

        # Handle <IconName> ... </IconName> (rare for these icons but just in case)
        # Actually usually they are self-closing
        
        # We also need to catch cases where the icon is passed as a prop without enclosing JSX, e.g., icon={MdMenuBook}
        # In StudentDashboard.js: icon={MdMenuBook} -> iconClass="fi fi-rr-book-alt"
        content = re.sub(r'icon=\{\s*' + icon_name + r'\s*\}', f'iconClass="{uicon_class}"', content)

    # Custom fix for StudentDashboard TabBtn definition
    if 'StudentDashboard.js' in filepath:
        content = content.replace(
            'const TabBtn = ({ id, label, icon: Icon, count, urgent }) => (',
            'const TabBtn = ({ id, label, iconClass, count, urgent }) => ('
        )
        content = content.replace(
            '<Icon size={14} />',
            '<i className={iconClass} style={{ fontSize: 14 }} />'
        )

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for root, dirs, files in os.walk(FRONTEND_SRC):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            replace_icons_in_file(os.path.join(root, file))

print("Done!")
