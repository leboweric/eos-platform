import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

// Load environment variables FIRST
dotenv.config();

// Now set the API key
const apiKey = process.env.SENDGRID_API_KEY;
console.log('🔑 Using API key:', apiKey?.substring(0, 20) + '...');

sgMail.setApiKey(apiKey);

async function sendTestEmail() {
  const msg = {
    to: 'eric@profitbuildernetwork.com',
    from: 'noreply@axp.com',
    subject: 'Test Email from AXP',
    text: 'This is a test email to verify SendGrid is working correctly.',
    html: '<strong>This is a test email to verify SendGrid is working correctly.</strong>',
  };

  try {
    console.log('📧 Sending email...');
    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully!');
    console.log('Response status:', response[0].statusCode);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response body:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

sendTestEmail();