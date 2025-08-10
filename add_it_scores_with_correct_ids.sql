-- =====================================================
-- Add IT Team Scores Using Correct Metric IDs
-- =====================================================
-- This version uses the actual metric IDs from your database

BEGIN;

DO $$
DECLARE
    v_count INTEGER;
    v_added INTEGER := 0;
BEGIN
    RAISE NOTICE 'Adding IT Team scorecard data using exact metric IDs...';

    -- Week: Jul 28, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-07-28';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-07-28', 0, NOW(), NOW()),  -- Automation - Completed
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-07-28', 1, NOW(), NOW()),  -- Automation - In Progress
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-07-28', 0, NOW(), NOW()),  -- Automation - Suggestions
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-07-28', 0, NOW(), NOW()),  -- CSAT - Neutral/Negative
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-07-28', 0, NOW(), NOW()),  -- CSAT - Positive
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-07-28', 29, NOW(), NOW()), -- Tickets per week
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-07-28', 6, NOW(), NOW()),  -- Tickets: < 5-days old
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-07-28', 1, NOW(), NOW()),  -- Tickets: >30-days old
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-07-28', 0, NOW(), NOW()),  -- After Hours Tickets
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-07-28', 0, NOW(), NOW()),  -- Saturday Morning Tickets
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-07-28', 8, NOW(), NOW()),  -- Individual - Helpdesk Hours (Target: 10)
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-07-28', 0, NOW(), NOW()),  -- Individual - Helpdesk Hours (Target: 8) - using the third one
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-07-28', 47, NOW(), NOW()), -- Individual - Daily touchpoints on tickets
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-07-28', 1, NOW(), NOW()),  -- FreshService IT Documents
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-07-28', 1, NOW(), NOW());  -- FreshService Staff Articles
    
    GET DIAGNOSTICS v_added = ROW_COUNT;
    v_count := v_count + v_added;
    RAISE NOTICE 'Added % scores for Jul 28, 2025', v_added;

    -- Week: Jul 21, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-07-21';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-07-21', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-07-21', 1, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-07-21', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-07-21', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-07-21', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-07-21', 31, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-07-21', 4, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-07-21', 2, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-07-21', 0, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-07-21', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-07-21', 3.25, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-07-21', 0, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-07-21', 36, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-07-21', 1, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-07-21', 0, NOW(), NOW());

    -- Week: Jul 14, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-07-14';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-07-14', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-07-14', 1, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-07-14', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-07-14', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-07-14', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-07-14', 24, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-07-14', 4, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-07-14', 2, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-07-14', 0, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-07-14', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-07-14', 2.75, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-07-14', 5, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-07-14', 60, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-07-14', 2, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-07-14', 1, NOW(), NOW());

    -- Week: Jul 07, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-07-07';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-07-07', 1, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-07-07', 1, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-07-07', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-07-07', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-07-07', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-07-07', 27, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-07-07', 3, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-07-07', 1, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-07-07', 1, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-07-07', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-07-07', 9, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-07-07', 5, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-07-07', 82, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-07-07', 10, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-07-07', 4, NOW(), NOW());

    -- Week: Jun 30, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-06-30';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-06-30', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-06-30', 0, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-06-30', 1, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-06-30', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-06-30', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-06-30', 15, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-06-30', 7, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-06-30', 4, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-06-30', 2, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-06-30', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-06-30', 5, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-06-30', 1, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-06-30', 75, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-06-30', 0, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-06-30', 0, NOW(), NOW());

    -- Week: Jun 23, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-06-23';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-06-23', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-06-23', 1, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-06-23', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-06-23', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-06-23', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-06-23', 30, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-06-23', 5, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-06-23', 1, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-06-23', 3, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-06-23', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-06-23', 0, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-06-23', 0, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-06-23', 90, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-06-23', 3, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-06-23', 4, NOW(), NOW());

    -- Week: Jun 16, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-06-16';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-06-16', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-06-16', 0, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-06-16', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-06-16', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-06-16', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-06-16', 9, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-06-16', 5, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-06-16', 1, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-06-16', 1, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-06-16', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-06-16', 8.25, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-06-16', 0, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-06-16', 13, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-06-16', 0, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-06-16', 0, NOW(), NOW());

    -- Week: Jun 09, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-06-09';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-06-09', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-06-09', 0, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-06-09', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-06-09', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-06-09', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-06-09', 36, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-06-09', 5, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-06-09', 1, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-06-09', 1, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-06-09', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-06-09', 12.5, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-06-09', 2.5, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-06-09', 17, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-06-09', 1, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-06-09', 0, NOW(), NOW());

    -- Week: Jun 02, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-06-02';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-06-02', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-06-02', 0, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-06-02', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-06-02', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-06-02', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-06-02', 40, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-06-02', 4, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-06-02', 0, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-06-02', 0, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-06-02', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-06-02', 14.5, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-06-02', 2, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-06-02', 71, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-06-02', 9, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-06-02', 0, NOW(), NOW());

    -- Week: May 26, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-05-26';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-05-26', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-05-26', 1, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-05-26', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-05-26', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-05-26', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-05-26', 20, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-05-26', 4, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-05-26', 0, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-05-26', 2, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-05-26', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-05-26', 17.5, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-05-26', 0, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-05-26', 59, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-05-26', 6, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-05-26', 1, NOW(), NOW());

    -- Week: May 19, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-05-19';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-05-19', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-05-19', 0, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-05-19', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-05-19', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-05-19', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-05-19', 32, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-05-19', 6, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-05-19', 1, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-05-19', 1, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-05-19', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-05-19', 12.5, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-05-19', 0, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-05-19', 42, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-05-19', 0, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-05-19', 3, NOW(), NOW());

    -- Week: May 12, 2025
    DELETE FROM scorecard_scores WHERE metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    ) AND week_date = '2025-05-12';
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    ('ac293085-5428-47c8-88cf-c7c172129a9a', '2025-05-12', 0, NOW(), NOW()),
    ('f1d3d94a-11e8-4422-82b6-9e211154d4d1', '2025-05-12', 0, NOW(), NOW()),
    ('350bd53a-ba0d-419f-a00c-efde120e699c', '2025-05-12', 0, NOW(), NOW()),
    ('cbff966e-3e9d-4101-aebe-b0553c316c19', '2025-05-12', 0, NOW(), NOW()),
    ('1201fb63-a62e-4e48-b31d-77dace2d2ddc', '2025-05-12', 0, NOW(), NOW()),
    ('2fb5a6d5-65df-418e-856b-c00fa5082870', '2025-05-12', 22, NOW(), NOW()),
    ('3a22c72e-508d-4f02-b5c8-4b5de9b5d4fc', '2025-05-12', 2, NOW(), NOW()),
    ('889f5e45-1281-47d9-bba7-a1cd42696cf5', '2025-05-12', 1, NOW(), NOW()),
    ('030138a9-6079-42c1-9314-e5932d408195', '2025-05-12', 0, NOW(), NOW()),
    ('c1cb4138-2508-4c67-baef-9b8a212c7d72', '2025-05-12', 0, NOW(), NOW()),
    ('c91f1281-92e5-49c4-93d8-5ae32bf31f97', '2025-05-12', 4.5, NOW(), NOW()),
    ('aef90609-fd37-49a9-86de-7dd300014544', '2025-05-12', 0, NOW(), NOW()),
    ('8b3df977-865d-4334-9292-91c7a324d4d9', '2025-05-12', 58, NOW(), NOW()),
    ('43548534-7701-43d5-8c4d-ada98c7de974', '2025-05-12', 0, NOW(), NOW()),
    ('86f4f256-810a-4f62-9c00-9f9e4c0f16f8', '2025-05-12', 2, NOW(), NOW());

    -- Count total scores added
    SELECT COUNT(DISTINCT ss.week_date) INTO v_count
    FROM scorecard_scores ss
    WHERE ss.metric_id IN (
        SELECT id FROM scorecard_metrics WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
    );
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Successfully added data for % weeks', v_count;
    RAISE NOTICE '=====================================================';

END $$;

COMMIT;

-- Verify the data was added
SELECT 
    ss.week_date,
    TO_CHAR(ss.week_date, 'Mon DD, YYYY') as formatted_date,
    COUNT(*) as metrics_with_scores
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
GROUP BY ss.week_date
ORDER BY ss.week_date DESC;