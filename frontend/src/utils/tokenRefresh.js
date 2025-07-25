import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Decode JWT token to get expiration time
const getTokenExpiration = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    return null;
  }
};

// Check if token needs refresh (refresh if less than 5 minutes remaining)
const shouldRefreshToken = (token) => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return false;
  
  const now = Date.now();
  const timeUntilExpiry = expiration - now;
  const fiveMinutes = 5 * 60 * 1000;
  
  return timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0;
};

// Refresh the token
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken
    });
    
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    console.log('Token refreshed proactively');
    return true;
  } catch (error) {
    console.error('Proactive token refresh failed:', error);
    return false;
  }
};

// Set up automatic token refresh
let refreshInterval;
export const setupTokenRefresh = () => {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Check token every 2 minutes (increased from 30 seconds to reduce requests)
  refreshInterval = setInterval(async () => {
    const token = localStorage.getItem('accessToken');
    if (token && shouldRefreshToken(token)) {
      await refreshAccessToken();
    }
  }, 120000); // 2 minutes
  
  // Also refresh on visibility change (when user returns to tab)
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      const token = localStorage.getItem('accessToken');
      if (token && shouldRefreshToken(token)) {
        await refreshAccessToken();
      }
    }
  });
};

// Clean up function
export const cleanupTokenRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

// Call this when the app starts
export const initTokenRefresh = () => {
  setupTokenRefresh();
  
  // Also check immediately on init
  const token = localStorage.getItem('accessToken');
  if (token && shouldRefreshToken(token)) {
    refreshAccessToken();
  }
};