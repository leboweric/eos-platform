const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
  connectionString: "postgresql://postgres:ESJVdVJqTzuGQaYrgkvBKHxqIfzhkGUx@switchback.proxy.rlwy.net:23015/railway"
});

async function seedScorecard() {
  const orgId = "01ed4682-e868-4e03-9b27-7dafcc961160";
  
  const userResult = await pool.query("SELECT id FROM users WHERE email = $1", ["sroberts@libertysystems.com"]);
  const saxeId = userResult.rows[0].id;
  
  const teamResult = await pool.query("SELECT id FROM teams WHERE organization_id = $1 LIMIT 1", [orgId]);
  const teamId = teamResult.rows[0].id;
  
  // Create a scorecard group first
  const groupId = uuidv4();
  await pool.query("INSERT INTO scorecard_groups (id, organization_id, team_id, name, description, color, sort_order, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [groupId, orgId, teamId, "Key Performance Indicators", "Weekly KPIs for Liberty Systems", "#F15A24", 1, "weekly"]);
  console.log("Created Scorecard Group");
  
  // Create 5 KPIs relevant to warehouse/barcode solutions business
  const kpis = [
    { 
      name: "Weekly Revenue", 
      description: "Total revenue from product sales and services", 
      unit: "$", 
      goal_operator: ">=", 
      goal_value: 150000,
      frequency: "weekly"
    },
    { 
      name: "New Quotes Sent", 
      description: "Number of new quotes/proposals sent to prospects", 
      unit: "#", 
      goal_operator: ">=", 
      goal_value: 10,
      frequency: "weekly"
    },
    { 
      name: "Service Calls Completed", 
      description: "Number of on-site service and installation calls completed", 
      unit: "#", 
      goal_operator: ">=", 
      goal_value: 15,
      frequency: "weekly"
    },
    { 
      name: "Repair Turnaround (Days)", 
      description: "Average days to complete device repairs", 
      unit: "days", 
      goal_operator: "<=", 
      goal_value: 5,
      frequency: "weekly"
    },
    { 
      name: "LibertyCare Active Subscribers", 
      description: "Total active LibertyCare managed service subscribers", 
      unit: "#", 
      goal_operator: ">=", 
      goal_value: 75,
      frequency: "weekly"
    }
  ];
  
  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i];
    await pool.query("INSERT INTO measurables (id, organization_id, scorecard_group_id, owner_id, name, description, unit, goal_operator, goal_value, frequency, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [uuidv4(), orgId, groupId, saxeId, kpi.name, kpi.description, kpi.unit, kpi.goal_operator, kpi.goal_value, kpi.frequency, i + 1]);
  }
  console.log("Created " + kpis.length + " KPIs");
  
  await pool.end();
  console.log("Done!");
}

seedScorecard().catch(err => { console.error("Error:", err.message); process.exit(1); });
