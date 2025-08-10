-- Add Boyum Team To-Dos
-- First, let's get the organization ID and team members

DO $$
DECLARE
  v_org_id UUID;
  v_team_id UUID;
  v_patty_id UUID;
  v_becky_id UUID;
  v_stacy_id UUID;
  v_priority_500k_id UUID;
  v_priority_training_id UUID;
  v_priority_organizer_id UUID;
  v_priority_bd_plans_id UUID;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  
  -- Get Leadership Team ID
  v_team_id := '00000000-0000-0000-0000-000000000000';
  
  -- Get user IDs
  SELECT id INTO v_patty_id FROM users WHERE email = 'patty@boyumcpa.com';
  SELECT id INTO v_becky_id FROM users WHERE email = 'becky.gibbs@boyumcpa.com';
  SELECT id INTO v_stacy_id FROM users WHERE email = 'stacy.shaw@boyumcpa.com';
  
  -- Get priority IDs
  SELECT id INTO v_priority_500k_id FROM quarterly_priorities 
  WHERE organization_id = v_org_id 
  AND title LIKE '$500K of new revenue from OB3%';
  
  SELECT id INTO v_priority_training_id FROM quarterly_priorities 
  WHERE organization_id = v_org_id 
  AND title LIKE '%Training on how to sell the OB3%';
  
  SELECT id INTO v_priority_organizer_id FROM quarterly_priorities 
  WHERE organization_id = v_org_id 
  AND title LIKE '%Develop an Organizer Process%';
  
  SELECT id INTO v_priority_bd_plans_id FROM quarterly_priorities 
  WHERE organization_id = v_org_id 
  AND title LIKE '%Create Business Development plans/templates%';
  
  -- Add todos linked to Rock "$500K of new revenue from OB3"
  INSERT INTO todos (id, organization_id, team_id, owner_id, assigned_to_id, title, description, due_date, priority, status, related_priority_id)
  VALUES 
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Develop a recognition program', 
   'Rock $500K of new revenue from OB3 > Milestone', 
   '2025-08-01', 'high', 'incomplete', v_priority_500k_id),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Discussion points for firm growth meeting', 
   'Rock $500K of new revenue from OB3 > Milestone', 
   '2025-08-01', 'high', 'incomplete', v_priority_500k_id),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Contact Referral Sources (All)', 
   'Rock $500K of new revenue from OB3 > Milestone', 
   '2025-08-08', 'high', 'incomplete', v_priority_500k_id),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Develop WIP Thermometer', 
   'Rock $500K of new revenue from OB3 > Milestone', 
   '2025-08-12', 'medium', 'incomplete', v_priority_500k_id);
  
  -- Add todo linked to Training Rock
  IF v_priority_training_id IS NOT NULL THEN
    INSERT INTO todos (id, organization_id, team_id, owner_id, assigned_to_id, title, description, due_date, priority, status, related_priority_id)
    VALUES 
    (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
     'Prepare for and have training with all staff', 
     'Rock Training on how to sell the OB3 > Milestone', 
     '2025-08-08', 'high', 'incomplete', v_priority_training_id);
  END IF;
  
  -- Add todo linked to Organizer Process Rock
  INSERT INTO todos (id, organization_id, team_id, owner_id, assigned_to_id, title, description, due_date, priority, status, related_priority_id)
  VALUES 
  (gen_random_uuid(), v_org_id, v_team_id, v_becky_id, v_becky_id, 
   'Connect with Becky', 
   'Rock Develop an Organizer Process and Engagement letter process > Milestone', 
   '2025-08-11', 'high', 'incomplete', v_priority_organizer_id);
  
  -- Add todo linked to Business Development plans Rock
  INSERT INTO todos (id, organization_id, team_id, owner_id, assigned_to_id, title, description, due_date, priority, status, related_priority_id)
  VALUES 
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Pat, Jake, Ashley, Anna, Becky to meet with Patty monthly', 
   'Rock Create Business Development plans/templates for team > Milestone', 
   '2025-08-15', 'high', 'incomplete', v_priority_bd_plans_id);
  
  -- Add standalone todos (not linked to specific rocks)
  INSERT INTO todos (id, organization_id, team_id, owner_id, assigned_to_id, title, description, due_date, priority, status)
  VALUES 
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'FLSA conversion: Follow up w/ Leslie', 
   'Is there a way to build this back to advisory?', 
   '2025-08-15', 'medium', 'incomplete'),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Ensure all staff have Rocks', 
   '', 
   '2025-08-15', 'high', 'incomplete'),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_becky_id, v_becky_id, 
   'Ensure all staff have Rocks', 
   '', 
   '2025-08-15', 'high', 'incomplete'),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_stacy_id, v_stacy_id, 
   'Ensure all staff have Rocks', 
   '', 
   '2025-08-15', 'high', 'incomplete'),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'With moving to trimesters for L10s, are we changing the manager bonus formula to follow for Rock purposes?', 
   '', 
   '2025-12-01', 'medium', 'incomplete'),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Ask Gregg Stansbury about WM data', 
   '', 
   '2025-08-11', 'medium', 'incomplete'),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Leadership Team Meeting 8/18: reschedule to 3pm CT', 
   '', 
   '2025-08-11', 'high', 'incomplete'),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'Culture Cohort - Cultures of Strategic Agility', 
   '', 
   '2025-08-04', 'medium', 'incomplete'),
  
  (gen_random_uuid(), v_org_id, v_team_id, v_patty_id, v_patty_id, 
   'AI Survey: Let Ashley Know about Survey', 
   '', 
   '2025-08-11', 'medium', 'incomplete');
  
  RAISE NOTICE 'Successfully added % todos for Boyum Barenscheer', 16;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding todos: %', SQLERRM;
    RAISE;
END $$;