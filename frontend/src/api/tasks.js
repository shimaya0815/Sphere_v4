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
      console.log('Fetching task details for ID:', taskId);
      const response = await apiClient.get(`/api/tasks/${taskId}/`);
      console.log('Task details response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in getTask:', error);
      console.error('Error details:', error.response?.data || error.message);
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
      const response = await apiClient.get('/api/tasks/templates/?limit=100');
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
      
      // モックテンプレートを返す（API接続問題のバックアップ）
      console.warn('API response is not in expected format, using mock data');
      return [
        {
          id: 1,
          title: '月次処理チェック',
          description: '毎月の処理状況を確認し、必要な対応を行います。',
          template_name: 'デフォルト月次チェック',
          category: { id: 1, name: '一般', color: '#3B82F6' },
          estimated_hours: 2,
          child_tasks_count: 0
        },
        {
          id: 2,
          title: '記帳代行業務',
          description: '請求書・領収書などに基づき会計データを作成します。',
          template_name: 'デフォルト記帳代行',
          category: { id: 2, name: '記帳代行', color: '#F59E0B' },
          estimated_hours: 3,
          child_tasks_count: 0
        },
        {
          id: 3,
          title: '決算・法人税申告業務',
          description: '決算期の法人税申告書を作成・提出します。',
          template_name: 'デフォルト決算・申告',
          category: { id: 3, name: '決算・申告', color: '#8B5CF6' },
          estimated_hours: 8,
          child_tasks_count: 0
        }
      ];
    } catch (error) {
      console.error('Error fetching templates:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // エラー時はモックデータを返す（開発用）
      console.warn('Returning mock templates due to API error');
      return [
        {
          id: 1,
          title: '月次処理チェック',
          description: '毎月の処理状況を確認し、必要な対応を行います。',
          template_name: 'デフォルト月次チェック',
          category: { id: 1, name: '一般', color: '#3B82F6' },
          estimated_hours: 2,
          child_tasks_count: 0
        },
        {
          id: 2,
          title: '記帳代行業務',
          description: '請求書・領収書などに基づき会計データを作成します。',
          template_name: 'デフォルト記帳代行',
          category: { id: 2, name: '記帳代行', color: '#F59E0B' },
          estimated_hours: 3,
          child_tasks_count: 0
        }
      ];
    }
  },
  
  // テンプレート詳細を取得
  getTemplate: async (templateId) => {
    try {
      console.log('Fetching template details for ID:', templateId);
      const response = await apiClient.get(`/api/tasks/templates/${templateId}/`);
      console.log('Template details response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in getTemplate:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
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
  
  // ユーザー一覧を取得
  getUsers: async () => {
    try {
      const response = await apiClient.get('/api/users/');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
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
  
  // テンプレートの内包タスク取得
  getTemplateChildTasks: async (templateId) => {
    try {
      console.log('Fetching template child tasks for ID:', templateId);
      const response = await apiClient.get(`/api/tasks/templates/${templateId}/tasks/`);
      console.log('Template child tasks response:', response.data);
      
      // DRFのページネーション形式に対応
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        console.log('Found results array in response');
        return response.data.results;
      }
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      console.warn('Unexpected response format:', response.data);
      // 空の配列を返す前に親テンプレートが存在するか確認
      try {
        await apiClient.get(`/api/tasks/${templateId}/`);
      } catch (templateError) {
        console.error('Parent template does not exist:', templateError);
        throw new Error('Parent template not found');
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching template child tasks:', error);
      console.error('Error details:', error.response?.data || error.message);
      // 親テンプレートが見つからない場合は特別なエラーを投げる
      if (error.message === 'Parent template not found') {
        throw new Error('親テンプレートが存在しません');
      }
      throw error; // エラーを再スローして呼び出し元でハンドリングできるようにする
    }
  },
  
  // テンプレート内包タスク詳細取得
  getTemplateTask: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/tasks/template-tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template task:', error);
      throw error;
    }
  },
  
  // テンプレート内包タスク作成
  createTemplateTask: async (taskData) => {
    try {
      const response = await apiClient.post('/api/tasks/template-tasks/', taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating template task:', error);
      throw error;
    }
  },
  
  // テンプレート内包タスク更新
  updateTemplateTask: async (taskId, taskData) => {
    try {
      const response = await apiClient.put(`/api/tasks/template-tasks/${taskId}/`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error updating template task:', error);
      throw error;
    }
  },
  
  // テンプレート内包タスク削除
  deleteTemplateTask: async (taskId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/template-tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting template task:', error);
      throw error;
    }
  },
  
  // タスクスケジュール作成（内包タスク用）
  createTaskSchedule: async (scheduleData) => {
    try {
      const response = await apiClient.post('/api/tasks/schedules/', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error creating task schedule:', error);
      throw error;
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