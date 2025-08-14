import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the Excel sheet
 * @param {Array} columnOrder - Optional array of column keys to specify order
 * @param {Object} columnHeaders - Optional mapping of keys to display names
 */
export const exportToExcel = (data, filename, sheetName = 'Sheet1', columnOrder = null, columnHeaders = null) => {
  // If no data, return early
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Transform data if column headers are provided
  let exportData = data;
  if (columnHeaders) {
    exportData = data.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        const header = columnHeaders[key] || key;
        newRow[header] = row[key];
      });
      return newRow;
    });
  }

  // If column order is specified, reorder the data
  if (columnOrder) {
    exportData = exportData.map(row => {
      const orderedRow = {};
      columnOrder.forEach(key => {
        const header = columnHeaders ? (columnHeaders[key] || key) : key;
        if (columnHeaders) {
          // Find the original key that maps to this header
          const originalKey = Object.keys(columnHeaders).find(k => columnHeaders[k] === header) || key;
          orderedRow[header] = row[header];
        } else {
          orderedRow[key] = row[key];
        }
      });
      return orderedRow;
    });
  }

  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // Auto-size columns
  const maxWidth = 50;
  const wscols = [];
  if (exportData.length > 0) {
    Object.keys(exportData[0]).forEach((key, i) => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map(row => (row[key] ? String(row[key]).length : 0))
      );
      wscols[i] = { wch: Math.min(maxLength + 2, maxWidth) };
    });
  }
  ws['!cols'] = wscols;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate Excel file and trigger download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Export Issues to Excel
 */
export const exportIssuesToExcel = (issues) => {
  const exportData = issues.map(issue => ({
    title: issue.title,
    description: issue.description || '',
    status: issue.status,
    timeline: issue.timeline === 'short_term' ? 'Short Term' : 'Long Term',
    owner: issue.owner_name || 'Unassigned',
    team: issue.team_name || '',
    votes: issue.vote_count || 0,
    attachments: issue.attachment_count || 0,
    created: new Date(issue.created_at).toLocaleDateString(),
    updated: issue.updated_at ? new Date(issue.updated_at).toLocaleDateString() : ''
  }));

  const columnHeaders = {
    title: 'Title',
    description: 'Description',
    status: 'Status',
    timeline: 'Timeline',
    owner: 'Owner',
    team: 'Team',
    votes: 'Votes',
    attachments: 'Attachments',
    created: 'Created Date',
    updated: 'Last Updated'
  };

  const columnOrder = ['title', 'description', 'status', 'timeline', 'owner', 'team', 'votes', 'attachments', 'created', 'updated'];

  exportToExcel(exportData, 'issues', 'Issues', columnOrder, columnHeaders);
};

/**
 * Export To-Dos to Excel
 */
export const exportTodosToExcel = (todos) => {
  const exportData = todos.map(todo => ({
    title: todo.title,
    description: todo.description || '',
    status: todo.status,
    priority: todo.priority || 'Medium',
    assignee: todo.assignee_name || 'Unassigned',
    dueDate: todo.due_date ? new Date(todo.due_date).toLocaleDateString() : '',
    department: todo.department_name || '',
    relatedPriority: todo.related_priority_name || '',
    created: new Date(todo.created_at).toLocaleDateString(),
    completed: todo.completed_at ? new Date(todo.completed_at).toLocaleDateString() : ''
  }));

  const columnHeaders = {
    title: 'Title',
    description: 'Description',
    status: 'Status',
    priority: 'Priority',
    assignee: 'Assignee',
    dueDate: 'Due Date',
    department: 'Department',
    relatedPriority: 'Related Priority',
    created: 'Created Date',
    completed: 'Completed Date'
  };

  const columnOrder = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'department', 'relatedPriority', 'created', 'completed'];

  exportToExcel(exportData, 'todos', 'To-Dos', columnOrder, columnHeaders);
};