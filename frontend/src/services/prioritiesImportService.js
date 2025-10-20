import { api } from './api';

export const prioritiesImportService = {
  /**
   * Get the import template information
   */
  async getTemplate() {
    try {
      const response = await api.get('/priorities/import/template');
      return response.data.template;
    } catch (error) {
      console.error('Failed to get import template:', error);
      throw new Error(error.response?.data?.error || 'Failed to get import template');
    }
  },

  /**
   * Preview CSV import without saving
   * @param {FormData} formData - Contains file, organizationId, teamId
   */
  async previewImport(formData) {
    try {
      const response = await api.post('/priorities/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.preview;
    } catch (error) {
      console.error('Failed to preview import:', error);
      throw new Error(error.response?.data?.error || 'Failed to preview import');
    }
  },

  /**
   * Execute the actual import
   * @param {FormData} formData - Contains file, organizationId, teamId, conflictStrategy, assigneeMappings
   */
  async executeImport(formData) {
    try {
      const response = await api.post('/priorities/import/execute', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.results;
    } catch (error) {
      console.error('Failed to execute import:', error);
      throw new Error(error.response?.data?.error || 'Failed to execute import');
    }
  },

  /**
   * Validate CSV file before upload
   * @param {File} file - The CSV file to validate
   */
  validateCSVFile(file) {
    const errors = [];
    
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      errors.push('File must be a CSV file');
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }
    
    // Check if file is empty
    if (file.size === 0) {
      errors.push('File cannot be empty');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Parse CSV content for client-side validation
   * @param {File} file - The CSV file to parse
   */
  async parseCSVFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          
          if (lines.length < 2) {
            reject(new Error('CSV file must contain at least a header row and one data row'));
            return;
          }
          
          // Parse header
          const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
          
          // Parse first few rows for preview
          const rows = [];
          for (let i = 1; i < Math.min(lines.length, 11); i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(',').map(val => val.trim().replace(/"/g, ''));
              const row = {};
              header.forEach((col, index) => {
                row[col] = values[index] || '';
              });
              rows.push(row);
            }
          }
          
          resolve({
            headers: header,
            rows: rows,
            totalRows: lines.length - 1
          });
        } catch (error) {
          reject(new Error('Failed to parse CSV file: ' + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  },

  /**
   * Generate CSV template content
   * @param {Object} template - Template data from API
   */
  generateCSVTemplate(template) {
    if (!template) return '';
    
    const headers = [...template.required_columns, ...template.optional_columns];
    const csvContent = [
      // Headers
      headers.join(','),
      // Example data
      ...template.example_data.map(row => 
        headers.map(col => `"${row[col] || ''}"`).join(',')
      )
    ].join('\n');
    
    return csvContent;
  },

  /**
   * Download CSV template
   * @param {Object} template - Template data from API
   * @param {string} filename - Optional filename
   */
  downloadTemplate(template, filename = 'priorities-import-template.csv') {
    const csvContent = this.generateCSVTemplate(template);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Format import results for display
   * @param {Object} results - Results from execute import
   */
  formatImportResults(results) {
    const {
      prioritiesCreated = 0,
      prioritiesUpdated = 0,
      prioritiesSkipped = 0,
      milestonesCreated = 0,
      totalProcessed = 0,
      errors = []
    } = results;

    return {
      summary: {
        total: totalProcessed,
        created: prioritiesCreated,
        updated: prioritiesUpdated,
        skipped: prioritiesSkipped,
        milestones: milestonesCreated,
        errors: errors.length
      },
      hasErrors: errors.length > 0,
      hasWarnings: prioritiesSkipped > 0,
      isSuccess: errors.length === 0,
      details: {
        successMessage: `Successfully processed ${totalProcessed} priorities`,
        createdMessage: prioritiesCreated > 0 ? `${prioritiesCreated} new priorities created` : null,
        updatedMessage: prioritiesUpdated > 0 ? `${prioritiesUpdated} priorities updated` : null,
        skippedMessage: prioritiesSkipped > 0 ? `${prioritiesSkipped} priorities skipped` : null,
        milestonesMessage: milestonesCreated > 0 ? `${milestonesCreated} milestones created` : null,
        errorMessages: errors.map(err => `${err.priority}: ${err.error}`)
      }
    };
  }
};