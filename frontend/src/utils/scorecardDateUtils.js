/**
 * Scorecard Date Range Utilities
 *
 * Calculates appropriate date ranges based on organization's scorecard time period preference.
 * Supports Adaptive Framework Technology for methodology-specific preferences.
 */

import { startOfQuarter, endOfQuarter, subWeeks, subMonths, subYears, format, getQuarter } from 'date-fns';

export const SCORECARD_PERIOD_OPTIONS = [
  { value: 'last_4_weeks', label: 'Last 4 Weeks' },
  { value: '13_week_rolling', label: '13-Week Rolling (EOS)' },
  { value: 'current_quarter', label: 'Current Quarter' },
  { value: 'last_3_months', label: '3 Months' },
  { value: 'last_6_months', label: '6 Months' },
  { value: 'last_1_year', label: '1 Year' },
  { value: 'custom', label: 'Custom Range' },
];

const parseDateInput = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  return new Date(`${dateInput}T12:00:00`);
};

/**
 * Get date range based on scorecard time period preference
 * @param {string} preference
 * @param {Date} referenceDate
 * @param {{ startDate?: string|Date, endDate?: string|Date }|null} customRange
 */
export const getDateRange = (preference, referenceDate = new Date(), customRange = null) => {
  const today = new Date(referenceDate);

  switch (preference) {
    case '13_week_rolling':
      return {
        startDate: subWeeks(today, 13),
        endDate: today,
        label: '13-Week Average',
        description: 'EOS Standard - Rolling 13-week performance',
      };

    case 'current_quarter': {
      const quarterStart = startOfQuarter(today);
      const quarterEnd = endOfQuarter(today);
      const quarterNumber = getQuarter(today);
      return {
        startDate: quarterStart,
        endDate: today < quarterEnd ? today : quarterEnd,
        label: `Q${quarterNumber} Average`,
        description: `Current Quarter (Q${quarterNumber}) performance`,
      };
    }

    case 'last_4_weeks':
      return {
        startDate: subWeeks(today, 4),
        endDate: today,
        label: '4-Week Average',
        description: 'Short-term focus - Last 4 weeks performance',
      };

    case 'last_3_months':
      return {
        startDate: subMonths(today, 3),
        endDate: today,
        label: '3-Month Average',
        description: 'Rolling 3-month performance',
      };

    case 'last_6_months':
      return {
        startDate: subMonths(today, 6),
        endDate: today,
        label: '6-Month Average',
        description: 'Rolling 6-month performance',
      };

    case 'last_1_year':
      return {
        startDate: subYears(today, 1),
        endDate: today,
        label: '1-Year Average',
        description: 'Rolling 1-year performance',
      };

    case 'custom': {
      const customStart = parseDateInput(customRange?.startDate);
      const customEnd = parseDateInput(customRange?.endDate);
      if (customStart && customEnd && !isNaN(customStart) && !isNaN(customEnd)) {
        return {
          startDate: customStart <= customEnd ? customStart : customEnd,
          endDate: customStart <= customEnd ? customEnd : customStart,
          label: 'Custom Average',
          description: 'Custom date range performance',
        };
      }
      return {
        startDate: subWeeks(today, 13),
        endDate: today,
        label: 'Custom Average',
        description: 'Select start and end dates',
      };
    }

    default:
      console.warn(`Invalid scorecard time period preference: ${preference}. Falling back to 13_week_rolling.`);
      return {
        startDate: subWeeks(today, 13),
        endDate: today,
        label: '13-Week Average',
        description: 'EOS Standard - Rolling 13-week performance (fallback)',
      };
  }
};

/**
 * Abbreviated label for the summary column header
 */
export const getSummaryColumnLabel = (preference, customRange = null, referenceDate = new Date()) => {
  const { label } = getDateRange(preference, referenceDate, customRange);
  return label
    .replace(' Average', '')
    .replace('13-Week', '13w')
    .replace('4-Week', '4w')
    .replace('3-Month', '3mo')
    .replace('6-Month', '6mo')
    .replace('1-Year', '1yr')
    .replace('Custom', 'Custom')
    + ' Summary';
};

/**
 * Filter scorecard scores data based on date range
 */
export const filterScoresByDateRange = (scores, startDate, endDate) => {
  const filtered = {};
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  Object.keys(scores || {}).forEach((metricId) => {
    filtered[metricId] = {};

    Object.keys(scores[metricId] || {}).forEach((dateStr) => {
      if (dateStr >= startStr && dateStr <= endStr) {
        filtered[metricId][dateStr] = scores[metricId][dateStr];
      }
    });
  });

  return filtered;
};

/**
 * Calculate average for a metric within the specified date range
 */
