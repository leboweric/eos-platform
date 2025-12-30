const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
  connectionString: "postgresql://postgres:ESJVdVJqTzuGQaYrgkvBKHxqIfzhkGUx@switchback.proxy.rlwy.net:23015/railway"
});

async function seedValues() {
  const orgId = "01ed4682-e868-4e03-9b27-7dafcc961160";
  
  const userResult = await pool.query("SELECT id FROM users WHERE email = $1", ["sroberts@libertysystems.com"]);
  const saxeId = userResult.rows[0].id;
  
  // Get measurable IDs
  const measurables = await pool.query("SELECT id, name FROM measurables WHERE organization_id = $1", [orgId]);
  
  const measurableMap = {};
  for (const m of measurables.rows) {
    measurableMap[m.name] = m.id;
  }
  
  // Generate weekly values for the past 13 weeks (one quarter)
  const weeks = [];
  const today = new Date('2025-12-29');
  
  for (let i = 12; i >= 0; i--) {
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - (i * 7));
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    
    weeks.push({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
  }
  
  // Sample data with some variation - realistic for a warehouse tech company
  const sampleData = {
    "Weekly Revenue": [142000, 158000, 135000, 167000, 149000, 155000, 162000, 138000, 171000, 145000, 159000, 168000, 152000],
    "New Quotes Sent": [8, 12, 9, 11, 10, 14, 7, 13, 11, 9, 12, 10, 11],
    "Service Calls Completed": [14, 16, 12, 18, 15, 13, 17, 14, 16, 15, 19, 14, 16],
    "Repair Turnaround (Days)": [4.2, 5.1, 4.8, 3.9, 5.5, 4.3, 4.7, 6.2, 4.1, 4.9, 3.8, 5.0, 4.5],
    "LibertyCare Active Subscribers": [68, 69, 70, 71, 71, 72, 73, 73, 74, 74, 75, 76, 77]
  };
  
  let count = 0;
  for (const [name, values] of Object.entries(sampleData)) {
    const measurableId = measurableMap[name];
    if (!measurableId) {
      console.log("Skipping " + name + " - not found");
      continue;
    }
    
    for (let i = 0; i < weeks.length; i++) {
      await pool.query(
        "INSERT INTO measurable_values (id, measurable_id, period_start, period_end, value, entered_by_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (measurable_id, period_start, period_end) DO UPDATE SET value = $5",
        [uuidv4(), measurableId, weeks[i].start, weeks[i].end, values[i], saxeId]
      );
      count++;
    }
  }
  
  console.log("Created " + count + " scorecard values across 13 weeks");
  
  await pool.end();
  console.log("Done!");
}

seedValues().catch(err => { console.error("Error:", err.message); process.exit(1); });
