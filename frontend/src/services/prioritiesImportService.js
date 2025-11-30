import axios from './axiosConfig';

export const prioritiesImportService = {
  /**
   * Get the import template information
   */
  async getTemplate() {
    try {
      const response = await axios.get('/priorities/import/template');
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
      const response = await axios.post('/priorities/import/preview', formData);
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
      const response = await axios.post('/priorities/import/execute', formData);
      return response.data.results;
    } catch (error) {
      console.error('Failed to execute import:', error);
      throw new Error(error.response?.data?.error || 'Failed to execute import');
    }
  },

  /**
   * Validate Excel file before upload
   * @param {File} file - The Excel file to validate
   */
  validateExcelFile(file) {
    const errors = [];
    
    // Check file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      errors.push('File must be an Excel file (.xlsx or .xls)');
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