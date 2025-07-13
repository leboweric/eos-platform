import axios from 'axios';

const getOrgId = () => {
  const authState = JSON.parse(localStorage.getItem('auth-store') || '{}');
  const user = authState?.state?.user;
  return localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
};

const getTeamId = () => {
  const authState = JSON.parse(localStorage.getItem('auth-store') || '{}');
  const user = authState?.state?.user;
  return user?.teamId;
};

export const todosService = {
  // Get all todos
  getTodos: async (status = null, assignedTo = null, includeCompleted = false) => {
    const orgId = getOrgId();
    
    const params = {};
    if (status) params.status = status;
    if (assignedTo) params.assignedTo = assignedTo;
    if (includeCompleted) params.includeCompleted = 'true';
    
    const response = await axios.get(
      `/organizations/${orgId}/todos`,
      { params }
    );
    return response.data;
  },

  // Create a new todo
  createTodo: async (todoData) => {
    const orgId = getOrgId();
    const teamId = getTeamId();
    
    const response = await axios.post(
      `/organizations/${orgId}/todos`,
      {
        ...todoData,
        teamId: teamId || null
      }
    );
    return response.data.data;
  },

  // Update a todo
  updateTodo: async (todoId, todoData) => {
    const orgId = getOrgId();
    
    const response = await axios.put(
      `/organizations/${orgId}/todos/${todoId}`,
      todoData
    );
    return response.data.data;
  },

  // Delete a todo
  deleteTodo: async (todoId) => {
    const orgId = getOrgId();
    
    await axios.delete(`/organizations/${orgId}/todos/${todoId}`);
  },

  // Upload attachment
  uploadAttachment: async (todoId, file) => {
    const orgId = getOrgId();
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      `/organizations/${orgId}/todos/${todoId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data.data;
  },

  // Get attachments for a todo
  getAttachments: async (todoId) => {
    const orgId = getOrgId();
    
    const response = await axios.get(
      `/organizations/${orgId}/todos/${todoId}/attachments`
    );
    return response.data.data;
  },

  // Delete attachment
  deleteAttachment: async (todoId, attachmentId) => {
    const orgId = getOrgId();
    
    await axios.delete(
      `/organizations/${orgId}/todos/${todoId}/attachments/${attachmentId}`
    );
  },

  // Download attachment
  downloadAttachment: async (todoId, attachmentId, fileName) => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.get(
        `/organizations/${orgId}/todos/${todoId}/attachments/${attachmentId}/download`,
        {
          responseType: 'blob'
        }
      );
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'download');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Failed to download attachment:', error);
      if (error.response?.status === 404) {
        throw new Error('Attachment not found. It may have been deleted.');
      }
      throw new Error('Failed to download attachment. Please try again.');
    }
  }
};