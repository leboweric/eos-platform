/**
 * Strip HTML tags from a string
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export const stripHtml = (html) => {
  if (!html) return '';
  
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Get text content and clean up
  return temp.textContent || temp.innerText || '';
};

/**
 * Truncate text to a specific length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text with ellipsis if needed
 */
export const truncateText = (text, length = 100) => {
  if (!text || text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * Get plain text preview from HTML
 * @param {string} html - HTML content
 * @param {number} length - Maximum length for preview
 * @returns {string} Plain text preview
 */
export const getTextPreview = (html, length = 100) => {
  const plainText = stripHtml(html);
  return truncateText(plainText, length);
};