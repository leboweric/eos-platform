/**
 * Date utility functions to handle date formatting without timezone issues
 */

/**
 * Format a date as YYYY-MM-DD in local time (not UTC)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Date formatted as YYYY-MM-DD
 */
export const formatDateLocal = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse a date string as a local date (avoiding UTC conversion)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date|null} Date object in local time
 */
export const parseDateLocal = (dateStr) => {
  if (!dateStr) return null;
  // Handle dates that might have time component
  const dateOnly = dateStr.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(num => parseInt(num));
  // Create date at noon to avoid DST/timezone issues (same as formatDateSafe)
  return new Date(year, month - 1, day, 12, 0, 0);
};

/**
 * Get a date N days from now in YYYY-MM-DD format
 * @param {number} days - Number of days to add
 * @returns {string} Date formatted as YYYY-MM-DD
 */
export const getDateDaysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateLocal(date);
};

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDateDisplay = (dateString) => {
  if (!dateString) return '';
  const date = parseDateLocal(dateString);
  if (!date) return '';
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Timezone-safe date formatting using date-fns patterns
 * @param {string|Date} dateString - Date string or Date object  
 * @param {string} pattern - Format pattern (e.g., 'MMM d', 'MMM dd, yyyy')
 * @returns {string} Formatted date string
 */
export const formatDateSafe = (dateString, pattern = 'MMM d, yyyy') => {
  if (!dateString) return '';
  
  let datePart = dateString;
  
  // If it's an ISO string with time, extract just the date part
  if (typeof dateString === 'string' && dateString.includes('T')) {
    datePart = dateString.split('T')[0];
  }
  
  // If it's already in YYYY-MM-DD format or we extracted it
  if (typeof datePart === 'string' && datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date in local timezone to avoid shifts (set to noon to avoid DST issues)
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    // Map common date-fns patterns to native formatting
    if (pattern === 'MMM d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (pattern === 'MMM dd, yyyy') {
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } else if (pattern === 'MMM d, yyyy') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    // Default fallback
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  // Fallback for other date formats
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    // Create a local date to avoid timezone shifts
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid date';
  }
};