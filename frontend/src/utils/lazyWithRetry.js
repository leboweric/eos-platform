import React from 'react';

// Utility to handle lazy loading with retry on failure
// This helps when assets change after deployment

export function lazyWithRetry(componentImport) {
  return new Promise((resolve, reject) => {
    // Check if we've already failed to load this once
    const hasRefreshed = JSON.parse(
      window.sessionStorage.getItem('has_refreshed_for_lazy_load') || 'false'
    );

    componentImport()
      .then((component) => {
        // Success - clear the refresh flag
        window.sessionStorage.setItem('has_refreshed_for_lazy_load', 'false');
        resolve(component);
      })
      .catch((error) => {
        // If we haven't refreshed yet and it's a loading error, try refreshing once
        if (!hasRefreshed && (
          error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Loading CSS chunk') ||
          error.message.includes('Loading chunk')
        )) {
          // Set flag to prevent infinite refresh loop
          window.sessionStorage.setItem('has_refreshed_for_lazy_load', 'true');
          // Refresh the page to get the latest assets
          window.location.reload();
        } else {
          // If we've already refreshed or it's a different error, reject
          reject(error);
        }
      });
  });
}

// Wrapper for lazy function
export const lazy = (importFunc) => {
  return React.lazy(() => lazyWithRetry(importFunc));
};