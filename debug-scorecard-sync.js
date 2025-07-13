// Debug script to compare scorecard data between pages
// Run this on both the Scorecard page and Weekly Meeting scorecard section

(async function debugScorecardSync() {
  console.log('🔍 Debugging Scorecard Sync Issue\n');
  
  // Get current page info
  const currentPath = window.location.pathname;
  console.log('📍 Current Page:', currentPath);
  
  // Get user and org info
  const userStr = localStorage.getItem('user');
  const impersonatedOrgId = localStorage.getItem('impersonatedOrgId');
  const token = localStorage.getItem('accessToken');
  
  if (userStr) {
    const user = JSON.parse(userStr);
    console.log('\n👤 User Context:');
    console.log('- User ID:', user.id);
    console.log('- Organization ID:', user.organizationId);
    console.log('- Team ID:', user.teamId || 'Not set');
    console.log('- Impersonated Org ID:', impersonatedOrgId || 'None');
  }
  
  // Extract team ID from URL if on weekly meeting page
  let urlTeamId = null;
  if (currentPath.includes('weekly-accountability')) {
    const matches = currentPath.match(/weekly-accountability\/([^\/]+)/);
    urlTeamId = matches ? matches[1] : null;
    console.log('- URL Team ID:', urlTeamId);
  }
  
  // Determine which org and team IDs will be used
  const user = userStr ? JSON.parse(userStr) : {};
  const orgId = impersonatedOrgId || user.organizationId;
  const teamId = urlTeamId || user.teamId || '00000000-0000-0000-0000-000000000000';
  
  console.log('\n🎯 IDs being used for API call:');
  console.log('- Organization ID:', orgId);
  console.log('- Team ID:', teamId);
  
  // Check current week calculation
  console.log('\n📅 Week Calculation:');
  const today = new Date();
  console.log('- Today:', today.toDateString());
  console.log('- Day of week:', today.getDay(), '(0=Sunday, 1=Monday)');
  
  // Calculate week start using Monday
  const getWeekStartMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  
  // Calculate week start using Sunday
  const getWeekStartSunday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };
  
  const mondayStart = getWeekStartMonday(today);
  const sundayStart = getWeekStartSunday(today);
  
  console.log('- Week start (Monday):', mondayStart.toISOString().split('T')[0]);
  console.log('- Week start (Sunday):', sundayStart.toISOString().split('T')[0]);
  
  // Make API call to get scorecard data
  const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3001/api/v1' 
    : `${window.location.origin}/api/v1`;
    
  try {
    console.log('\n📡 Fetching scorecard data...');
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
      console.error('❌ API Error:', response.status, await response.text());
      return;
    }
    
    const data = await response.json();
    const scoreData = data.data || data;
    
    console.log('\n📊 Scorecard Data:');
    console.log('- Metrics count:', scoreData.metrics?.length || 0);
    console.log('- Team members count:', scoreData.teamMembers?.length || 0);
    
    // Show metrics
    if (scoreData.metrics?.length > 0) {
      console.log('\n📈 Metrics:');
      scoreData.metrics.forEach(m => {
        console.log(`  - ${m.name} (ID: ${m.id}, Owner: ${m.owner || 'Not set'})`);
      });
      
      // Check scores for current week
      console.log('\n📊 Scores for current week:');
      const currentWeekKey = mondayStart.toISOString().split('T')[0];
      scoreData.metrics.forEach(m => {
        const score = scoreData.weeklyScores?.[m.id]?.[currentWeekKey];
        console.log(`  - ${m.name}: ${score !== undefined ? score : 'No score'}`);
      });
      
      // Show all week keys in scores
      console.log('\n📅 All week dates with scores:');
      const allWeekDates = new Set();
      Object.values(scoreData.weeklyScores || {}).forEach(metricScores => {
        Object.keys(metricScores).forEach(date => allWeekDates.add(date));
      });
      const sortedDates = Array.from(allWeekDates).sort().slice(-5);
      console.log('Last 5 weeks with data:', sortedDates);
    }
    
    // Store data for comparison
    window.__scorecardDebugData = {
      page: currentPath,
      orgId,
      teamId,
      metricsCount: scoreData.metrics?.length || 0,
      metrics: scoreData.metrics || [],
      weeklyScores: scoreData.weeklyScores || {},
      timestamp: new Date().toISOString()
    };
    
    console.log('\n💾 Debug data saved to window.__scorecardDebugData');
    console.log('Run this script on both pages, then compare the results.');
    
  } catch (error) {
    console.error('❌ Error fetching scorecard:', error);
  }
})();