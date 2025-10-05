/**
 * Scorecard Date Range Utilities
 * 
 * Calculates appropriate date ranges based on organization's scorecard time period preference.
 * Supports Adaptive Framework Technology for methodology-specific preferences.
 */

import { startOfQuarter, endOfQuarter, subWeeks, format, getQuarter } from 'date-fns';

/**
 * Get date range based on organization's scorecard time period preference
 * @param {string} preference - One of: '13_week_rolling', 'current_quarter', 'last_4_weeks'
 * @param {Date} referenceDate - The reference date (usually today)
 * @returns {Object} - Object with startDate, endDate, and label
 */
export const getDateRange = (preference, referenceDate = new Date()) => {
  const today = new Date(referenceDate);
  
  switch (preference) {
    case '13_week_rolling':
      return {
        startDate: subWeeks(today, 13),
        endDate: today,
        label: '13-Week Average',
        description: 'EOS Standard - Rolling 13-week performance'
      };
      
    case 'current_quarter':
      const quarterStart = startOfQuarter(today);
      const quarterEnd = endOfQuarter(today);
      const quarterNumber = getQuarter(today);
      return {
        startDate: quarterStart,
        endDate: today < quarterEnd ? today : quarterEnd,
        label: `Q${quarterNumber} Average`,
        description: `Current Quarter (Q${quarterNumber}) performance`
      };
      
    case 'last_4_weeks':
      return {
        startDate: subWeeks(today, 4),
        endDate: today,
        label: '4-Week Average',
        description: 'Short-term focus - Last 4 weeks performance'
      };
      
    default:
      // Fallback to 13-week rolling if invalid preference
      console.warn(`Invalid scorecard time period preference: ${preference}. Falling back to 13_week_rolling.`);
      return {
        startDate: subWeeks(today, 13),
        endDate: today,
        label: '13-Week Average',
        description: 'EOS Standard - Rolling 13-week performance (fallback)'
      };
  }
};

/**
 * Filter scorecard scores data based on date range
 * @param {Object} scores - The scores object (metric_id -> date -> score)
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Object} - Filtered scores object
 */
export const filterScoresByDateRange = (scores, startDate, endDate) => {
  const filtered = {};
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');
  
  Object.keys(scores || {}).forEach(metricId => {
    filtered[metricId] = {};
    
    Object.keys(scores[metricId] || {}).forEach(dateStr => {
      // Check if date is within range
      if (dateStr >= startStr && dateStr <= endStr) {
        filtered[metricId][dateStr] = scores[metricId][dateStr];
      }
    });
  });
  
  return filtered;
};

/**
 * Calculate average for a metric within the specified date range
 * @param {Object} metricScores - Scores for a single metric (date -> score)
 * @param {Date} startDate - Start date for calculation
 * @param {Date} endDate - End date for calculation
 * @returns {number|null} - Average score or null if no data
 */
export const calculateAverageInRange = (metricScores, startDate, endDate) => {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');
  
  const validScores = [];
  
  Object.keys(metricScores || {}).forEach(dateStr => {
    if (dateStr >= startStr && dateStr <= endStr) {
      const score = metricScores[dateStr];
      const scoreValue = (typeof score === 'object' && score !== null) ? score?.value : score;
      
      if (scoreValue !== undefined && scoreValue !== null && scoreValue !== '') {
        validScores.push(parseFloat(scoreValue));
      }
    }
  });
  
  if (validScores.length === 0) {
    return null;
  }
  
  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
};

/**
 * Get terminology label based on methodology (future enhancement)
 * @param {string} preference - Time period preference
 * @param {string} methodology - Organization methodology (eos, okr, 4dx, etc.)
 * @returns {string} - Appropriate label for the methodology
 */
export const getMethodologyLabel = (preference, methodology = 'eos') => {
  const labels = {
    eos: {
      '13_week_rolling': '13-Week Average',
      'current_quarter': 'Quarter Average',
      'last_4_weeks': '4-Week Average'
    },
    okr: {
      '13_week_rolling': 'Quarter Average',
      'current_quarter': 'Quarter Average', 
      'last_4_weeks': 'Monthly Average'
    },
    '4dx': {
      '13_week_rolling': 'WIG Period',
      'current_quarter': 'WIG Quarter',
      'last_4_weeks': 'WIG Month'
    }
  };
  
  return labels[methodology]?.[preference] || labels.eos[preference] || '13-Week Average';
};