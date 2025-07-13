// Script to check if there are duplicate scorecards in the database
// Run this in the browser console while logged in

(async function checkDuplicateScorecard() {
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3001/api/v1' 
    : `${window.location.origin}/api/v1`;
  
  if (!userStr) {
    console.error('No user data found in localStorage');
    return;
  }
  
  const user = JSON.parse(userStr);
  const orgId = localStorage.getItem('impersonatedOrgId') || user.organizationId;
  
  console.log('🔍 Checking for duplicate scorecards in your organization...\n');
  console.log('Organization ID:', orgId);
  
  try {
    // Check for duplicates
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/00000000-0000-0000-0000-000000000000/scorecard/check-duplicates`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Failed to check duplicates:', await response.text());
      return;
    }
    
    const result = await response.json();
    const data = result.data;
    
    console.log('\n📊 Scorecard Analysis:');
    console.log(`Organization: ${data.summary.organizationName}`);
    console.log(`Total Metrics: ${data.summary.totalMetrics}`);
    console.log(`Unique Team IDs: ${data.summary.uniqueTeamCount}`);
    
    if (data.summary.hasDuplicateScorecard) {
      console.log('\n⚠️  DUPLICATE SCORECARD DETECTED!');
      console.log('Your metrics are split across multiple team IDs:');
      console.log('Team IDs found:', data.summary.teamIds);
      
      console.log('\n📋 Metrics by Team ID:');
      data.metricsByTeam.forEach(team => {
        console.log(`\nTeam ID: ${team.team_id}`);
        console.log(`  - Metric Count: ${team.metric_count}`);
        console.log(`  - Metrics: ${team.metric_names}`);
        console.log(`  - Created: ${new Date(team.earliest_created).toLocaleDateString()} - ${new Date(team.latest_created).toLocaleDateString()}`);
      });
      
      console.log('\n📈 Scores by Team ID:');
      data.scoresByTeam.forEach(team => {
        console.log(`\nTeam ID: ${team.team_id}`);
        console.log(`  - Weeks with data: ${team.weeks_with_data}`);
        console.log(`  - Total scores: ${team.total_scores}`);
        console.log(`  - Latest score: ${team.latest_score_date ? new Date(team.latest_score_date).toLocaleDateString() : 'No scores yet'}`);
      });
      
      console.log('\n💡 This explains why you see different data!');
      console.log('The Scorecard page and Weekly Meeting are likely using different team IDs.');
      console.log('\n🔧 To fix this, all metrics should use the same team_id.');
      
      // Suggest which team ID to use
      const teamWithMostData = data.scoresByTeam.reduce((prev, curr) => 
        (curr.total_scores > prev.total_scores) ? curr : prev
      );
      console.log(`\n✅ Recommendation: Consolidate all metrics to team_id: ${teamWithMostData.team_id}`);
      console.log('   (This team has the most score data)');
      
    } else {
      console.log('\n✅ No duplicate scorecards found!');
      console.log(`All ${data.summary.totalMetrics} metrics use the same team ID.`);
      
      if (data.metricsByTeam.length > 0) {
        console.log(`\nTeam ID: ${data.metricsByTeam[0].team_id}`);
        console.log(`Metrics: ${data.metricsByTeam[0].metric_names}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
  }
})();