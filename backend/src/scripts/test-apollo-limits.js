import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testApolloLimits() {
  const apiKey = process.env.APOLLO_API_KEY;
  
  console.log('🔍 Testing Apollo API Limits and Permissions\n');
  
  if (!apiKey) {
    console.error('❌ APOLLO_API_KEY not found');
    return;
  }
  
  try {
    // Test 1: Check API key validity
    console.log('📡 Testing API key validity...');
    try {
      const response = await axios.get(
        'https://api.apollo.io/v1/auth/health',
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ API key is valid');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.response?.status, error.response?.data);
    }
    
    // Test 2: Check rate limits
    console.log('\n📊 Checking rate limits...');
    try {
      const response = await axios.get(
        'https://api.apollo.io/v1/rate_limits',
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Rate limits:', response.data);
    } catch (error) {
      console.log('❌ Could not check rate limits:', error.response?.status);
    }
    
    // Test 3: Try a simpler endpoint (search for companies)
    console.log('\n🏢 Testing company search...');
    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_companies/search',
        {
          per_page: 1,
          organization_names: ['Google']
        },
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Company search works!');
      console.log('Found companies:', response.data.organizations?.length || 0);
    } catch (error) {
      console.log('❌ Company search failed:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Test 4: Try people search
    console.log('\n👥 Testing people search...');
    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_people/search',
        {
          per_page: 1,
          organization_names: ['Google']
        },
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ People search works!');
      console.log('Found people:', response.data.people?.length || 0);
    } catch (error) {
      console.log('❌ People search failed:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('If you\'re getting 403 errors, it could mean:');
    console.log('1. Your Apollo account doesn\'t have access to these endpoints');
    console.log('2. You\'ve exceeded your API credits or rate limits');
    console.log('3. The API key needs different permissions');
    console.log('\nCheck your Apollo account at: https://app.apollo.io/#/settings/integrations/api');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testApolloLimits();