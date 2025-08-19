const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class ExportService {
  async exportOrganizationBackup(organizationId) {
    // Try both possible token keys
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    console.log('Export service - Using API URL:', API_BASE_URL);
    console.log('Export service - Token exists:', !!token);
    console.log('Export service - Token length:', token?.length);
    console.log('Export service - Token preview:', token?.substring(0, 20) + '...');
    
    if (!token || token === 'null' || token === 'undefined') {
      throw new Error('No valid authentication token found. Please log in again.');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/export/backup`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export data');
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'organization_backup.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob
      const blob = await response.blob();
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      console.error('Export service error:', error);
      throw error;
    }
  }
}

export const exportService = new ExportService();