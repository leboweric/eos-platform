const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
  connectionString: "postgresql://postgres:ESJVdVJqTzuGQaYrgkvBKHxqIfzhkGUx@switchback.proxy.rlwy.net:23015/railway"
});

async function fixScorecard() {
  const orgId = "01ed4682-e868-4e03-9b27-7dafcc961160";
  const teamId = "b92936ee-3cf0-4466-a101-09e7f03fc4f2"; // Leadership Team
  
  // Get the scorecard group ID
  const groupResult = await pool.query(
    "SELECT id FROM scorecard_groups WHERE organization_id = $1 AND team_id = $2 LIMIT 1",
    [orgId, teamId]
  );
  const groupId = groupResult.rows[0]?.id;
  console.log("Group ID:", groupId);
  
  // Define the metrics to create
  const metrics = [
    { name: "Weekly Revenue", goal: "150000", owner: "Saxe Roberts", comparison_operator: "greater_equal", value_type: "currency" },
    { name: "New Quotes Sent", goal: "10", owner: "Saxe Roberts", comparison_operator: "greater_equal", value_type: "number" },
    { name: "Service Calls Completed", goal: "15", owner: "Saxe Roberts", comparison_operator: "greater_equal", value_type: "number" },
    { name: "Repair Turnaround (Days)", goal: "5", owner: "Saxe Roberts", comparison_operator: "less_equal", value_type: "number" },
    { name: "LibertyCare Active Subscribers", goal: "75", owner: "Saxe Roberts", comparison_operator: "greater_equal", value_type: "number" }
  ];
  
  const metricIds = [];
  
  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    const metricId = uuidv4();
    metricIds.push({ id: metricId, name: m.name });
    
    await pool.query(
      `INSERT INTO scorecard_metrics (id, organization_id, team_id, name, goal, owner, type, value_type, comparison_operator, group_id, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [metricId, orgId, teamId, m.name, m.goal, m.owner, "weekly", m.value_type, m.comparison_operator, groupId, i]
    );
    console.log("Created metric:", m.name);
  }
  
  // Now add scores for the past 13 weeks
  const sampleData = {
    "Weekly Revenue": [142000, 158000, 135000, 167000, 149000, 155000, 162000, 138000, 171000, 145000, 159000, 168000, 152000],
    "New Quotes Sent": [8, 12, 9, 11, 10, 14, 7, 13, 11, 9, 12, 10, 11],
    "Service Calls Completed": [14, 16, 12, 18, 15, 13, 17, 14, 16, 15, 19, 14, 16],
    "Repair Turnaround (Days)": [4.2, 5.1, 4.8, 3.9, 5.5, 4.3, 4.7, 6.2, 4.1, 4.9, 3.8, 5.0, 4.5],
    "LibertyCare Active Subscribers": [68, 69, 70, 71, 71, 72, 73, 73, 74, 74, 75, 76, 77]
  };
  
  // Generate week dates for the past 13 weeks
  const weeks = [];
  const today = new Date('2025-12-29');
  
  for (let i = 12; i >= 0; i--) {
    const weekDate = new Date(today);
    weekDate.setDate(today.getDate() - (i * 7));
    // Get Monday of that week
    const day = weekDate.getDay();
    const diff = weekDate.getDate() - day + (day === 0 ? -6 : 1);
    weekDate.setDate(diff);
    weeks.push(weekDate.toISOString().split('T')[0]);
  }
  
  console.log("Week dates:", weeks);
  
  let scoreCount = 0;
  for (const metric of metricIds) {
    const values = sampleData[metric.name];
    if (!values) continue;
    
    for (let i = 0; i < weeks.length; i++) {
      await pool.query(
        `INSERT INTO scorecard_scores (id, metric_id, organization_id, week_date, value)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (metric_id, week_date) DO UPDATE SET value = $5`,
        [uuidv4(), metric.id, orgId, weeks[i], values[i]]
      );
      scoreCount++;
    }
  }
  
  console.log("Created " + scoreCount + " scores");
  
  await pool.end();
  console.log("Done!");
}

fixScorecard().catch(err => { console.error("Error:", err.message); process.exit(1); });
