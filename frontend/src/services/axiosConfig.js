import axios from 'axios';

// Simple axios instance with just the essentials
// Timeout increased to 120s to handle large transcription uploads from 30+ minute meetings
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 120000,  // 2 minutes - needed for large transcript uploads
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to check if token is expired or will expire soon
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    // Check if token expires within next 5 minutes
    return payload.exp < (currentTime + 300);
  } catch (error) {
    return true;
  }
};

let refreshInFlight = null;

const performTokenRefresh = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(
    `${apiClient.defaults.baseURL}/auth/refresh`,
    { refreshToken }
  );

  const { accessToken, refreshToken: newRefreshToken } = response.data.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);
  return accessToken;
};

const refreshTokenProactively = async () => {
  if (!refreshInFlight) {
    refreshInFlight = performTokenRefresh()
      .then((token) => {
        console.log('✅ Token refresh successful');
        return token;
      })
      .catch((error) => {
        console.error('❌ Token refresh failed:', error);
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  try {
    await refreshInFlight;
    return true;
  } catch {
    return false;
  }
};

// Add auth token to requests with proactive refresh
apiClient.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('accessToken');
    
    // Check if token needs refresh before making request
    if (isTokenExpired(token)) {
      console.log('🔄 Token expired, refreshing before request...');
      const refreshSuccess = await refreshTokenProactively();
      if (refreshSuccess) {
        token = localStorage.getItem('accessToken');
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't override Content-Type for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors (token expired)
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/auth/')
    ) {
      originalRequest._retry = true;
      
      console.log('🔄 Token expired, attempting refresh...');
      
      try {
        console.log('🔄 Calling refresh endpoint...');
        const accessToken = await (refreshInFlight || (refreshInFlight = performTokenRefresh().finally(() => {
          refreshInFlight = null;
        })));

        console.log('✅ Token refresh successful, retrying original request');

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError.response?.data || refreshError.message);
        
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Only redirect if we're not already on auth pages
        if (!window.location.pathname.match(/^\/(login|register|consultant-register|$)/)) {
          console.log('🔄 Redirecting to login...');
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;