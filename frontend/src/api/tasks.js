import apiClient from './client';

// モックデータは削除し、実際のAPIから取得するようにしました

// タスク関連のAPI
const tasksApi = {
  // タスク一覧を取得
  getTasks: async (filters = {}) => {
    try {
      // API URLは /api プレフィックスを付ける
      const response = await apiClient.get('/api/tasks/', { 
        params: filters,
        timeout: 10000 // 10秒のタイムアウト
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error.message);
      throw error;
    }
  },
  
  // タスクの詳細を取得
  getTask: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // 新規タスク作成
  createTask: async (taskData) => {
    try {
      const response = await apiClient.post('/api/tasks/', taskData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // タスク更新
  updateTask: async (taskId, taskData) => {
    try {
      const response = await apiClient.put(`/api/tasks/${taskId}/`, taskData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // タスク削除
  deleteTask: async (taskId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // タスクステータス変更
  changeStatus: async (taskId, statusData) => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/change-status/`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // タスク完了マーク
  markComplete: async (taskId) => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/mark_complete/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // タスクテンプレート一覧を取得
  getTaskTemplates: async () => {
    try {
      const response = await apiClient.get('/api/tasks/templates/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // タスクカテゴリー一覧を取得
  getCategories: async () => {
    try {
      const response = await apiClient.get('/api/tasks/categories/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // タスクステータス一覧を取得
  getStatuses: async () => {
    try {
      const response = await apiClient.get('/api/tasks/statuses/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // タスク優先度一覧を取得
  getPriorities: async () => {
    try {
      const response = await apiClient.get('/api/tasks/priorities/');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default tasksApi;