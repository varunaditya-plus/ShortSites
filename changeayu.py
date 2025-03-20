import json
import re

def is_transparent(hex_code):
    """Check if the hex code (RRGGBBAA) has transparency."""
    hex_code = hex_code.lstrip('#')
    if len(hex_code) == 8:
        a = int(hex_code[6:8], 16)
        return a < 255
    return False

def hex_to_rgba(hex_code):
    """Convert hex code to RGBA tuple. Assumes RRGGBBAA if 8 chars, else RRGGBB."""
    hex_code = hex_code.lstrip('#')
    if len(hex_code) == 6:
        # RRGGBB
        r = int(hex_code[0:2], 16)
        g = int(hex_code[2:4], 16)
        b = int(hex_code[4:6], 16)
        a = 255
    elif len(hex_code) == 8:
        # RRGGBBAA
        r = int(hex_code[0:2], 16)
        g = int(hex_code[2:4], 16)
        b = int(hex_code[4:6], 16)
        a = int(hex_code[6:8], 16)
    else:
        raise ValueError(f"Invalid hex code length: {hex_code}")
    return (r, g, b, a)

def rgba_to_hex(r, g, b):
    """Convert RGB tuple to hex code (no alpha)."""
    return f'{r:02X}{g:02X}{b:02X}'

def overlay_color(foreground_hex, background_hex='0E1017'):
    """Overlay the foreground color (potentially transparent) over the background color."""
    # Convert hex codes to RGBA
    fr, fg, fb, fa = hex_to_rgba(foreground_hex)
    br, bg, bb, ba = hex_to_rgba(background_hex)

    # Normalize alpha values to [0,1]
    fa /= 255.0

    # Perform alpha blending: out = fg * fa + bg * (1 - fa)
    r = fr * fa + br * (1 - fa)
    g = fg * fa + bg * (1 - fa)
    b = fb * fa + bb * (1 - fa)

    # Round the components to integers in [0,255]
    r = int(round(r))
    g = int(round(g))
    b = int(round(b))

    # Convert to hex code (fully opaque now)
    return rgba_to_hex(r, g, b)

def find_hex_codes(obj):
    """Recursively search for hex codes in the JSON object and replace transparent hex codes."""
    if isinstance(obj, dict):
        for key in obj:
            obj[key] = find_hex_codes(obj[key])
        return obj
    elif isinstance(obj, list):
        for index, item in enumerate(obj):
            obj[index] = find_hex_codes(item)
        return obj
    elif isinstance(obj, str):
        # Regex pattern to find hex codes (#RRGGBB or #RRGGBBAA)
        pattern = r'(#?[0-9A-Fa-f]{6,8})'
        def replace_hex(match):
            hex_code = match.group(0)
            hex_no_hash = hex_code.lstrip('#')
            if is_transparent(hex_no_hash):
                new_hex = overlay_color(hex_no_hash)
                # Keep the '#' if the original had it
                return ('#' if hex_code.startswith('#') else '') + new_hex
            else:
                return hex_code
        new_str = re.sub(pattern, replace_hex, obj)
        return new_str
    else:
        return obj

# Read the JSON file
with open('static/ayudarkbordered.json', 'r') as f:
    data = json.load(f)

# Process data to replace transparent colors
data = find_hex_codes(data)

# Write the modified data back to the file
with open('static/ayudarkbordered-c.json', 'w') as f:
    json.dump(data, f, indent=4)
