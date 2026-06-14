/**
 * Webhook authentication middleware
 * Validates webhook requests from external services
 */

export const authenticateWebhook = (req, res, next) => {
  // For SendGrid, you can optionally validate with a shared secret
  // SendGrid can be configured to send a custom header with a secret token
  
  const webhookSecret = process.env.SENDGRID_WEBHOOK_SECRET;
  
  if (webhookSecret) {
    const providedSecret = req.headers['x-webhook-secret'] || req.headers['authorization'];
    
    if (providedSecret !== webhookSecret) {
      console.warn('[WebhookAuth] Invalid webhook secret provided');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }
  
  // Log the webhook source for monitoring
  console.log(`[WebhookAuth] Webhook received from IP: ${req.ip}`);
  
  next();
};