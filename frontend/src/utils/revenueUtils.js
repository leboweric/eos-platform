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
    case 'custom':
      // Return first 3-4 characters of custom label
      const custom = organization.revenue_metric_label || 'Revenue';
      return custom.length > 4 ? custom.substring(0, 4) : custom;
    case 'revenue':
    default:
      return 'Rev';
  }
};