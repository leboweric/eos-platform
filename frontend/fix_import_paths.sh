#\!/bin/bash

# Fix component imports (they need ../../utils not ../utils)
echo "Fixing TodosList.jsx"
sed -i '' "s|from '../utils/themeUtils'|from '../../utils/themeUtils'|g" src/components/todos/TodosList.jsx

echo "Fixing TodosListClean.jsx"
sed -i '' "s|from '../utils/themeUtils'|from '../../utils/themeUtils'|g" src/components/todos/TodosListClean.jsx

echo "Fixing PriorityCardClean.jsx"
sed -i '' "s|from '../utils/themeUtils'|from '../../utils/themeUtils'|g" src/components/priorities/PriorityCardClean.jsx

echo "Fixing TwoPagePlanView.jsx"
sed -i '' "s|from '../utils/themeUtils'|from '../../utils/themeUtils'|g" src/components/vto/TwoPagePlanView.jsx

echo "Done\!"
