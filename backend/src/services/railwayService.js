/**
 * Railway API Service
 * Fetches logs from Railway's GraphQL API for monitoring
 */

const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2';
const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;
const RAILWAY_PROJECT_ID = process.env.RAILWAY_PROJECT_ID || '9fafe66a-9ed2-42cb-bb54-80a95c897f1b';
const RAILWAY_ENVIRONMENT_ID = process.env.RAILWAY_ENVIRONMENT_ID || '1184158c-ccb5-447b-8c6e-84dd350d7e2a';

/**
 * Execute a GraphQL query against Railway API
 */
async function executeQuery(query, variables = {}) {
  if (!RAILWAY_API_TOKEN) {
    throw new Error('RAILWAY_API_TOKEN environment variable is not set');
  }

  const response = await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RAILWAY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  
  if (result.errors) {
    console.error('Railway API errors:', result.errors);
    throw new Error(result.errors[0]?.message || 'Railway API error');
  }

  return result.data;
}

/**
 * Get environment logs from Railway
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of logs to fetch (default 100)
 * @param {string} options.filter - Filter string for log messages
 * @param {string} options.beforeDate - Get logs before this date (ISO string)
 * @param {string} options.afterDate - Get logs after this date (ISO string)
 * @param {string} options.severity - Filter by severity (error, warn, info)
 */
async function getEnvironmentLogs(options = {}) {
  const { limit = 100, filter = '', beforeDate, afterDate, severity } = options;

  let filterStr = filter;
  
  // Build the query with appropriate parameters
  const query = `
    query GetEnvironmentLogs($environmentId: String!, $beforeLimit: Int, $filter: String, $beforeDate: String, $afterDate: String) {
      environmentLogs(
        environmentId: $environmentId
        beforeLimit: $beforeLimit
        filter: $filter
        beforeDate: $beforeDate
        afterDate: $afterDate
      ) {
        message
        severity
        timestamp
        attributes {
          key
          value
        }
        tags {
          deploymentId
          deploymentInstanceId
          serviceId
          serviceName
        }
      }
    }
  `;

  const variables = {
    environmentId: RAILWAY_ENVIRONMENT_ID,
    beforeLimit: limit,
    filter: filterStr || undefined,
    beforeDate: beforeDate || undefined,
    afterDate: afterDate || undefined,
  };

  const data = await executeQuery(query, variables);
  let logs = data.environmentLogs || [];

  // Filter by severity if specified
  if (severity) {
    const severities = severity.split(',').map(s => s.trim().toLowerCase());
    logs = logs.filter(log => severities.includes(log.severity?.toLowerCase()));
  }

  return logs;
}

/**
 * Get logs aggregated by day with error counts
 * @param {number} days - Number of days to look back (default 7)
 */
async function getLogsSummaryByDay(days = 7) {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - days);

  const logs = await getEnvironmentLogs({
    limit: 5000,
    afterDate: afterDate.toISOString(),
  });

  // Aggregate by day and severity
  const summary = {};
  
  logs.forEach(log => {
    const date = log.timestamp.split('T')[0];
    if (!summary[date]) {
      summary[date] = {
        date,
        total: 0,
        error: 0,
        warn: 0,
        info: 0,
        logs: [],
      };
    }
    
    summary[date].total++;
    const sev = log.severity?.toLowerCase() || 'info';
    if (sev === 'error') summary[date].error++;
    else if (sev === 'warn' || sev === 'warning') summary[date].warn++;
    else summary[date].info++;
    
    // Keep error logs for details
    if (sev === 'error') {
      summary[date].logs.push(log);
    }
  });

  // Convert to array sorted by date
  return Object.values(summary).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get recent error logs
 * @param {number} limit - Number of errors to fetch
 */
async function getRecentErrors(limit = 50) {
  const logs = await getEnvironmentLogs({
    limit: 500,
    severity: 'error',
  });

  // Return only error logs, limited
  return logs.filter(log => log.severity?.toLowerCase() === 'error').slice(0, limit);
}

/**
 * Search logs by keyword
 * @param {string} keyword - Search term
 * @param {number} limit - Number of results
 */
async function searchLogs(keyword, limit = 100) {
  return getEnvironmentLogs({
    limit,
    filter: keyword,
  });
}

export default {
  getEnvironmentLogs,
  getLogsSummaryByDay,
  getRecentErrors,
  searchLogs,
};

export {
  getEnvironmentLogs,
  getLogsSummaryByDay,
  getRecentErrors,
  searchLogs,
};
