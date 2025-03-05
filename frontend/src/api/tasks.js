import apiClient from './client';

// モックデータは削除し、実際のAPIから取得するようにしました

// タスク関連のAPI
const tasksApi = {
  // タスク一覧を取得
  getTasks: async (filters = {}) => {
    try {
      console.log('Fetching tasks with filters:', filters);
      console.log('API URL:', '/api/tasks/');
      
      // ネットワークリクエストをより詳細にデバッグ
      try {
        const response = await apiClient.get('/api/tasks/', { params: filters });
        console.log('Tasks API Response:', response);
        console.log('Tasks API Data:', response.data);
        return response.data;
      } catch (requestError) {
        console.error('Detailed request error:', requestError);
        console.error('Request error response:', requestError.response);
        console.error('Request error message:', requestError.message);
        console.error('Request error config:', requestError.config);
        throw requestError;
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // エラーの詳細をログ出力
      if (error.response) {
        // サーバーからのレスポンスがある場合
        console.error('Error Response Data:', error.response.data);
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Headers:', error.response.headers);
      } else if (error.request) {
        // リクエストは行われたがレスポンスがない場合
        console.error('No response received, request details:', error.request);
      } else {
        // リクエスト設定中にエラーが発生した場合
        console.error('Error during request setup:', error.message);
      }
      throw error;
    }
  },
  
  // タスクの詳細を取得
  getTask: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task with id ${taskId}:`, error);
      throw error;
    }
  },
  
  // 新規タスク作成
  createTask: async (taskData) => {
    try {
      const response = await apiClient.post('/api/tasks/', taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },
  
  // タスク更新
  updateTask: async (taskId, taskData) => {
    try {
      const response = await apiClient.put(`/api/tasks/${taskId}/`, taskData);
      return response.data;
    } catch (error) {
      console.error(`Error updating task with id ${taskId}:`, error);
      throw error;
    }
  },
  
  // タスク削除
  deleteTask: async (taskId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting task with id ${taskId}:`, error);
      throw error;
    }
  },
  
  // タスクステータス変更
  changeStatus: async (taskId, statusData) => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/change-status/`, statusData);
      return response.data;
    } catch (error) {
      console.error(`Error changing status for task with id ${taskId}:`, error);
      throw error;
    }
  },
  
  // タスク完了マーク
  markComplete: async (taskId) => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/mark_complete/`);
      return response.data;
    } catch (error) {
      console.error(`Error marking task ${taskId} as complete:`, error);
      throw error;
    }
  },
  
  // タスクテンプレート一覧を取得
  getTaskTemplates: async () => {
    try {
      const response = await apiClient.get('/api/tasks/templates/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task templates:', error);
      throw error;
    }
  },
  
  // タスクカテゴリー一覧を取得
  getCategories: async () => {
    try {
      const response = await apiClient.get('/api/tasks/categories/');
      console.log('Categories API Response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching task categories:', error);
      throw error;
    }
  },
  
  // タスクステータス一覧を取得
  getStatuses: async () => {
    try {
      const response = await apiClient.get('/api/tasks/statuses/');
      console.log('Statuses API Response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching task statuses:', error);
      throw error;
    }
  },
  
  // タスク優先度一覧を取得
  getPriorities: async () => {
    try {
      const response = await apiClient.get('/api/tasks/priorities/');
      console.log('Priorities API Response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching task priorities:', error);
      throw error;
    }
  }
};

export default tasksApi;