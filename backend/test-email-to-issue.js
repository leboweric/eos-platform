import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testEmailToIssue() {
  console.log('Testing Email-to-Issue functionality...\n');

  const testPayload = {
    senderEmail: 'eric@axplatform.app', // Change to a valid user email in your system
    recipientEmail: 'issues@axplatform.app',
    subject: 'Website checkout page is slow',
    body: `The checkout page is taking 10+ seconds to load.

Multiple customers have reported this today.

Priority: high
Timeline: short_term

This is affecting our conversion rates.`
  };

  try {
    console.log('Sending test email data to webhook...');
    console.log('Payload:', testPayload);
    
    const response = await fetch(`${API_URL}/api/v1/email/test-inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Issue created:');
      console.log(`   Issue ID: #${result.issue.id}`);
      console.log(`   Title: ${result.issue.title}`);
      console.log(`   Status: ${result.issue.status}`);
      console.log(`   Timeline: ${result.issue.timeline}`);
      console.log(`   Created via: ${result.issue.created_via}`);
    } else {
      console.error('\n❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Error testing email-to-issue:', error.message);
  }
}

// Run the test
testEmailToIssue();