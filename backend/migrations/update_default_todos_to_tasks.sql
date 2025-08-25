-- Update default todos terminology to be more generic
-- "To-Dos" is casual, "Tasks" is more professional and universal

-- Update the column defaults for new organizations
ALTER TABLE organization_terminology 
ALTER COLUMN todos_label SET DEFAULT 'Tasks',
ALTER COLUMN todo_singular SET DEFAULT 'Task';

-- Update existing organizations that haven't customized from the old default
UPDATE organization_terminology 
SET todos_label = 'Tasks',
    todo_singular = 'Task'
WHERE todos_label = 'To-Dos'
  AND todo_singular = 'To-Do'
  AND business_blueprint_label = '2-Page Plan'; -- Only update generic orgs

-- Ensure EOS organizations keep "To-Dos"
UPDATE organization_terminology 
SET todos_label = 'To-Dos',
    todo_singular = 'To-Do'
WHERE business_blueprint_label = 'V/TO';