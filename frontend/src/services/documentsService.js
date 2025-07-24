import axios from './axiosConfig';

export const documentsService = {
  // Get all documents with optional filters
  async getDocuments(orgId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.department) params.append('department', filters.department);
    if (filters.search) params.append('search', filters.search);
    if (filters.favorites) params.append('favorites', filters.favorites);
    
    const response = await axios.get(
      `/organizations/${orgId}/documents${params.toString() ? '?' + params.toString() : ''}`
    );
    
    return response.data.data;
  },

  // Get categories with document counts
  async getCategories(orgId) {
    const response = await axios.get(`/organizations/${orgId}/documents/categories`);
    return response.data.data;
  },

  // Upload a new document
  async uploadDocument(orgId, documentData, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', documentData.title);
    formData.append('description', documentData.description || '');
    formData.append('category', documentData.category);
    formData.append('visibility', documentData.visibility || 'company');
    
    if (documentData.departmentId) {
      formData.append('departmentId', documentData.departmentId);
    }
    
    if (documentData.relatedPriorityId) {
      formData.append('relatedPriorityId', documentData.relatedPriorityId);
    }
    
    if (documentData.tags && documentData.tags.length > 0) {
      documentData.tags.forEach(tag => {
        formData.append('tags[]', tag);
      });
    }
    
    const response = await axios.post(
      `/organizations/${orgId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data.data;
  },

  // Update document metadata
  async updateDocument(orgId, documentId, updates) {
    const response = await axios.put(
      `/organizations/${orgId}/documents/${documentId}`,
      updates
    );
    
    return response.data.data;
  },

  // Delete a document
  async deleteDocument(orgId, documentId) {
    const response = await axios.delete(
      `/organizations/${orgId}/documents/${documentId}`
    );
    
    return response.data;
  },

  // Download a document
  async downloadDocument(orgId, documentId, fileName) {
    try {
      const response = await axios.get(
        `/organizations/${orgId}/documents/${documentId}/download`,
        {
          responseType: 'blob'
        }
      );
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },

  // Toggle favorite status
  async toggleFavorite(orgId, documentId) {
    const response = await axios.post(
      `/organizations/${orgId}/documents/${documentId}/favorite`
    );
    
    return response.data.data;
  }
};