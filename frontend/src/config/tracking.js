// Apollo.io Website Visitor Tracking Configuration
// This file manages all tracking settings for marketing analytics

export const trackingConfig = {
  apollo: {
    // Apollo tracking is now active
    enabled: true,
    
    // Your Apollo app ID
    appId: '68aa0c1fd256ed000d90dd16',
    
    // Domains to track (production only by default)
    allowedDomains: ['axplatform.app', 'www.axplatform.app'],
    
    // Enable debug logging in development
    debug: process.env.NODE_ENV === 'development'
  },
  
  // Google Analytics configuration
  googleAnalytics: {
    enabled: false,
    measurementId: 'G-XXXXXXXXXX'
  }
};

// Helper function to initialize Apollo tracking
export const initializeApolloTracking = () => {
  if (!trackingConfig.apollo.enabled) {
    if (trackingConfig.apollo.debug) {
      console.log('Apollo tracking is disabled');
    }
    return;
  }
  
  // Only track on production domains
  const currentDomain = window.location.hostname;
  if (!trackingConfig.apollo.allowedDomains.includes(currentDomain)) {
    if (trackingConfig.apollo.debug) {
      console.log(`Apollo tracking skipped for domain: ${currentDomain}`);
    }
    return;
  }
  
  // Check if Apollo script is already loaded
  if (window.apollo && window.apollo.websiteTrackingId) {
    if (trackingConfig.apollo.debug) {
      console.log('Apollo tracking already initialized');
    }
    return;
  }
  
  // Log tracking initialization
  if (trackingConfig.apollo.debug) {
    console.log('Initializing Apollo tracking...');
  }
  
  // Apollo tracking will be initialized via the script tag in index.html
  // This function is for future programmatic initialization if needed
};

// Helper function to track custom events (for future use)
export const trackApolloEvent = (eventName, eventData = {}) => {
  if (!trackingConfig.apollo.enabled || !window.apollo) {
    return;
  }
  
  // Apollo custom event tracking (when available)
  if (window.apollo && window.apollo.track) {
    window.apollo.track(eventName, eventData);
  }
};

// Helper function to identify visitors (for future use when integrated with auth)
export const identifyApolloVisitor = (userId, traits = {}) => {
  if (!trackingConfig.apollo.enabled || !window.apollo) {
    return;
  }
  
  // Apollo visitor identification (when available)
  if (window.apollo && window.apollo.identify) {
    window.apollo.identify(userId, traits);
  }
};