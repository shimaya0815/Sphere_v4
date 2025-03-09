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
  getTemplates: async () => {
    try {
      console.log('Fetching templates from API...');
      const response = await apiClient.get('/api/tasks/templates/');
      console.log('Templates response:', response.data);
      
      // DRFのページネーション形式（results配列を含むオブジェクト）に対応
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        console.log('Found results array in response:', response.data.results);
        return response.data.results;
      }
      
      // 直接配列の場合
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // それ以外の形式の場合（想定外のレスポンス）
      console.warn('API response has unexpected format:', response.data);
      return [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  },
  
  // テンプレートからタスクを作成
  createFromTemplate: async (templateId, taskData = {}) => {
    try {
      const response = await apiClient.post(`/api/tasks/templates/${templateId}/apply/`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task from template:', error);
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
  },
  
  // 指定された優先度値に基づいてタスク優先度を作成または取得
  createPriorityForValue: async (priorityValue) => {
    try {
      const response = await apiClient.post('/api/tasks/priorities/create-for-value/', {
        priority_value: priorityValue
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // テンプレートスケジュール一覧を取得
  getTemplateSchedules: async () => {
    try {
      const response = await apiClient.get('/api/clients/task-template-schedules/');
      return response.data;
    } catch (error) {
      console.error('Error fetching template schedules:', error);
      return [];
    }
  },
  
  // テンプレートスケジュールを作成
  createTemplateSchedule: async (scheduleData) => {
    try {
      const response = await apiClient.post('/api/clients/task-template-schedules/', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error creating template schedule:', error);
      throw error;
    }
  },
  
  // テンプレートスケジュールを更新
  updateTemplateSchedule: async (scheduleId, scheduleData) => {
    try {
      const response = await apiClient.patch(`/api/clients/task-template-schedules/${scheduleId}/`, scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error updating template schedule:', error);
      throw error;
    }
  },
  
  // デフォルトのテンプレートスケジュールを作成
  createDefaultTemplateSchedule: async (scheduleData) => {
    try {
      const response = await apiClient.post('/api/clients/default-task-template-schedules/', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error creating default template schedule:', error);
      throw error;
    }
  },
  
  // デフォルトのテンプレートスケジュールを取得
  getDefaultTemplateSchedules: async () => {
    try {
      const response = await apiClient.get('/api/clients/default-task-template-schedules/');
      return response.data;
    } catch (error) {
      console.error('Error fetching default template schedules:', error);
      return [];
    }
  },
  
  // タスクコメント関連API
  
  // タスクのコメント一覧を取得
  getComments: async (taskId) => {
    try {
      const response = await apiClient.get('/api/tasks/comments/', {
        params: { task: taskId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  },
  
  // タスクにコメントを追加
  addComment: async (taskId, commentData) => {
    try {
      const data = {
        task: taskId,
        content: commentData.content
      };
      const response = await apiClient.post('/api/tasks/comments/', data);
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },
  
  // ファイル添付ありのコメント追加
  addCommentWithFiles: async (taskId, formData) => {
    try {
      console.log('Sending files to API:', formData);
      const response = await apiClient.post('/api/tasks/comments/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding comment with files:', error);
      throw error;
    }
  },
  
  // タスクコメントを削除
  deleteComment: async (commentId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/comments/${commentId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },
  
  // タスク通知関連API
  
  // 通知一覧を取得
  getNotifications: async (read = null) => {
    try {
      const params = {};
      if (read !== null) params.read = read;
      
      const response = await apiClient.get('/api/tasks/notifications/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },
  
  // 未読通知数を取得
  getUnreadNotificationCount: async () => {
    try {
      const response = await apiClient.get('/api/tasks/notifications/unread-count/');
      return response.data;
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      throw error;
    }
  },
  
  // 通知を既読にする
  markNotificationAsRead: async (notificationId) => {
    try {
      const response = await apiClient.post(`/api/tasks/notifications/${notificationId}/mark-read/`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
  
  // すべての通知を既読にする
  markAllNotificationsAsRead: async () => {
    try {
      const response = await apiClient.post('/api/tasks/notifications/mark-all-read/');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
};

export default tasksApi;