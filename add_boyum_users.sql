-- =====================================================
-- Add All Boyum Users for pgAdmin
-- Default password: Abc123!@# (hashed)
-- Email format: first_initial + lastname@myboyum.com
-- Roles: Managers/Owners/Admins -> admin, Others -> member
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    leadership_team_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
    password_hash VARCHAR := '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq'; -- Abc123!@#
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    RAISE NOTICE 'Adding users to Boyum Organization ID: %', org_id;

    -- Insert ALL users with correct email format (first initial + last name)
    -- Using ON CONFLICT to skip if email already exists
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES
    (gen_random_uuid(), 'akern@myboyum.com', password_hash, 'Alex', 'Kern', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'atheobald@myboyum.com', password_hash, 'Alex', 'Theobald', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'ahansen@myboyum.com', password_hash, 'Ali', 'Hansen', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'aswenson@myboyum.com', password_hash, 'Amy', 'Swenson', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'amuntifering@myboyum.com', password_hash, 'Andy', 'Muntifering', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'ahuynh@myboyum.com', password_hash, 'Anna', 'Huynh', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'alovegren@myboyum.com', password_hash, 'Anna', 'Lovegren', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'aroche@myboyum.com', password_hash, 'Anthony', 'Roche', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'asparks@myboyum.com', password_hash, 'Ashley', 'Sparks', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'bsawdy@myboyum.com', password_hash, 'Barb', 'Sawdy', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'bhardt@myboyum.com', password_hash, 'Barry', 'Hardt', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'bgibbs@myboyum.com', password_hash, 'Becky', 'Gibbs', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'bjensen@myboyum.com', password_hash, 'Ben', 'Jensen', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'bdavis@myboyum.com', password_hash, 'Beth', 'Davis', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'bkayl@myboyum.com', password_hash, 'Bill', 'Kayl', 'member', org_id, NOW(), NOW()),
    -- Skip bletourneau@myboyum.com (Inactive user with incomplete data)
    (gen_random_uuid(), 'bdunigan@myboyum.com', password_hash, 'Brandon', 'Dunigan', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'bmccollough@myboyum.com', password_hash, 'Brenda', 'McCollough', 'admin', org_id, NOW(), NOW()), -- Owner
    (gen_random_uuid(), 'bheintz@myboyum.com', password_hash, 'Bridget', 'Heintz', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'cgoodrich@myboyum.com', password_hash, 'Caitlin', 'Goodrich', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'cmetzig@myboyum.com', password_hash, 'Charlie', 'Metzig', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'cmiller@myboyum.com', password_hash, 'Chris', 'Miller', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'cwittich@myboyum.com', password_hash, 'Chris', 'Wittich', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'cpearson@myboyum.com', password_hash, 'Cindy', 'Pearson', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'cbeaurline@myboyum.com', password_hash, 'Clayton', 'Beaurline', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'dcallewaert@myboyum.com', password_hash, 'Dan', 'Callewaert', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'dbernu@myboyum.com', password_hash, 'David', 'Bernu', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'dmonty@myboyum.com', password_hash, 'Dawson', 'Monty', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'dcampbell@myboyum.com', password_hash, 'Dee', 'Campbell', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'dwolf@myboyum.com', password_hash, 'Drew', 'Wolf', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'dmuehler@myboyum.com', password_hash, 'Dustin', 'Muehler', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'ewilcox@myboyum.com', password_hash, 'Elizabeth', 'Wilcox', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'ealphonso@myboyum.com', password_hash, 'Ellen', 'Alphonso', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'ewieland@myboyum.com', password_hash, 'Emilie', 'Wieland', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'eparker@myboyum.com', password_hash, 'Emily', 'Parker', 'member', org_id, NOW(), NOW()),
    -- Eric LeBow - already exists, skip
    (gen_random_uuid(), 'esteen@myboyum.com', password_hash, 'Erika', 'Steen', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'glund@myboyum.com', password_hash, 'Gina', 'Lund', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'gcarlson@myboyum.com', password_hash, 'Greg', 'Carlson', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'iwollermann@myboyum.com', password_hash, 'Isabel', 'Wollermann', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jhoehn@myboyum.com', password_hash, 'Jacie', 'Hoehn', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jkennedy@myboyum.com', password_hash, 'Jackie', 'Kennedy', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jmchatton@myboyum.com', password_hash, 'Jack', 'McHatton', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jkriegler@myboyum.com', password_hash, 'Jacob', 'Kriegler', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jknapp@myboyum.com', password_hash, 'James', 'Knapp', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'jwoelfel@myboyum.com', password_hash, 'James', 'Woelfel', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jschneidermann@myboyum.com', password_hash, 'Jared', 'Schneidermann', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jmckenzie@myboyum.com', password_hash, 'Jasmin', 'McKenzie', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jjaroscak@myboyum.com', password_hash, 'Jen', 'Jaroscak', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jbarnes@myboyum.com', password_hash, 'Jennifer', 'Barnes', 'admin', org_id, NOW(), NOW()), -- Admin
    (gen_random_uuid(), 'jkoskey@myboyum.com', password_hash, 'Jennifer', 'Koskey', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jhall@myboyum.com', password_hash, 'Jill', 'Hall', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jcsargo@myboyum.com', password_hash, 'John', 'Csargo', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jthompson@myboyum.com', password_hash, 'John', 'Thompson', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jsosniecki@myboyum.com', password_hash, 'Joran', 'Sosniecki', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jgerdes@myboyum.com', password_hash, 'Josh', 'Gerdes', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'jwall@myboyum.com', password_hash, 'Julie', 'Wall', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'kdonovan@myboyum.com', password_hash, 'Karen', 'Donovan', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'kwicker@myboyum.com', password_hash, 'Karin', 'Wicker', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'ktolkkinen@myboyum.com', password_hash, 'Kathy', 'Tolkkinen', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'kjohnson@myboyum.com', password_hash, 'Katie', 'Johnson', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'kschultz@myboyum.com', password_hash, 'Katy', 'Schultz', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'krose@myboyum.com', password_hash, 'Kayla', 'Rose', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'kfritz@myboyum.com', password_hash, 'Kendall', 'Fritz', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'kraich@myboyum.com', password_hash, 'Kendra', 'Raich', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'kberg@myboyum.com', password_hash, 'Kevin', 'Berg', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'kmccarty@myboyum.com', password_hash, 'Kevin', 'McCarty', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'kklug@myboyum.com', password_hash, 'Kris', 'Klug II', 'admin', org_id, NOW(), NOW()), -- Admin
    (gen_random_uuid(), 'lcallahan@myboyum.com', password_hash, 'Leslie', 'Callahan', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'mhuset@myboyum.com', password_hash, 'Mady', 'Huset', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'mprewett@myboyum.com', password_hash, 'Marie', 'Prewett', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'mfredricksen@myboyum.com', password_hash, 'Mary', 'Fredricksen', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'mkoch@myboyum.com', password_hash, 'Matthew', 'Koch', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'mgrover@myboyum.com', password_hash, 'Melaina', 'Grover', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'mking@myboyum.com', password_hash, 'Melissa', 'King', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'mresch@myboyum.com', password_hash, 'Miriam', 'Resch', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'mrotert@myboyum.com', password_hash, 'Mitch', 'Rotert', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'nswedberg@myboyum.com', password_hash, 'Nick', 'Swedberg', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'psievert@myboyum.com', password_hash, 'Pat', 'Sievert', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'pfleming@myboyum.com', password_hash, 'Patty', 'Fleming', 'admin', org_id, NOW(), NOW()), -- Admin
    (gen_random_uuid(), 'pkemp@myboyum.com', password_hash, 'Peggy', 'Kemp', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'ppfutzenreuter@myboyum.com', password_hash, 'Pete', 'Pfutzenreuter', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'panderson@myboyum.com', password_hash, 'Peter', 'Anderson', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'rfeld@myboyum.com', password_hash, 'Randy', 'Feld', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'rsullivan@myboyum.com', password_hash, 'Renee', 'Sullivan', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'rjones@myboyum.com', password_hash, 'Robin', 'Jones', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'rmartin@myboyum.com', password_hash, 'Ryan', 'Martin', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'sostrander@myboyum.com', password_hash, 'Sara', 'Ostrander', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'sschneidermann@myboyum.com', password_hash, 'Scott', 'Schneidermann', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'sbrydges@myboyum.com', password_hash, 'Sheila', 'Brydges', 'admin', org_id, NOW(), NOW()), -- Admin
    (gen_random_uuid(), 'sshaw@myboyum.com', password_hash, 'Stacy', 'Shaw', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'srausch@myboyum.com', password_hash, 'Steph', 'Rausch', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'triggsby@myboyum.com', password_hash, 'Tanner', 'Riggsby', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'thaag@myboyum.com', password_hash, 'Tim', 'Haag', 'admin', org_id, NOW(), NOW()), -- Admin
    (gen_random_uuid(), 'tstevens@myboyum.com', password_hash, 'Tracy', 'Stevens', 'member', org_id, NOW(), NOW()),
    (gen_random_uuid(), 'tnoe@myboyum.com', password_hash, 'Travis', 'Noe', 'admin', org_id, NOW(), NOW()), -- Owner
    (gen_random_uuid(), 'trudek@myboyum.com', password_hash, 'Tyler', 'Rudek', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'wsosniecki@myboyum.com', password_hash, 'Wendy', 'Sosniecki', 'admin', org_id, NOW(), NOW()), -- Manager
    (gen_random_uuid(), 'zkelly@myboyum.com', password_hash, 'Zack', 'Kelly', 'member', org_id, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;

    -- Add all users to Leadership Team by default (you'll reassign later)
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    SELECT u.id, leadership_team_id, 'member', NOW()
    FROM users u
    WHERE u.organization_id = org_id
      AND NOT EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.user_id = u.id 
        AND tm.team_id = leadership_team_id
      );

    RAISE NOTICE 'Users added successfully to Boyum Barenscheer';

END $$;

COMMIT;

-- =====================================================
-- Verification Queries for pgAdmin
-- =====================================================
-- After running the script above, run these separately to verify:

-- Check total count:
/*
SELECT COUNT(*) as user_count
FROM users
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer');
*/

-- View sample of users:
/*
SELECT 
    email,
    first_name,
    last_name,
    role
FROM users
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
ORDER BY last_name, first_name
LIMIT 20;
*/

-- Check for any duplicate emails:
/*
SELECT email, COUNT(*) as count
FROM users
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
GROUP BY email
HAVING COUNT(*) > 1;
*/