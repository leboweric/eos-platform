-- Fix quarterly_priorities table structure
-- The quarter column should be VARCHAR(2) not INTEGER

-- First, backup any existing data
CREATE TEMP TABLE quarterly_priorities_backup AS 
SELECT * FROM quarterly_priorities;

-- Convert quarter column from INTEGER to VARCHAR(2)
ALTER TABLE quarterly_priorities 
ALTER COLUMN quarter TYPE VARCHAR(2) 
USING CASE 
    WHEN quarter = 1 THEN 'Q1'
    WHEN quarter = 2 THEN 'Q2'
    WHEN quarter = 3 THEN 'Q3'
    WHEN quarter = 4 THEN 'Q4'
    ELSE 'Q1'
END;

-- Add check constraint to ensure valid quarters
ALTER TABLE quarterly_priorities 
ADD CONSTRAINT check_valid_quarter 
CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4'));

-- Restore any data if needed (though it seems empty)
-- INSERT INTO quarterly_priorities SELECT * FROM quarterly_priorities_backup;

-- Clean up
DROP TABLE quarterly_priorities_backup;