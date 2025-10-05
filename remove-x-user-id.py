#!/usr/bin/env python3
"""
Script to remove x-user-id headers from client-side fetch calls.
This is needed because browsers block custom headers for security reasons.
The middleware will automatically add x-user-id from the session cookie.
"""

import re
import sys

def remove_x_user_id_headers(content):
    """Remove x-user-id from headers objects in fetch calls."""
    
    # Pattern 1: headers with only x-user-id
    # headers: { 'x-user-id': user.id }  ->  (remove entire headers object)
    pattern1 = r"headers:\s*\{\s*'x-user-id':\s*user\??\.id\s*(?:\|\|\s*'')?\s*\},?\s*\n"
    content = re.sub(pattern1, '', content)
    
    # Pattern 2: headers with Content-Type and x-user-id
    # Remove just the x-user-id line
    pattern2 = r",?\s*\n\s*'x-user-id':\s*user\??\.id\s*(?:\|\|\s*'')?\s*,?"
    content = re.sub(pattern2, '', content)
    
    # Pattern 3: Clean up empty headers objects
    pattern3 = r"headers:\s*\{\s*\},?\s*\n"
    content = re.sub(pattern3, '', content)
    
    # Pattern 4: Clean up trailing commas in headers
    pattern4 = r"(\{\s*'Content-Type':\s*'application/json'),\s*\n\s*\}"
    content = re.sub(pattern4, r"\1\n        }", content)
    
    return content

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 remove-x-user-id.py <file>")
        sys.exit(1)
    
    filename = sys.argv[1]
    
    try:
        with open(filename, 'r') as f:
            content = f.read()
        
        new_content = remove_x_user_id_headers(content)
        
        if content != new_content:
            with open(filename, 'w') as f:
                f.write(new_content)
            print(f"✓ Fixed {filename}")
        else:
            print(f"- No changes needed in {filename}")
    
    except Exception as e:
        print(f"✗ Error processing {filename}: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