export const calculateAverageInRange = (metricScores, startDate, endDate) => {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const validScores = [];

  Object.keys(metricScores || {}).forEach((dateStr) => {
    if (dateStr >= startStr && dateStr <= endStr) {
      const score = metricScores[dateStr];
      const scoreValue = typeof score === 'object' && score !== null ? score?.value : score;

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
 * Calculate metric summary based on summary_type and time period preference
 */
export const calculateMetricSummary = (metric, scores, scorecardTimePeriodPreference, customDateRange = null) => {
  const summaryType = metric.summary_type || 'weekly_avg';
  const { startDate, endDate } = getDateRange(scorecardTimePeriodPreference, new Date(), customDateRange);
  const metricScores = scores || {};

  const scoresInRange = Object.entries(metricScores)
    .filter(([date]) => {
      const scoreDate = new Date(`${date}T12:00:00`);
      return scoreDate >= startDate && scoreDate <= endDate;
    })
    .map(([, scoreData]) => {
      const value = typeof scoreData === 'object' && scoreData !== null ? scoreData?.value : scoreData;
      return value !== undefined && value !== null && value !== '' ? parseFloat(value) : null;
    })
    .filter((val) => val !== null);

  if (scoresInRange.length === 0) return null;

  switch (summaryType) {
    case 'weekly_avg':
    case 'monthly_avg':
    case 'quarterly_avg':
      return scoresInRange.reduce((sum, val) => sum + val, 0) / scoresInRange.length;

    case 'quarterly_total':
      return scoresInRange.reduce((sum, val) => sum + val, 0);

    case 'latest_value': {
      const sortedDates = Object.keys(metricScores)
        .filter((date) => {
          const scoreDate = new Date(`${date}T12:00:00`);
          return scoreDate >= startDate && scoreDate <= endDate;
        })
        .sort((a, b) => new Date(b) - new Date(a));

      if (sortedDates.length === 0) return null;
      const latestScore = metricScores[sortedDates[0]];
      const latestValue = typeof latestScore === 'object' && latestScore !== null ? latestScore?.value : latestScore;
      return latestValue !== undefined && latestValue !== null && latestValue !== '' ? parseFloat(latestValue) : null;
    }

    default:
      return scoresInRange.reduce((sum, val) => sum + val, 0) / scoresInRange.length;
  }
};

export const getSummaryTypeLabel = (summaryType) => {
  switch (summaryType) {
    case 'weekly_avg':
    case 'monthly_avg':
    case 'quarterly_avg':
      return 'avg';
    case 'quarterly_total':
      return 'total';
    case 'latest_value':
      return 'latest';
    default:
      return 'avg';
  }
};

export const getScorecardPeriodStorageKey = (orgId) => `scorecardPeriod_${orgId}`;

export const loadScorecardPeriodPreference = (orgId, orgDefault = '13_week_rolling') => {
  if (!orgId) {
    return { preference: orgDefault, customDateRange: null };
  }

  try {
    const stored = localStorage.getItem(getScorecardPeriodStorageKey(orgId));
    if (!stored) {
      return { preference: orgDefault, customDateRange: null };
    }

    const parsed = JSON.parse(stored);
    return {
      preference: parsed.preference || orgDefault,
      customDateRange: parsed.customDateRange || null,
    };
  } catch {
    return { preference: orgDefault, customDateRange: null };
  }
};

export const saveScorecardPeriodPreference = (orgId, preference, customDateRange = null) => {
  if (!orgId) return;

  localStorage.setItem(
    getScorecardPeriodStorageKey(orgId),
    JSON.stringify({ preference, customDateRange })
  );
};

/**
 * Get terminology label based on methodology (future enhancement)
 */
export const getMethodologyLabel = (preference, methodology = 'eos') => {
  const labels = {
    eos: {
      '13_week_rolling': '13-Week Average',
      current_quarter: 'Quarter Average',
      last_4_weeks: '4-Week Average',
      last_3_months: '3-Month Average',
      last_6_months: '6-Month Average',
      last_1_year: '1-Year Average',
      custom: 'Custom Average',
    },
    okr: {
      '13_week_rolling': 'Quarter Average',
      current_quarter: 'Quarter Average',
      last_4_weeks: 'Monthly Average',
      last_3_months: 'Quarter Average',
      last_6_months: 'Half-Year Average',
      last_1_year: 'Annual Average',
      custom: 'Custom Average',
    },
    '4dx': {
      '13_week_rolling': 'WIG Period',
      current_quarter: 'WIG Quarter',
      last_4_weeks: 'WIG Month',
      last_3_months: 'WIG Quarter',
      last_6_months: 'WIG Half-Year',
      last_1_year: 'WIG Year',
      custom: 'Custom Period',
    },
  };

  return labels[methodology]?.[preference] || labels.eos[preference] || '13-Week Average';
};