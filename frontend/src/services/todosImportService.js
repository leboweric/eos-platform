import axios from './axiosConfig';

export const todosImportService = {
  /**
   * Get the import template information
   */
  async getTemplate() {
    try {
      const response = await axios.get('/todos/import/template');
      return response.data.template;
    } catch (error) {
      console.error('Failed to get import template:', error);
      throw new Error(error.response?.data?.error || 'Failed to get import template');
    }
  },

  /**
   * Preview Excel import without saving
   * @param {FormData} formData - Contains file, organizationId, teamId
   */
  async previewImport(formData) {
    try {
      const response = await axios.post('/todos/import/preview', formData);
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
      const response = await axios.post('/todos/import/execute', formData);
      return response.data.results;
    } catch (error) {
      console.error('Failed to execute import:', error);
      throw new Error(error.response?.data?.error || 'Failed to execute import');
    }
  },

  /**
   * Validate Excel file
   * @param {File} file - The file to validate
   */
  validateExcelFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file selected');
      return { isValid: false, errors };
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('File must be an Excel (.xlsx, .xls) or CSV file');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    return { isValid: errors.length === 0, errors };
  }
};