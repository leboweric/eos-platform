#\!/bin/bash

# List of files to update
FILES=(
  "src/pages/DashboardClean.jsx"
  "src/pages/BusinessBlueprintPage.jsx"
  "src/pages/QuarterlyPrioritiesPageClean.jsx"
  "src/pages/ScorecardPageClean.jsx"
  "src/pages/TodosPage.jsx"
  "src/pages/IssuesPageClean.jsx"
  "src/pages/MeetingsPage.jsx"
  "src/components/vto/TwoPagePlanView.jsx"
  "src/components/priorities/PriorityCardClean.jsx"
  "src/components/todos/TodosList.jsx"
  "src/components/todos/TodosListClean.jsx"
)

for FILE in "${FILES[@]}"; do
  echo "Updating $FILE..."
  
  # Add import if not exists
  if \! grep -q "import { getOrgTheme, saveOrgTheme }" "$FILE"; then
    # Find the line with organizationService import and add after it
    sed -i '' "/import.*organizationService/a\\
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';" "$FILE" 2>/dev/null || \
    sed -i '' "/^import.*from '\.\.\/services\//a\\
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';" "$FILE" 2>/dev/null || \
    sed -i '' "1a\\
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';" "$FILE"
  fi
  
  echo "Added import to $FILE"
done

echo "Done\!"
