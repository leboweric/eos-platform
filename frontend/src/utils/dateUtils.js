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
  return new Date(year, month - 1, day);
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