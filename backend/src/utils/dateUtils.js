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