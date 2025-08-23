# Connect pgAdmin to Railway PostgreSQL Database

## Steps to Configure pgAdmin for Railway:

1. **Get your Railway database credentials:**
   - Go to https://railway.app/dashboard
   - Click on your `eos-platform` project
   - Click on the PostgreSQL service
   - Go to the **Connect** tab
   - You'll see connection details like:
     - Host: `postgres.railway.internal` (for internal) or something like `viaduct.proxy.rlwy.net`
     - Port: Usually `5432` or a custom port like `47673`
     - Database: `railway`
     - Username: `postgres`
     - Password: A long string

2. **In pgAdmin, create a new server:**
   - Right-click on "Servers" → "Register" → "Server"
   
3. **General Tab:**
   - Name: `Railway Production` (or any name you prefer)
   
4. **Connection Tab:**
   - Host: Use the **public** host from Railway (like `viaduct.proxy.rlwy.net`)
   - Port: Use the port from Railway (might be different than 5432)
   - Database: `railway`
   - Username: `postgres`
   - Password: Use the password from Railway
   - Save password: Check this box
   
5. **SSL Tab:**
   - SSL Mode: Set to `Require` or `Prefer`
   
6. **Click Save**

## Alternative: Use Railway's DATABASE_URL

If Railway shows a DATABASE_URL like:
```
postgresql://postgres:password@viaduct.proxy.rlwy.net:47673/railway
```

Parse it as:
- Host: `viaduct.proxy.rlwy.net`
- Port: `47673`
- Database: `railway`
- Username: `postgres`
- Password: `password`

## Verify Connection

Once connected, run this query to verify you have the prospects:
```sql
SELECT COUNT(*) FROM prospects;
```

This should return 580+ records (your imported EOS Integrators).

## Troubleshooting

If you still see 0 records:
1. Make sure you're connected to Railway, not localhost
2. Check that the schema is set to `public`
3. Run: `SET search_path TO public;`
4. Then try the queries again

## Quick Test Query

```sql
-- This should show your prospects if connected correctly
SELECT company_name, has_eos_titles 
FROM prospects 
LIMIT 5;
```