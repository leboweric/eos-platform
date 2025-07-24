import axios from 'axios';

// Simple axios instance with just the essentials
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug FormData handling
    console.log('=== AXIOS INTERCEPTOR DEBUG ===');
    console.log('Request config:', config.url);
    console.log('Data type:', config.data?.constructor?.name);
    console.log('Is FormData?:', config.data instanceof FormData);
    console.log('Headers before:', config.headers);
    
    // Don't override Content-Type for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log('Headers after removing Content-Type:', config.headers);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Simple 401 handling - don't redirect on auth endpoints
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;