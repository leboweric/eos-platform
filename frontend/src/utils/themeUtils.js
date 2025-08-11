// Utility functions for managing organization-specific themes

export const getThemeStorageKey = (orgId) => {
  if (!orgId) return null;
  return `orgTheme_${orgId}`;
};

export const saveOrgTheme = (orgId, theme) => {
  if (!orgId || !theme) return;
  const key = getThemeStorageKey(orgId);
  if (key) {
    localStorage.setItem(key, JSON.stringify(theme));
    // Clean up old global theme if it exists
    localStorage.removeItem('orgTheme');
  }
};

export const getOrgTheme = (orgId) => {
  if (!orgId) return null;
  const key = getThemeStorageKey(orgId);
  if (!key) return null;
  
  const savedTheme = localStorage.getItem(key);
  if (savedTheme) {
    try {
      return JSON.parse(savedTheme);
    } catch (e) {
      console.error('Failed to parse saved theme:', e);
      return null;
    }
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