import apiClient from './client';

// Tasks API service
const tasksApi = {
  // Get all tasks with optional filters
  getTasks: async (filters = {}) => {
    const response = await apiClient.get('/tasks/', { params: filters });
    return response.data;
  },
  
  // Get a specific task by ID
  getTask: async (taskId) => {
    const response = await apiClient.get(`/tasks/${taskId}/`);
    return response.data;
  },
  
  // Create a new task
  createTask: async (taskData) => {
    const response = await apiClient.post('/tasks/', taskData);
    return response.data;
  },
  
  // Update a task
  updateTask: async (taskId, taskData) => {
    const response = await apiClient.patch(`/tasks/${taskId}/`, taskData);
    return response.data;
  },
  
  // Delete a task
  deleteTask: async (taskId) => {
    const response = await apiClient.delete(`/tasks/${taskId}/`);
    return response.data;
  },
  
  // Get task categories
  getCategories: async () => {
    const response = await apiClient.get('/tasks/categories/');
    return response.data;
  },
  
  // Create a new category
  createCategory: async (categoryData) => {
    const response = await apiClient.post('/tasks/categories/', categoryData);
    return response.data;
  },
  
  // Get task statuses
  getStatuses: async () => {
    const response = await apiClient.get('/tasks/statuses/');
    return response.data;
  },
  
  // Create a new status
  createStatus: async (statusData) => {
    const response = await apiClient.post('/tasks/statuses/', statusData);
    return response.data;
  },
  
  // Get task priorities
  getPriorities: async () => {
    const response = await apiClient.get('/tasks/priorities/');
    return response.data;
  },
  
  // Create a new priority
  createPriority: async (priorityData) => {
    const response = await apiClient.post('/tasks/priorities/', priorityData);
    return response.data;
  },
  
  // Get task comments
  getComments: async (taskId) => {
    const response = await apiClient.get(`/tasks/${taskId}/comments/`);
    return response.data;
  },
  
  // Add a comment to a task
  addComment: async (taskId, commentData) => {
    const response = await apiClient.post(`/tasks/${taskId}/comments/`, commentData);
    return response.data;
  },
  
  // Delete a comment
  deleteComment: async (commentId) => {
    const response = await apiClient.delete(`/tasks/comments/${commentId}/`);
    return response.data;
  },
  
  // Get task attachments
  getAttachments: async (taskId) => {
    const response = await apiClient.get(`/tasks/${taskId}/attachments/`);
    return response.data;
  },
  
  // Upload an attachment to a task
  uploadAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`/tasks/${taskId}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Delete an attachment
  deleteAttachment: async (attachmentId) => {
    const response = await apiClient.delete(`/tasks/attachments/${attachmentId}/`);
    return response.data;
  },
  
  // Start a timer for a task
  startTimer: async (taskId) => {
    const response = await apiClient.post(`/tasks/${taskId}/timers/start/`);
    return response.data;
  },
  
  // Stop a timer for a task
  stopTimer: async (taskId, notes = '') => {
    const response = await apiClient.post(`/tasks/${taskId}/timers/stop/`, { notes });
    return response.data;
  },
  
  // Get task history
  getHistory: async (taskId) => {
    const response = await apiClient.get(`/tasks/${taskId}/history/`);
    return response.data;
  },
  
  // Get task templates
  getTemplates: async () => {
    const response = await apiClient.get('/tasks/templates/');
    return response.data;
  },
  
  // Create a task from template
  createFromTemplate: async (templateId, taskData) => {
    const response = await apiClient.post(`/tasks/templates/${templateId}/apply/`, taskData);
    return response.data;
  },
};

export default tasksApi;