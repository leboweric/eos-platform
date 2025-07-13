// Script to check what organization/team is being used for current scorecard view
// Run this in the browser console while on the scorecard page

(async function checkCurrentScorecard() {
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
  const orgId = user.organizationId;
  const teamId = user.teamId || '00000000-0000-0000-0000-000000000000';
  
  console.log('🔍 Checking current scorecard view...\n');
  console.log('Current Context:');
  console.log(`- Organization ID: ${orgId}`);
  console.log(`- Team ID: ${teamId}`);
  console.log(`- User: ${user.firstName} ${user.lastName}`);
  console.log(`- Role: ${user.role}`);
  
  try {
    // Try to fetch scorecard with current IDs
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch scorecard:', await response.text());
      return;
    }
    
    const data = await response.json();
    console.log('\n📊 Scorecard Data Retrieved:');
    console.log(`- Metrics count: ${data.data?.metrics?.length || 0}`);
    console.log(`- Team members count: ${data.data?.teamMembers?.length || 0}`);
    
    if (data.data?.metrics?.length > 0) {
      console.log('\nMetrics found:');
      data.data.metrics.forEach(m => {
        console.log(`  - ${m.name} (Owner: ${m.owner || 'Not set'})`);
      });
    } else {
      console.log('\n❌ No metrics found for this organization/team combination');
      console.log('\n💡 Try running the diagnose-scorecard.js script to find where your data is stored');
    }
    
  } catch (error) {
    console.error('❌ Error checking scorecard:', error);
  }
})();