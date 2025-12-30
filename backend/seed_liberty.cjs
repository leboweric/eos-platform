const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
  connectionString: "postgresql://postgres:ESJVdVJqTzuGQaYrgkvBKHxqIfzhkGUx@switchback.proxy.rlwy.net:23015/railway"
});

async function seedData() {
  const orgId = "01ed4682-e868-4e03-9b27-7dafcc961160";
  
  const userResult = await pool.query("SELECT id FROM users WHERE email = $1", ["sroberts@libertysystems.com"]);
  const saxeId = userResult.rows[0].id;
  
  const teamResult = await pool.query("SELECT id FROM teams WHERE organization_id = $1 LIMIT 1", [orgId]);
  const teamId = teamResult.rows[0].id;
  
  // Check if VTO already exists
  const existingVto = await pool.query("SELECT id FROM business_blueprints WHERE organization_id = $1 LIMIT 1", [orgId]);
  let vtoId;
  
  if (existingVto.rows.length > 0) {
    vtoId = existingVto.rows[0].id;
    console.log("Using existing V/TO blueprint");
  } else {
    // VTO - Create the business blueprint first
    vtoId = uuidv4();
    await pool.query("INSERT INTO business_blueprints (id, organization_id, team_id, name) VALUES ($1, $2, $3, $4)",
      [vtoId, orgId, teamId, "Liberty Systems V/TO"]);
    console.log("Created V/TO blueprint");
  }
  
  // Check and add Core Values if not exist
  const existingValues = await pool.query("SELECT id FROM core_values WHERE vto_id = $1", [vtoId]);
  if (existingValues.rows.length === 0) {
    const coreValues = [
      { value: "Customer First", description: "We prioritize customer success" },
      { value: "Technical Excellence", description: "Stay current with warehouse tech" },
      { value: "Integrity", description: "Do what we say, stand behind our work" },
      { value: "Partnership", description: "Build long-term relationships" },
      { value: "Innovation", description: "Seek better solutions" }
    ];
    
    for (let i = 0; i < coreValues.length; i++) {
      await pool.query("INSERT INTO core_values (id, vto_id, value_text, description, sort_order) VALUES ($1, $2, $3, $4, $5)",
        [uuidv4(), vtoId, coreValues[i].value, coreValues[i].description, i + 1]);
    }
    console.log("Created " + coreValues.length + " Core Values");
  }
  
  // Core Focus
  const existingFocus = await pool.query("SELECT id FROM core_focus WHERE vto_id = $1", [vtoId]);
  if (existingFocus.rows.length === 0) {
    await pool.query("INSERT INTO core_focus (id, vto_id, purpose_cause_passion, niche, hedgehog_type) VALUES ($1, $2, $3, $4, $5)",
      [uuidv4(), vtoId, "Help warehouses operate efficiently through proven technology", "Barcode, RFID, wireless solutions for warehouse operations", "purpose"]);
    console.log("Created Core Focus");
  }
  
  // Ten Year Target
  const existingTarget = await pool.query("SELECT id FROM ten_year_targets WHERE vto_id = $1", [vtoId]);
  if (existingTarget.rows.length === 0) {
    await pool.query("INSERT INTO ten_year_targets (id, vto_id, target_description, target_year) VALUES ($1, $2, $3, $4)",
      [uuidv4(), vtoId, "Premier warehouse tech integrator in Upper Midwest with $25M revenue", 2035]);
    console.log("Created 10-Year Target");
  }
  
  // Marketing Strategy
  const existingMarketing = await pool.query("SELECT id FROM marketing_strategies WHERE vto_id = $1", [vtoId]);
  if (existingMarketing.rows.length === 0) {
    await pool.query("INSERT INTO marketing_strategies (id, vto_id, target_market, differentiator_1, differentiator_2, differentiator_3, proven_process, guarantee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [uuidv4(), vtoId, "Mid-size warehouse operations in Minnesota region", "25+ years expertise", "Full-service support", "LibertyCare managed services", "Needs Analysis - Design - Implementation - Training - Support", "100% satisfaction on all installations"]);
    console.log("Created Marketing Strategy");
  }
  
  // Three Year Picture
  const existing3yr = await pool.query("SELECT id FROM three_year_pictures WHERE vto_id = $1", [vtoId]);
  if (existing3yr.rows.length === 0) {
    await pool.query("INSERT INTO three_year_pictures (id, vto_id, future_date, revenue_target, profit_target, what_does_it_look_like) VALUES ($1, $2, $3, $4, $5, $6)",
      [uuidv4(), vtoId, "2028-12-31", "$12,000,000", "$1,800,000", "Expanded service territory to Wisconsin and Iowa. Team of 20+ employees including 8 field technicians. New 10,000 sq ft facility with expanded repair center. Recognized as Zebra Premier Partner."]);
    console.log("Created 3-Year Picture");
  }
  
  // One Year Plan
  const existing1yr = await pool.query("SELECT id FROM one_year_plans WHERE vto_id = $1", [vtoId]);
  if (existing1yr.rows.length === 0) {
    await pool.query("INSERT INTO one_year_plans (id, vto_id, future_date, revenue_target, profit_target) VALUES ($1, $2, $3, $4, $5)",
      [uuidv4(), vtoId, "2025-12-31", "$8,500,000", 1100000]);
    console.log("Created 1-Year Plan");
  }
  
  await pool.end();
  console.log("Done with VTO!");
}

seedData().catch(err => { console.error("Error:", err.message); process.exit(1); });
