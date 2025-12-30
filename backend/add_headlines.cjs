const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
  connectionString: "postgresql://postgres:ESJVdVJqTzuGQaYrgkvBKHxqIfzhkGUx@switchback.proxy.rlwy.net:23015/railway"
});

async function addData() {
  const orgId = "01ed4682-e868-4e03-9b27-7dafcc961160";
  
  const userResult = await pool.query("SELECT id FROM users WHERE email = $1", ["sroberts@libertysystems.com"]);
  const saxeId = userResult.rows[0].id;
  
  const teamResult = await pool.query("SELECT id FROM teams WHERE organization_id = $1 LIMIT 1", [orgId]);
  const teamId = teamResult.rows[0].id;
  
  // Update all to-do due dates to January 2026
  await pool.query("UPDATE todos SET due_date = '2026-01-02' WHERE organization_id = $1", [orgId]);
  console.log("Updated all to-do due dates to Jan 2, 2026");
  
  // Add employee headlines
  const employeeHeadlines = [
    "Mike completed Zebra certification - now fully certified on TC series",
    "Sarah hit 100% customer satisfaction rating for Q4",
    "New technician Jake starts Monday - comes from Barcoding Inc"
  ];
  
  for (const text of employeeHeadlines) {
    await pool.query("INSERT INTO headlines (id, organization_id, team_id, type, text, created_by, meeting_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [uuidv4(), orgId, teamId, "employee", text, saxeId, "2025-12-30"]);
  }
  console.log("Created " + employeeHeadlines.length + " employee headlines");
  
  // Add customer headlines
  const customerHeadlines = [
    "Anderson Manufacturing signed 3-year LibertyCare contract - $45K annual",
    "Bell Helicopter expanding - requesting quote for 50 additional scanners",
    "Lost bid to ScanSource on Target distribution center project"
  ];
  
  for (const text of customerHeadlines) {
    await pool.query("INSERT INTO headlines (id, organization_id, team_id, type, text, created_by, meeting_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [uuidv4(), orgId, teamId, "customer", text, saxeId, "2025-12-30"]);
  }
  console.log("Created " + customerHeadlines.length + " customer headlines");
  
  // Add cascading message
  await pool.query("INSERT INTO cascading_messages (id, organization_id, from_team_id, message, created_by, meeting_date) VALUES ($1, $2, $3, $4, $5, $6)",
    [uuidv4(), orgId, teamId, "Q1 focus: Push LibertyCare subscriptions hard - we need 25 new subscribers this quarter to hit our goal. Every customer touchpoint should include a LibertyCare conversation. New pricing sheet coming next week with improved margins.", saxeId, "2025-12-30"]);
  console.log("Created cascading message");
  
  await pool.end();
  console.log("Done!");
}

addData().catch(err => { console.error("Error:", err.message); process.exit(1); });
