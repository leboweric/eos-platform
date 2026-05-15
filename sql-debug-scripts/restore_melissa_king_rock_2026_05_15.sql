-- =====================================================
-- Restore Melissa King's Archived Rock
-- Date: 2026-05-15
-- Org: Boyum & Barenscheer (ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e)
-- User: Melissa King (ab621da7-9846-4ef8-a350-f6e863ec0d69)
-- 
-- Rock was accidentally archived on 2026-05-11 when she
-- was trying to add notes to the goal.
-- 
-- Rock: "Go to one networking event (focus on Women in 
-- Manufacturing) and meet someone new that I will try to 
-- connect with on LinkedIn after."
-- Due: 2026-05-01 (Q1 2026)
-- =====================================================

-- Restore the rock
UPDATE quarterly_priorities
SET deleted_at = NULL
WHERE id = 'e656e257-5d38-49d8-a6c1-9755f5f0a9ac'
AND deleted_at IS NOT NULL;

-- Verify
SELECT id, title, quarter, year, status, due_date, deleted_at
FROM quarterly_priorities
WHERE id = 'e656e257-5d38-49d8-a6c1-9755f5f0a9ac';
