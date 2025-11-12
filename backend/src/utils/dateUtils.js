/**
 * Date utility functions to handle date formatting without timezone issues
 */

/**
 * Format a date as YYYY-MM-DD in local time (not UTC)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Date formatted as YYYY-MM-DD
 */
export const formatDateLocal = (date) => {
  // If it's already a string in YYYY-MM-DD format, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // If it's a Date object, format it
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If it's a string but not in YYYY-MM-DD format, parse it carefully
  // Use parseDateLocal to avoid UTC conversion, then format
  const parsed = parseDateLocal(date);
  if (parsed) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Fallback: return the input as-is
  return date;
};

/**
 * Parse a date string as a local date (avoiding UTC conversion)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date|null} Date object in local time
 */
export const parseDateLocal = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
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