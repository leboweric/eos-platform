import dotenv from 'dotenv';
import { sendEmail } from './services/emailService.js';

// Load environment variables
dotenv.config();

async function testSendGridEmail() {
  console.log('🧪 Testing SendGrid Email Configuration...\n');
  
  // Check if API key is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY is not set in environment variables');
    return;
  }
  
  console.log('✅ SendGrid API key found');
  console.log(`📧 FROM email: ${process.env.SENDGRID_FROM_EMAIL || 'noreply@axp.com'}`);
  
  // Test email address - you should change this to your email
  const testEmail = 'eric@profitbuildernetwork.com';
  
  console.log(`\n📨 Attempting to send test email to: ${testEmail}`);
  
  try {
    // Send a password reset email as a test
    await sendEmail(testEmail, 'passwordReset', {
      firstName: 'Test User',
      resetLink: 'https://axp.com/reset-password?token=test-token-123'
    });
    
    console.log('\n✅ Email sent successfully!');
    console.log('Check your inbox for a password reset email.');
    
  } catch (error) {
    console.error('\n❌ Failed to send email:', error.message);
    if (error.response) {
      console.error('SendGrid API Response:', error.response.body);
    }
  }
}

// Run the test
testSendGridEmail();