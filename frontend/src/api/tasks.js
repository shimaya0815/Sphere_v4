import apiClient from './client';

// Tasks API service
const tasksApi = {
  // Get all tasks with optional filters
  getTasks: async (filters = {}) => {
    console.log('Fetching tasks with filters:', filters);
    try {
      // 正しいエンドポイントでタスク一覧を取得
      const response = await apiClient.get('/tasks/', { params: filters });
      console.log('Tasks fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error.response?.data || error.message);
      // エラー処理を行っても、最低限の情報を返す
      return { results: [] };
    }
  },
  
  // Get a specific task by ID
  getTask: async (taskId) => {
    console.log('Fetching task with ID:', taskId);
    try {
      const response = await apiClient.get(`/tasks/${taskId}/`);
      console.log('Task fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching task:', error.response?.data || error.message);
      return null;
    }
  },
  
  // Create a new task
  createTask: async (taskData) => {
    console.log('Creating task with data:', taskData);
    try {
      // Djangoの設定に合わせて末尾にスラッシュをつける必要がある
      const response = await apiClient.post('/tasks/', taskData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Task created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  },
  
  // Update a task
  updateTask: async (taskId, taskData) => {
    console.log('Updating task with ID:', taskId, 'and data:', taskData);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}/`, taskData);
      console.log('Task updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete a task
  deleteTask: async (taskId) => {
    console.log('Deleting task with ID:', taskId);
    try {
      const response = await apiClient.delete(`/tasks/${taskId}/`);
      console.log('Task deleted successfully');
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error.response?.data || error.message);
      throw error;
    }
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
    const response = await apiClient.post(`/tasks/${taskId}/timers/start/`, {});
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