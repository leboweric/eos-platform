import axios from 'axios';

// Create axios instance with default config
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request queue to handle rate limiting
let requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const REQUEST_DELAY = 100; // ms between requests

// Process queue
const processQueue = async () => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  activeRequests++;
  const { config, resolve, reject } = requestQueue.shift();

  try {
    const response = await axios(config);
    resolve(response);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    setTimeout(processQueue, REQUEST_DELAY);
  }
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
    const token = authStore?.state?.token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request to queue
    return new Promise((resolve, reject) => {
      requestQueue.push({ config, resolve, reject });
      processQueue();
    });
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
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
      
      // Clear auth state
      localStorage.removeItem('auth-store');
      
      // Redirect to login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;