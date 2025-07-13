// Debug script to check why priorities show 0/0 on dashboard
// Run this in the browser console while on the Dashboard page

(async function debugDashboardPriorities() {
  console.log('🔍 Debugging Dashboard Priorities\n');
  
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!user) {
    console.error('No user found in localStorage');
    return;
  }
  
  console.log('👤 Current User:');
  console.log('- ID:', user.id);
  console.log('- Name:', user.firstName, user.lastName);
  console.log('- Org ID:', user.organizationId);
  
  const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3001/api/v1' 
    : `${window.location.origin}/api/v1`;
    
  const orgId = localStorage.getItem('impersonatedOrgId') || user.organizationId;
  const teamId = user.teamId || '00000000-0000-0000-0000-000000000000';
  
  try {
    // Fetch priorities
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/current`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch priorities:', await response.text());
      return;
    }
    
    const data = await response.json();
    console.log('\n📊 Priorities Response:', data);
    
    // Check company priorities
    console.log('\n🏢 Company Priorities:');
    if (data.companyPriorities && data.companyPriorities.length > 0) {
      data.companyPriorities.forEach(p => {
        console.log(`\n- ${p.title}`);
        console.log('  Owner:', p.owner);
        console.log('  Owner ID:', p.owner?.id || 'Not set');
        console.log('  Owner Name:', p.owner?.name || 'Not set');
        console.log('  Status:', p.status);
      });
    } else {
      console.log('No company priorities found');
    }
    
    // Check team member priorities
    console.log('\n👥 Team Member Priorities:');
    if (data.teamMemberPriorities) {
      Object.entries(data.teamMemberPriorities).forEach(([userId, userData]) => {
        console.log(`\nUser ID: ${userId}`);
        console.log('User Name:', userData.name);
        console.log('Priorities Count:', userData.priorities?.length || 0);
        if (userData.priorities?.length > 0) {
          userData.priorities.forEach(p => {
            console.log(`  - ${p.title} (${p.status})`);
          });
        }
      });
    }
    
    // Check filtering logic
    console.log('\n🔍 Dashboard Filtering Logic:');
    const userPriorities = [];
    
    // Company priorities assigned to user
    if (data.companyPriorities) {
      const userCompanyPriorities = data.companyPriorities.filter(p => p.owner?.id === user.id);
      console.log(`\nCompany priorities assigned to you: ${userCompanyPriorities.length}`);
      userPriorities.push(...userCompanyPriorities);
    }
    
    // Individual priorities for user
    if (data.teamMemberPriorities?.[user.id]) {
      const individualPriorities = data.teamMemberPriorities[user.id].priorities || [];
      console.log(`Individual priorities assigned to you: ${individualPriorities.length}`);
      userPriorities.push(...individualPriorities);
    }
    
    console.log(`\n✅ Total priorities for dashboard: ${userPriorities.length}`);
    
    // Check if the issue is with owner data structure
    if (data.companyPriorities?.length > 0) {
      const firstPriority = data.companyPriorities[0];
      console.log('\n🔍 Sample priority owner structure:');
      console.log('Owner object:', firstPriority.owner);
      console.log('Owner type:', typeof firstPriority.owner);
      
      if (firstPriority.owner_id) {
        console.log('\n⚠️  Found owner_id field - might need to use this instead of owner.id');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();