import axios from './axiosConfig';

export const issuesImportService = {
  /**
   * Get the import template information
   */
  async getTemplate() {
    try {
      const response = await axios.get('/issues/import/template');
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
      const response = await axios.post('/issues/import/preview', formData, {
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
      const response = await axios.post('/issues/import/execute', formData, {
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
      created = 0,
      updated = 0,
      skipped = 0,
      totalProcessed = 0,
      shortTermProcessed = 0,
      longTermProcessed = 0,
      errors = []
    } = results;

    return {
      summary: {
        total: totalProcessed,
        created: created,
        updated: updated,
        skipped: skipped,
        shortTerm: shortTermProcessed,
        longTerm: longTermProcessed,
        errors: errors.length
      },
      hasErrors: errors.length > 0,
      hasWarnings: skipped > 0,
      isSuccess: errors.length === 0,
      details: {
        successMessage: `Successfully processed ${totalProcessed} issues`,
        createdMessage: created > 0 ? `${created} new issues created` : null,
        updatedMessage: updated > 0 ? `${updated} issues updated` : null,
        skippedMessage: skipped > 0 ? `${skipped} issues skipped` : null,
        shortTermMessage: shortTermProcessed > 0 ? `${shortTermProcessed} short-term issues` : null,
        longTermMessage: longTermProcessed > 0 ? `${longTermProcessed} long-term issues` : null,
        errorMessages: errors.map(err => `${err.issue}: ${err.error}`)
      }
    };
  },

  /**
   * Format preview data for display
   * @param {Object} preview - Preview data from API
   */
  formatPreviewData(preview) {
    const { summary, warnings, conflicts, unmappedAssignees } = preview;
    
    return {
      summary: {
        totalIssues: summary.totalIssues,
        shortTermIssues: summary.shortTermIssues,
        longTermIssues: summary.longTermIssues,
        newIssues: summary.newIssues,
        conflicts: summary.existingIssues,
        unmappedUsers: summary.unmappedAssignees
      },
      hasWarnings: warnings.length > 0 || conflicts.length > 0 || unmappedAssignees.length > 0,
      warnings: warnings,
      conflicts: conflicts.map(conflict => ({
        title: conflict.title,
        timeline: conflict.timeline,
        status: `${conflict.existingStatus} → ${conflict.newStatus}`
      })),
      unmappedAssignees: unmappedAssignees,
      isValid: summary.totalIssues > 0
    };
  },

  /**
   * Generate user mapping object for form submission
   * @param {Object} mappings - User mappings from UI
   */
  formatUserMappings(mappings) {
    const formatted = {};
    
    Object.entries(mappings).forEach(([assigneeName, userId]) => {
      if (userId && userId !== '') {
        formatted[assigneeName] = userId;
      }
    });
    
    return formatted;
  },

  /**
   * Get conflict strategy options
   */
  getConflictStrategies() {
    return [
      {
        value: 'merge',
        label: 'Merge (Update existing issues with new data)',
        description: 'Recommended for incremental imports'
      },
      {
        value: 'skip',
        label: 'Skip (Keep existing issues unchanged)',
        description: 'Safest option, only imports new issues'
      },
      {
        value: 'update',
        label: 'Update (Replace existing issue data)',
        description: 'Overwrites existing issues completely'
      }
    ];
  }
};