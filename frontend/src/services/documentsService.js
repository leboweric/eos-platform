import axios from './axiosConfig';
import axiosRaw from 'axios';

export const documentsService = {
  // Get all documents with optional filters
  async getDocuments(orgId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.department) params.append('department', filters.department);
    if (filters.search) params.append('search', filters.search);
    if (filters.favorites) params.append('favorites', filters.favorites);
    if (filters.folderId !== undefined) params.append('folderId', filters.folderId || 'root');
    
    const response = await axios.get(
      `/organizations/${orgId}/documents${params.toString() ? '?' + params.toString() : ''}`
    );
    
    return response.data.data;
  },


  // Upload a new document
  async uploadDocument(orgId, documentData, file) {
    console.log('=== DOCUMENT UPLOAD DEBUG ===');
    console.log('1. Input parameters:');
    console.log('   - orgId:', orgId);
    console.log('   - documentData:', documentData);
    console.log('   - file:', file);
    console.log('   - file type:', typeof file);
    console.log('   - file constructor:', file?.constructor?.name);
    console.log('   - file instanceof File:', file instanceof File);
    console.log('   - file instanceof Blob:', file instanceof Blob);
    
    if (file) {
      console.log('2. File details:');
      console.log('   - name:', file.name);
      console.log('   - size:', file.size);
      console.log('   - type:', file.type);
      console.log('   - lastModified:', file.lastModified);
    }
    
    const formData = new FormData();
    console.log('3. Appending file to FormData...');
    formData.append('file', file);
    console.log('   - FormData created:', formData);
    console.log('   - FormData.has("file"):', formData.has('file'));
    console.log('   - FormData.get("file"):', formData.get('file'));
    
    formData.append('title', documentData.title);
    formData.append('description', documentData.description || '');
    formData.append('visibility', documentData.visibility || 'company');
    
    if (documentData.departmentId) {
      formData.append('departmentId', documentData.departmentId);
    }
    
    if (documentData.relatedPriorityId) {
      formData.append('relatedPriorityId', documentData.relatedPriorityId);
    }
    
    if (documentData.folderId) {
      formData.append('folderId', documentData.folderId);
    }
    
    if (documentData.tags && documentData.tags.length > 0) {
      // Send tags as a JSON string to ensure proper array handling
      formData.append('tags', JSON.stringify(documentData.tags));
    }
    
    console.log('4. Sending request...');
    console.log('   - URL:', `/organizations/${orgId}/documents`);
    console.log('   - FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`     - ${key}:`, value);
    }
    
    try {
      // Use raw axios to avoid any interceptors that might transform FormData
      const token = localStorage.getItem('accessToken');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      
      const response = await axiosRaw.post(
        `${baseURL}/organizations/${orgId}/documents`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            // Let browser set Content-Type with boundary
          }
        }
      );
      console.log('5. Upload successful!');
      return response.data.data;
    } catch (error) {
      console.log('5. Upload failed!');
      console.log('   - Error:', error);
      console.log('   - Response:', error.response);
      console.log('   - Request headers:', error.config?.headers);
      
      // Handle 401 like the interceptor does
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      
      throw error;
    }
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