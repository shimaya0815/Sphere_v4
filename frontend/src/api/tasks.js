import apiClient from './client';

// モックデータは削除し、実際のAPIから取得するようにしました

// タスク関連のAPI
const tasksApi = {
  // タスク一覧を取得
  getTasks: async (filters = {}) => {
    try {
      console.log('🔍🔍🔍 Fetching tasks with filters:', filters);
      
      // API URLは必ず /api プレフィックスを付ける
      // バックエンドの設定で、認証以外のエンドポイントはすべて /api プレフィックスが必要
      const apiEndpoints = [
        '/api/tasks/',
      ];
      
      let lastError = null;
      
      // 各エンドポイントを順番に試行
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`🔍🔍🔍 Trying API endpoint: ${endpoint}`);
          const response = await apiClient.get(endpoint, { 
            params: filters,
            timeout: 10000 // 10秒のタイムアウト
          });
          console.log(`✅✅✅ Successful response from ${endpoint}:`, response.status);
          console.log('Tasks API Data:', response.data);
          return response.data;
        } catch (endpointError) {
          console.warn(`❌❌❌ Failed to fetch from ${endpoint}:`, endpointError.message);
          lastError = endpointError;
          // 次のエンドポイントを試行
        }
      }
      
      // すべてのエンドポイントが失敗した場合
      console.error('🛑🛑🛑 All API endpoints failed');
      
      // 詳細なエラー情報をログ
      if (lastError.response) {
        console.error('Error Response Data:', lastError.response.data);
        console.error('Error Response Status:', lastError.response.status);
        console.error('Error Response Headers:', lastError.response.headers);
      } else if (lastError.request) {
        console.error('No response received, request details:', lastError.request);
      } else {
        console.error('Error during request setup:', lastError.message);
      }
      
      // 例外を投げて呼び出し元に通知
      throw lastError;
    } catch (error) {
      console.error('⚠️⚠️⚠️ Fatal error fetching tasks:', error);
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