# How to Connect to Your Production Database

## You're currently connected to an EMPTY TEST database
- All tables have 0 rows
- This is NOT where Strategic Consulting's data is

## To connect to your PRODUCTION database:

### Option 1: Railway Dashboard
1. Go to https://railway.app/dashboard
2. Find your **eos-platform** project
3. Click on the **Postgres** service
4. Click **"Connect"** tab
5. Copy the **DATABASE_URL** or connection details

### Option 2: Check your environment variables
Look in your backend for:
- `.env` file
- `.env.production` file
- Railway environment variables

Find: `DATABASE_URL=postgresql://...`

### Option 3: pgAdmin Connection
In pgAdmin, you need to create a new server connection:

1. Right-click "Servers" → "Register" → "Server"
2. Name: "AXP Production" (or similar)
3. Connection tab:
   - Host: [from Railway]
   - Port: [from Railway, usually not 5432]
   - Database: railway
   - Username: postgres
   - Password: [from Railway]

### How to identify the RIGHT database:
The production database will have:
- `quarterly_priorities` table WITH data
- `organizations` table WITH "Strategic Consulting and Coaching"
- Many users and teams
- Historical data from months/years

### Quick test after connecting:
```sql
-- This should return data in production
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM quarterly_priorities;
SELECT name FROM organizations WHERE name LIKE '%Strategic%';
```

## Common Railway Connection Details Pattern:
- Host: `containers-us-west-###.railway.app`
- Port: `6543` (or another non-standard port)
- Database: `railway`
- Username: `postgres`
- Password: (long random string)

## Your backend is likely already connected correctly
Check your backend logs or the running app - it's successfully reading Strategic Consulting's data, so the connection string exists somewhere in your environment.