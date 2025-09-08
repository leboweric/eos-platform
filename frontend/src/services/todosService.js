import axios from './axiosConfig';
import { useAuthStore } from '../stores/authStore';

const getOrgId = () => {
  const user = useAuthStore.getState().user;
  return user?.organizationId || user?.organization_id;
};

const getTeamId = () => {
  const user = useAuthStore.getState().user;
  return user?.teamId;
};

/**
 * Todos service for managing todo data
 * 
 * Todo objects now include publishing fields:
 * - is_published_to_departments: boolean indicating if visible to non-leadership teams
 * - published_at: timestamp when published
 * - published_by: ID of user who published
 */
export const todosService = {
  // Get all todos
  getTodos: async (status = null, assignedTo = null, includeCompleted = false, departmentId = null, includeArchived = false) => {
    const orgId = getOrgId();
    
    const params = {};
    if (status) params.status = status;
    if (assignedTo) params.assignedTo = assignedTo;
    if (includeCompleted) params.includeCompleted = 'true';
    if (departmentId) params.department_id = departmentId;
    if (includeArchived) params.includeArchived = 'true';
    
    const response = await axios.get(
      `/organizations/${orgId}/todos`,
      { params }
    );
    return response.data;
  },

  // Create a new todo
  createTodo: async (todoData) => {
    const orgId = getOrgId();
    
    // Map frontend field names to backend field names
    const mappedData = {
      title: todoData.title,
      description: todoData.description,
      assignedToId: todoData.assignedToId,
      dueDate: todoData.dueDate,
      teamId: todoData.department_id || todoData.teamId || null
    };
    
    const response = await axios.post(
      `/organizations/${orgId}/todos`,
      mappedData
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

  // Archive done todos
  archiveDoneTodos: async () => {
    const orgId = getOrgId();
    
    const response = await axios.put(`/organizations/${orgId}/todos/archive-done`);
    return response.data;
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
  },

  // Todo Updates
  getTodoUpdates: async (todoId) => {
    const orgId = getOrgId();
    const response = await axios.get(`/organizations/${orgId}/todos/${todoId}/updates`);
    return response.data;
  },

  addTodoUpdate: async (todoId, updateText) => {
    const orgId = getOrgId();
    const response = await axios.post(`/organizations/${orgId}/todos/${todoId}/updates`, {
      update_text: updateText
    });
    return response.data;
  },

  deleteTodoUpdate: async (todoId, updateId) => {
    const orgId = getOrgId();
    const response = await axios.delete(`/organizations/${orgId}/todos/${todoId}/updates/${updateId}`);
    return response.data;
  }
};