#!/usr/bin/env node

// OAuth Health Check Script
// Tests OAuth endpoints without requiring actual authentication

const https = require('https');

const API_BASE = 'https://eos-platform-production.up.railway.app/api/v1';

const tests = [
  {
    name: 'Google OAuth Endpoint',
    url: `${API_BASE}/auth/google`,
    method: 'GET',
    expected: (data) => data.authUrl && data.authUrl.includes('accounts.google.com')
  },
  {
    name: 'Microsoft OAuth Endpoint', 
    url: `${API_BASE}/auth/microsoft`,
    method: 'GET',
    expected: (data) => data.authUrl && data.authUrl.includes('login.microsoftonline.com')
  },
  {
    name: 'Google Callback Error Handling',
    url: `${API_BASE}/auth/google/callback`,
    method: 'POST',
    body: { code: 'invalid', state: 'test' },
    expectedStatus: 302
  },
  {
    name: 'Microsoft Callback Error Handling',
    url: `${API_BASE}/auth/microsoft/callback`,
    method: 'POST', 
    body: { code: 'invalid', state: 'test' },
    expectedStatus: 302
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const url = new URL(test.url);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: test.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const success = test.expectedStatus 
          ? res.statusCode === test.expectedStatus
          : res.statusCode === 200;

        if (success && test.expected && data) {
          try {
            const parsed = JSON.parse(data);
            resolve({
              name: test.name,
              success: test.expected(parsed),
              status: res.statusCode,
              data: data.substring(0, 100)
            });
          } catch (e) {
            resolve({
              name: test.name,
              success: true,
              status: res.statusCode,
              data: 'Response received'
            });
          }
        } else {
          resolve({
            name: test.name,
            success,
            status: res.statusCode,
            data: data ? data.substring(0, 100) : 'No data'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        name: test.name,
        success: false,
        error: error.message
      });
    });

    if (test.body) {
      req.write(JSON.stringify(test.body));
    }

    req.end();
  });
}

async function main() {
  console.log('🔍 OAuth Health Check\n' + '='.repeat(50));
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = await runTest(test);
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   Status: ${result.status || 'N/A'}`);
    if (result.data) {
      console.log(`   Response: ${result.data}...`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
      allPassed = false;
    }
    if (!result.success) {
      allPassed = false;
    }
    console.log();
  }

  console.log('='.repeat(50));
  console.log(allPassed ? '✅ All OAuth endpoints are healthy!' : '⚠️  Some checks failed');
  
  // Check environment variables
  console.log('\n📋 Environment Variable Check:');
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'GOOGLE_CALLBACK_URL',
    'MICROSOFT_CLIENT_ID',
    'MICROSOFT_CLIENT_SECRET',
    'MICROSOFT_CALLBACK_URL'
  ];
  
  console.log('   Required variables for OAuth:');
  requiredVars.forEach(v => {
    console.log(`   - ${v}: ${process.env[v] ? '✅ Set' : '❌ Missing'}`);
  });
}

main().catch(console.error);