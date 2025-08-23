import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  trackingConfig, 
  initializeApolloTracking, 
  trackApolloEvent,
  identifyApolloVisitor 
} from '../config/tracking';

// Custom hook for Apollo tracking integration
export const useApolloTracking = () => {
  const location = useLocation();
  
  // Initialize tracking on mount
  useEffect(() => {
    initializeApolloTracking();
  }, []);
  
  // Track page views on route change
  useEffect(() => {
    if (trackingConfig.apollo.enabled && window.apollo) {
      // Track page view
      trackApolloEvent('Page View', {
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        url: window.location.href
      });
      
      // Special tracking for key pages
      if (location.pathname === '/register') {
        trackApolloEvent('Registration Page Viewed');
      } else if (location.pathname === '/login') {
        trackApolloEvent('Login Page Viewed');
      } else if (location.pathname === '/') {
        trackApolloEvent('Landing Page Viewed');
      }
    }
  }, [location]);
  
  // Return tracking utilities
  return {
    trackEvent: trackApolloEvent,
    identifyVisitor: identifyApolloVisitor,
    isEnabled: trackingConfig.apollo.enabled
  };
};

// Hook to track conversion events
export const useTrackConversion = () => {
  const { trackEvent } = useApolloTracking();
  
  const trackSignup = (email, companyName) => {
    trackEvent('Trial Started', {
      email,
      company: companyName,
      timestamp: new Date().toISOString()
    });
  };
  
  const trackDemo = (email, companyName) => {
    trackEvent('Demo Requested', {
      email,
      company: companyName,
      timestamp: new Date().toISOString()
    });
  };
  
  const trackFeatureInterest = (feature) => {
    trackEvent('Feature Interest', {
      feature,
      timestamp: new Date().toISOString()
    });
  };
  
  return {
    trackSignup,
    trackDemo,
    trackFeatureInterest
  };
};