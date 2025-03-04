import apiClient from './client';

// タスクデータを正規化する関数 - APIからの不一致を解消
const normalizeTaskData = (task) => {
  if (!task) return null;
  
  console.log('Normalizing task data:', task);
  
  // ステータス情報を正規化
  let status_data = null;
  if (task.status_data) {
    status_data = task.status_data;
  } else if (task.status && typeof task.status === 'object') {
    status_data = { id: task.status.id, name: task.status.name };
  } else if (task.status) {
    status_data = { id: task.status, name: task.status_name || getDefaultStatusName(task.status) };
  }
  
  // 優先度情報を正規化
  let priority_data = null;
  if (task.priority_data) {
    priority_data = task.priority_data;
  } else if (task.priority && typeof task.priority === 'object') {
    priority_data = { id: task.priority.id, name: task.priority.name };
  } else if (task.priority) {
    priority_data = { id: task.priority, name: task.priority_name || getDefaultPriorityName(task.priority) };
  }
  
  // カテゴリ情報を正規化
  let category_data = null;
  if (task.category_data) {
    category_data = task.category_data;
  } else if (task.category && typeof task.category === 'object') {
    category_data = { id: task.category.id, name: task.category.name };
  } else if (task.category) {
    category_data = { id: task.category, name: task.category_name || '' };
  }
  
  // クライアント情報を正規化
  let client_data = null;
  if (task.client_data) {
    client_data = task.client_data;
  } else if (task.client && typeof task.client === 'object') {
    client_data = { id: task.client.id, name: task.client.name };
  } else if (task.client) {
    client_data = { id: task.client, name: task.client_name || '' };
  }
  
  // APIのレスポンスでクライアント情報が不完全な場合は、各フィールドを丁寧に確認
  if (client_data && client_data.id && !client_data.name && task.client_name) {
    client_data.name = task.client_name;
  }
  
  const normalized = {
    ...task,
    status_data,
    priority_data,
    category_data,
    client_data
  };
  
  console.log('Normalized task data result:', normalized);
  return normalized;
};

// IDに基づいてデフォルトのステータス名を取得
const getDefaultStatusName = (statusId) => {
  if (!statusId) return '';
  const statusMap = {
    1: '未着手',
    2: '作業中',
    3: 'レビュー待ち',
    4: '完了'
  };
  return statusMap[statusId] || `ステータス ${statusId}`;
};

// IDに基づいてデフォルトの優先度名を取得
const getDefaultPriorityName = (priorityId) => {
  if (!priorityId) return '';
  const priorityMap = {
    1: '低',
    2: '中',
    3: '高'
  };
  return priorityMap[priorityId] || `優先度 ${priorityId}`;
};

// Tasks API service
const tasksApi = {
  // Get all tasks with optional filters
  getTasks: async (filters = {}) => {
    console.log('Fetching tasks with filters:', filters);
    try {
      // 正しいエンドポイントでタスク一覧を取得
      const response = await apiClient.get('/tasks/', { params: filters });
      console.log('Tasks fetched successfully:', response.data);
      
      // レスポンスデータを正規化
      if (Array.isArray(response.data)) {
        return {
          results: response.data.map(normalizeTaskData),
          count: response.data.length
        };
      } else if (response.data && Array.isArray(response.data.results)) {
        return {
          ...response.data,
          results: response.data.results.map(normalizeTaskData)
        };
      }
      
      return { results: [] };
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
      return normalizeTaskData(response.data);
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
      // タスクIDが数値であることを確認
      if (!taskId || isNaN(Number(taskId))) {
        throw new Error(`Invalid task ID: ${taskId}`);
      }
      
      // 更新フィールドが少なくとも1つあることを確認
      if (!taskData || Object.keys(taskData).length === 0) {
        throw new Error('No update data provided');
      }
      
      // リクエスト送信前に詳細ログ
      console.log('PATCH request to:', `/tasks/${taskId}/`);
      console.log('Request data:', JSON.stringify(taskData));
      
      // タイムアウト設定を延長する
      const response = await apiClient.patch(`/tasks/${taskId}/`, taskData, {
        timeout: 10000 // 10秒のタイムアウト
      });
      console.log('Task updated successfully:', response.data);
      
      // レスポンスデータの詳細ログ
      console.log('Raw response data:', JSON.stringify(response.data));
      
      // 応答データを正規化せずに返す前に、必要な情報が揃っているか確認
      if (response.data && typeof response.data === 'object') {
        // 基本的なデータ構造チェック
        if (response.data.id !== undefined) {
          console.log('Processing response data before return');
          
          // client関連フィールドは常に正規化する（ここが重要）
          if (response.data.client !== undefined) {
            // クライアントデータの正規化
            let client_data = null;
            if (response.data.client_data) {
              client_data = response.data.client_data;
            } else if (response.data.client && typeof response.data.client === 'object') {
              client_data = { 
                id: response.data.client.id, 
                name: response.data.client.name,
                client_code: response.data.client.client_code
              };
            } else if (response.data.client) {
              client_data = { 
                id: response.data.client, 
                name: response.data.client_name || '' 
              };
            }
            
            // 正規化したクライアントデータを追加
            response.data.client_data = client_data;
          }
          
          console.log('Returning processed response data');
          return response.data;
        }
      }
      
      // バックアッププラン: データを正規化して返す
      console.log('Normalizing response data');
      const normalizedData = normalizeTaskData(response.data);
      return normalizedData;
    } catch (error) {
      console.error('Error updating task:', error.response?.data || error.message);
      console.error('Error details:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
      }
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