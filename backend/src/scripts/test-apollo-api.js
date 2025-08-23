import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testApolloAPI() {
  const apiKey = process.env.APOLLO_API_KEY;
  
  console.log('🔍 Testing Apollo API Connection\n');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}` : 'NOT FOUND');
  
  if (!apiKey) {
    console.error('❌ APOLLO_API_KEY not found in environment');
    return;
  }
  
  try {
    // Test 1: Try the authentication endpoint
    console.log('\n📡 Testing Apollo API authentication...');
    
    // Apollo might use a different auth format - let's try both
    const headers1 = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    const headers2 = {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    };
    
    // Try Bearer auth first
    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/organizations/enrich',
        {
          domain: 'google.com'
        },
        { headers: headers1 }
      );
      console.log('✅ Bearer auth works!');
      console.log('Response:', response.data ? 'Data received' : 'No data');
    } catch (error) {
      console.log('❌ Bearer auth failed:', error.response?.status, error.response?.statusText);
      
      // Try Api-Key header
      console.log('\n📡 Trying Api-Key header instead...');
      try {
        const response = await axios.post(
          'https://api.apollo.io/v1/organizations/enrich',
          {
            domain: 'google.com'
          },
          { headers: headers2 }
        );
        console.log('✅ Api-Key header works!');
        console.log('Response:', response.data ? 'Data received' : 'No data');
      } catch (error2) {
        console.log('❌ Api-Key header also failed:', error2.response?.status, error2.response?.statusText);
        
        // Try as query parameter
        console.log('\n📡 Trying API key as query parameter...');
        try {
          const response = await axios.post(
            `https://api.apollo.io/v1/organizations/enrich?api_key=${apiKey}`,
            {
              domain: 'google.com'
            },
            { headers: { 'Content-Type': 'application/json' } }
          );
          console.log('✅ Query parameter works!');
          console.log('Response:', response.data ? 'Data received' : 'No data');
        } catch (error3) {
          console.log('❌ Query parameter also failed:', error3.response?.status, error3.response?.statusText);
          
          if (error3.response?.data) {
            console.log('Error details:', error3.response.data);
          }
        }
      }
    }
    
    // Check if this is the right API endpoint
    console.log('\n📋 Checking Apollo API documentation...');
    console.log('Current endpoint: https://api.apollo.io/v1');
    console.log('If all methods failed, the API key might be:');
    console.log('1. Invalid or expired');
    console.log('2. For a different Apollo account/environment');
    console.log('3. Missing required permissions');
    console.log('\nYou may need to:');
    console.log('1. Generate a new API key at https://app.apollo.io/#/settings/integrations/api');
    console.log('2. Check the API documentation for the correct auth method');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testApolloAPI();