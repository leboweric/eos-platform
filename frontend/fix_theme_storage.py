#\!/usr/bin/env python3
import re
import os

files_to_update = [
    "src/pages/BusinessBlueprintPage.jsx",
    "src/pages/QuarterlyPrioritiesPageClean.jsx",
    "src/pages/ScorecardPageClean.jsx",
    "src/pages/TodosPage.jsx",
    "src/pages/IssuesPageClean.jsx",
    "src/pages/MeetingsPage.jsx",
    "src/components/vto/TwoPagePlanView.jsx",
    "src/components/priorities/PriorityCardClean.jsx",
    "src/components/todos/TodosList.jsx",
    "src/components/todos/TodosListClean.jsx"
]

for filepath in files_to_update:
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
        
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if file has user context available
    has_user = 'useAuthStore' in content or 'user' in content
    
    # Replace localStorage.getItem('orgTheme')
    if has_user:
        content = re.sub(
            r"const savedTheme = localStorage\.getItem\('orgTheme'\);",
            "const orgId = user?.organizationId || user?.organization_id;\n      const savedTheme = getOrgTheme(orgId);",
            content
        )
    else:
        # For components without user context, get orgId from localStorage
        content = re.sub(
            r"const savedTheme = localStorage\.getItem\('orgTheme'\);",
            "const orgId = localStorage.getItem('organizationId');\n      const savedTheme = getOrgTheme(orgId);",
            content
        )
    
    # Replace JSON.parse for saved theme
    content = re.sub(
        r"const parsedTheme = JSON\.parse\(savedTheme\);\s*setThemeColors\(parsedTheme\);",
        "setThemeColors(savedTheme);",
        content
    )
    
    # Replace localStorage.setItem('orgTheme', ...)
    if has_user:
        content = re.sub(
            r"localStorage\.setItem\('orgTheme', JSON\.stringify\(theme\)\);",
            "saveOrgTheme(orgId, theme);",
            content
        )
    else:
        content = re.sub(
            r"localStorage\.setItem\('orgTheme', JSON\.stringify\(theme\)\);",
            "const orgId = localStorage.getItem('organizationId');\n        saveOrgTheme(orgId, theme);",
            content
        )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Updated: {filepath}")

print("Done\!")
