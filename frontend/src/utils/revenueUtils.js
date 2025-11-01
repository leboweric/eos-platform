/**
 * Revenue metric utility functions
 */

/**
 * Get the display label for revenue based on organization settings
 * @param {Object} organization - The organization object with revenue_metric_type and revenue_metric_label
 * @returns {string} The label to display (e.g., "Revenue", "AUM", "ARR", or custom label)
 */
export const getRevenueLabel = (organization) => {
  if (!organization) return 'Revenue';
  
  switch (organization.revenue_metric_type) {
    case 'aum':
      return 'AUM';
    case 'arr':
      return 'ARR';
    case 'custom':
      return organization.revenue_metric_label || 'Revenue';
    case 'revenue':
    default:
      return 'Revenue';
  }
};

/**
 * Get the full label for revenue (e.g., "Revenue Target", "AUM Target")
 * @param {Object} organization - The organization object
 * @param {string} suffix - The suffix to add (e.g., "Target", "Goal")
 * @returns {string} The full label
 */
export const getRevenueLabelWithSuffix = (organization, suffix) => {
  const label = getRevenueLabel(organization);
  return `${label} ${suffix}`;
};

/**
 * Get abbreviation for the revenue type (for compact displays)
 * @param {Object} organization - The organization object
 * @returns {string} Abbreviated label
 */
export const getRevenueAbbreviation = (organization) => {
  if (!organization) return 'Rev';
  
  switch (organization.revenue_metric_type) {
    case 'aum':
      return 'AUM';
    case 'arr':
      return 'ARR';
    case 'custom': {
      // Return first 3-4 characters of custom label
      const custom = organization.revenue_metric_label || 'Revenue';
      return custom.length > 4 ? custom.substring(0, 4) : custom;
    }
    case 'revenue':
    default:
      return 'Rev';
  }
};

/**
 * Format currency values for display in view mode
 * Adds proper M/K/B suffixes and handles all currency formatting cases
 * @param {string|number} value - The currency value to format
 * @returns {string} Formatted currency string (e.g., "$650M", "Not set")
 */
export const formatCurrency = (value) => {
  // Handle null, undefined, empty, or "Not set"
  if (!value || value === 'Not set' || value === 'null' || value === '') {
    return 'Not set';
  }

  // Convert to string for processing
  const strValue = String(value).trim();

  // If already formatted with $ and M/K/B, return as is
  if (strValue.includes('$') && /[MKB]/i.test(strValue)) {
    return strValue;
  }

  // If it has M/K/B suffix but no $, add $ prefix
  if (/^\d+(\.\d+)?\s*[MKB]$/i.test(strValue)) {
    return `$${strValue}`;
  }

  // If it already has $ but no M/K/B, check if we need to add M
  if (strValue.includes('$')) {
    // Extract the number
    const numStr = strValue.replace('$', '').trim();
    const num = parseFloat(numStr);
    
    // If it's a reasonable revenue number (> 1), assume it's in millions
    if (!isNaN(num) && num > 0) {
      return `$${num}M`;
    }
    
    return strValue;
  }

  // Handle pure numbers or strings without $ or M/K/B
  const num = parseFloat(strValue);
  
  if (isNaN(num)) {
    return strValue; // Return as-is if not a number
  }

  // If the number is very large (>= 1,000,000), it's in actual dollars
  if (num >= 1000000) {
    const millions = num / 1000000;
    return `$${millions}M`;
  }
  
  // If the number is between 1000 and 1,000,000, it's in thousands
  if (num >= 1000) {
    const thousands = num / 1000;
    return `$${thousands}K`;
  }
  
  // Otherwise, assume it's already in millions (most common for revenue targets)
  // This handles cases like "650" which means "$650M"
  return `$${num}M`;
};