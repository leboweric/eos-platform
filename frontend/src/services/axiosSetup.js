import axios from 'axios';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic for 429 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 429 (Too Many Requests)
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Get retry delay from header or use exponential backoff
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : Math.min(1000 * Math.pow(2, originalRequest._retryCount || 0), 30000);
      
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      // Max 3 retries
      if (originalRequest._retryCount <= 3) {
        console.log(`Rate limited. Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return axiosInstance(originalRequest);
      }
    }

    // Handle 401 (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Don't handle auth endpoints
      if (!originalRequest.url?.includes('/auth/')) {
        // Clear auth state
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Redirect to login
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;