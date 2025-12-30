const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
  connectionString: "postgresql://postgres:ESJVdVJqTzuGQaYrgkvBKHxqIfzhkGUx@switchback.proxy.rlwy.net:23015/railway"
});

async function cleanup() {
  const orgId = "01ed4682-e868-4e03-9b27-7dafcc961160";
  
  const userResult = await pool.query("SELECT id FROM users WHERE email = $1", ["sroberts@libertysystems.com"]);
  const saxeId = userResult.rows[0].id;
  
  const teamResult = await pool.query("SELECT id FROM teams WHERE organization_id = $1 LIMIT 1", [orgId]);
  const teamId = teamResult.rows[0].id;
  
  // Add 3 more rocks to make 7 total
  const newRocks = [
    { title: "Increase LibertyCare Subscribers to 100", description: "Grow managed services subscriber base from 75 to 100 active accounts", status: "on-track", progress: 35 },
    { title: "Launch E-commerce Portal", description: "Deploy online ordering portal for consumables and accessories", status: "on-track", progress: 20 },
    { title: "Complete Zebra Expert Certification", description: "Achieve Zebra Expert Partner status for enhanced margins and support", status: "on-track", progress: 55 }
  ];
  
  for (const rock of newRocks) {
    await pool.query("INSERT INTO quarterly_priorities (id, organization_id, team_id, owner_id, title, description, status, progress, quarter, year, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [uuidv4(), orgId, teamId, saxeId, rock.title, rock.description, rock.status, rock.progress, "Q1", 2025, "2025-03-31"]);
  }
  console.log("Added 3 more rocks (now 7 total)");
  
  // Delete duplicate issues (keep only 5 unique ones)
  const issueResult = await pool.query("SELECT id, title FROM issues WHERE organization_id = $1 ORDER BY created_at", [orgId]);
  console.log("Current issues: " + issueResult.rows.length);
  
  if (issueResult.rows.length > 5) {
    // Keep only first 5
    const keepIds = issueResult.rows.slice(0, 5).map(r => r.id);
    await pool.query("DELETE FROM issues WHERE organization_id = $1 AND id != ALL($2)", [orgId, keepIds]);
    console.log("Cleaned up duplicate issues");
  }
  
  // Ensure all issues are assigned to Saxe (owner_id)
  await pool.query("UPDATE issues SET owner_id = $1 WHERE organization_id = $2", [saxeId, orgId]);
  console.log("Assigned all issues to Saxe");
  
  // Ensure all to-dos are assigned to Saxe
  await pool.query("UPDATE todos SET owner_id = $1, assigned_to_id = $1 WHERE organization_id = $2", [saxeId, orgId]);
  console.log("Assigned all to-dos to Saxe");
  
  // Verify counts
  const rockCount = await pool.query("SELECT COUNT(*) FROM quarterly_priorities WHERE organization_id = $1", [orgId]);
  const issueCount = await pool.query("SELECT COUNT(*) FROM issues WHERE organization_id = $1", [orgId]);
  const todoCount = await pool.query("SELECT COUNT(*) FROM todos WHERE organization_id = $1", [orgId]);
  
  console.log("\nFinal counts:");
  console.log("Rocks: " + rockCount.rows[0].count);
  console.log("Issues: " + issueCount.rows[0].count);
  console.log("To-Dos: " + todoCount.rows[0].count);
  
  await pool.end();
}

cleanup().catch(err => { console.error("Error:", err.message); process.exit(1); });
