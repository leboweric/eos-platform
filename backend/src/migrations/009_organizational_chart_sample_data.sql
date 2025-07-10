-- Sample data for testing organizational charts
-- This is optional and can be run after the schema migration

BEGIN;

-- Insert sample skills for organizations (you'll need to replace the organization_id with an actual one)
/*
INSERT INTO skills (id, organization_id, name, category, description) VALUES
  (gen_random_uuid(), 'YOUR_ORG_ID', 'JavaScript', 'technical', 'Proficiency in JavaScript programming'),
  (gen_random_uuid(), 'YOUR_ORG_ID', 'React', 'technical', 'Experience with React framework'),
  (gen_random_uuid(), 'YOUR_ORG_ID', 'Leadership', 'leadership', 'Ability to lead and inspire teams'),
  (gen_random_uuid(), 'YOUR_ORG_ID', 'Communication', 'communication', 'Strong verbal and written communication'),
  (gen_random_uuid(), 'YOUR_ORG_ID', 'Project Management', 'leadership', 'Ability to manage complex projects'),
  (gen_random_uuid(), 'YOUR_ORG_ID', 'Data Analysis', 'analytical', 'Skills in analyzing and interpreting data'),
  (gen_random_uuid(), 'YOUR_ORG_ID', 'SQL', 'technical', 'Database querying and management'),
  (gen_random_uuid(), 'YOUR_ORG_ID', 'Strategic Thinking', 'leadership', 'Ability to think strategically'),
  (gen_random_uuid(), 'YOUR_ORG_ID', 'Problem Solving', 'analytical', 'Strong problem-solving abilities');
*/

-- Note: To use this sample data:
-- 1. Replace 'YOUR_ORG_ID' with an actual organization ID from your database
-- 2. Replace 'YOUR_USER_ID' with an actual user ID who will create the chart
-- 3. Uncomment the INSERT statements you want to use

COMMIT;