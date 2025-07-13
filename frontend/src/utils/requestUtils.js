/**
 * Utility functions for managing API requests
 */

// Stagger multiple requests to avoid rate limiting
export const staggerRequests = (requests, delayMs = 100) => {
  return requests.map((request, index) => 
    new Promise(resolve => 
      setTimeout(() => resolve(request()), index * delayMs)
    )
  );
};

// Batch requests with a delay between batches
export const batchRequests = async (requests, batchSize = 3, delayMs = 200) => {
  const results = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(req => req()));
    results.push(...batchResults);
    
    // Delay before next batch (except for last batch)
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
};

// Debounce function for search/filter operations
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function to limit function calls
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};