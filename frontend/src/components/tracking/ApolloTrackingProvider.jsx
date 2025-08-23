import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApolloTracking } from '../../hooks/useApolloTracking';

const ApolloTrackingProvider = ({ children }) => {
  // Initialize Apollo tracking
  useApolloTracking();
  
  return children;
};

export default ApolloTrackingProvider;