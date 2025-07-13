// Script to diagnose missing scorecard data for Bennett Material Handling
// Run this in the browser console while logged in

(async function diagnoseScorecardData() {
  const token = localStorage.getItem('accessToken');
  const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3001/api/v1' 
    : `${window.location.origin}/api/v1`;
  
  try {
    console.log('🔍 Searching for Bennett Material Handling scorecard data...\n');
    
    // First, let's find scorecard data for Bennett
    const findResponse = await fetch(
      `${API_URL}/organizations/00000000-0000-0000-0000-000000000000/teams/00000000-0000-0000-0000-000000000000/scorecard/find?orgName=Bennett`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!findResponse.ok) {
      console.error('Failed to search for scorecard data:', await findResponse.text());
      return;
    }
    
    const searchData = await findResponse.json();
    console.log('📊 Search Results:', searchData.data);
    
    if (searchData.data.metrics.length === 0) {
      console.log('❌ No scorecard data found for Bennett Material Handling');
      return;
    }
    
    // Display summary
    console.log('\n📈 Summary:');
    console.log(`- Total metrics found: ${searchData.data.summary.totalMetrics}`);
    console.log(`- Total scores found: ${searchData.data.summary.totalScores}`);
    console.log('- Organizations found:', searchData.data.summary.organizations);
    console.log('- Team IDs used:', searchData.data.summary.teamIds);
    
    // Show metrics details
    console.log('\n📋 Metrics Details:');
    searchData.data.metrics.forEach(metric => {
      console.log(`\nMetric: ${metric.name}`);
      console.log(`  - ID: ${metric.id}`);
      console.log(`  - Organization: ${metric.org_name} (${metric.org_id})`);
      console.log(`  - Team ID: ${metric.team_id}`);
      console.log(`  - Owner: ${metric.owner_name || metric.owner}`);
      console.log(`  - Goal: ${metric.goal}`);
      console.log(`  - Created: ${new Date(metric.created_at).toLocaleDateString()}`);
    });
    
    // Get current user info
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      console.log('\n👤 Current User Context:');
      console.log(`  - User ID: ${user.id}`);
      console.log(`  - Organization ID: ${user.organizationId}`);
      console.log(`  - Team ID: ${user.teamId || 'Not set (using default)'}`);
      
      // Check if there's a mismatch
      if (searchData.data.metrics.length > 0) {
        const metricOrgId = searchData.data.metrics[0].org_id;
        const metricTeamId = searchData.data.metrics[0].team_id;
        
        if (metricOrgId !== user.organizationId) {
          console.log('\n⚠️  WARNING: Organization ID mismatch!');
          console.log(`  - Metrics are stored under org: ${metricOrgId}`);
          console.log(`  - You are viewing as org: ${user.organizationId}`);
          console.log('  - This is why the data is not showing!');
        }
        
        const currentTeamId = user.teamId || '00000000-0000-0000-0000-000000000000';
        if (metricTeamId !== currentTeamId) {
          console.log('\n⚠️  WARNING: Team ID mismatch!');
          console.log(`  - Metrics are stored under team: ${metricTeamId}`);
          console.log(`  - You are viewing as team: ${currentTeamId}`);
          console.log('  - This might also cause data not to show!');
        }
      }
    }
    
    // Provide fix suggestions
    if (searchData.data.metrics.length > 0) {
      console.log('\n💡 Possible Solutions:');
      console.log('1. If you are a consultant, make sure you are impersonating the correct organization');
      console.log('2. The data might need to be migrated to match your current organization/team IDs');
      console.log('3. You can manually update the team_id in the database if needed');
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
})();