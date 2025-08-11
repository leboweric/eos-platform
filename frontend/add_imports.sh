#\!/bin/bash

FILES=(
  "src/pages/DashboardClean.jsx"
  "src/pages/IssuesPageClean.jsx"
  "src/pages/MeetingsPage.jsx"
  "src/pages/QuarterlyPrioritiesPageClean.jsx"
  "src/pages/ScorecardPageClean.jsx"
  "src/pages/TodosPage.jsx"
  "src/components/priorities/PriorityCardClean.jsx"
  "src/components/todos/TodosList.jsx"
  "src/components/todos/TodosListClean.jsx"
  "src/components/vto/TwoPagePlanView.jsx"
)

for file in "${FILES[@]}"; do
  echo "Adding import to $file"
  # Add the import after organizationService import
  sed -i '' "/import.*organizationService/a\\
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';" "$file" 2>/dev/null || \
  sed -i '' "/import.*services/a\\
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';" "$file"
done
