// Utility functions for managing organization-specific themes

export const getThemeStorageKey = (orgId) => {
  if (!orgId) return null;
  return `orgTheme_${orgId}`;
};

export const saveOrgTheme = (orgId, theme) => {
  if (!orgId || !theme) {
    console.warn('saveOrgTheme: Missing orgId or theme', { orgId, theme });
    return;
  }
  const key = getThemeStorageKey(orgId);
  if (key) {
    console.log('Saving theme for org:', orgId, 'with key:', key, theme);
    localStorage.setItem(key, JSON.stringify(theme));
    // Clean up old global theme if it exists
    localStorage.removeItem('orgTheme');
  }
};

export const getOrgTheme = (orgId) => {
  if (!orgId) {
    console.warn('getOrgTheme: No orgId provided');
    return null;
  }
  const key = getThemeStorageKey(orgId);
  if (!key) return null;
  
  console.log('Looking for theme with key:', key);
  const savedTheme = localStorage.getItem(key);
  if (savedTheme) {
    try {
      const parsed = JSON.parse(savedTheme);
      console.log('Found saved theme for org:', orgId, parsed);
      return parsed;
    } catch (e) {
      console.error('Failed to parse saved theme:', e);
      return null;
    }
  } else {
    console.log('No saved theme found for org:', orgId);
  }
  
  // Fallback to old global theme if exists (for migration)
  const oldTheme = localStorage.getItem('orgTheme');
  if (oldTheme) {
    try {
      const theme = JSON.parse(oldTheme);
      // Migrate to org-specific storage
      saveOrgTheme(orgId, theme);
      return theme;
    } catch (e) {
      console.error('Failed to parse old theme:', e);
      return null;
    }
  }
  
  return null;
};

export const clearGlobalTheme = () => {
  localStorage.removeItem('orgTheme');
};

// Convert hex color to rgba with opacity
export const hexToRgba = (hex, opacity) => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};