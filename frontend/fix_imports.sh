#\!/bin/bash

FILES=(
  "src/pages/DashboardClean.jsx"
  "src/pages/IssuesPageClean.jsx"
  "src/pages/MeetingsPage.jsx"
  "src/pages/ScorecardPageClean.jsx"
  "src/pages/TodosPage.jsx"
  "src/components/priorities/PriorityCardClean.jsx"
  "src/components/todos/TodosList.jsx"
  "src/components/todos/TodosListClean.jsx"
  "src/components/vto/TwoPagePlanView.jsx"
)

for file in "${FILES[@]}"; do
  echo "Fixing import in $file"
  # Fix the concatenated imports
  sed -i '' "s/from '..\/utils\/themeUtils';import/from '..\/utils\/themeUtils';\nimport/g" "$file"
done
