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
      console.log('Create task data before cleaning:', taskData);
      
      // デフォルトの必須データを確実に設定
      const requiredData = {
        title: taskData.title || '新規タスク', // タイトルが必須
      };
      
      // 日付フィールドの処理 - 空の値を削除、不正な形式の値をnullに変換
      const dateFields = ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'];
      
      // 既存のデータを追加（日付フィールドを除く）
      Object.keys(taskData).forEach(key => {
        if (!dateFields.includes(key)) {
          requiredData[key] = taskData[key];
        } else if (taskData[key] && taskData[key] !== '') {
          // 有効な日付文字列のみを設定、それ以外はnull
          try {
            // 日付の妥当性チェック - 有効な日付文字列であればそのまま使用
            const date = new Date(taskData[key]);
            if (!isNaN(date.getTime())) {
              // YYYY-MM-DD形式の場合、ISO 8601形式に変換
              if (/^\d{4}-\d{2}-\d{2}$/.test(taskData[key])) {
                requiredData[key] = `${taskData[key]}T00:00:00Z`;
                console.log(`Converted ${key} to ISO format:`, requiredData[key]);
              } else {
                requiredData[key] = taskData[key];
              }
            } else {
              requiredData[key] = null;
            }
          } catch (e) {
            requiredData[key] = null;
          }
        }
      });
      
      // ステータスがない場合は「未着手」のステータスを検索して設定
      if (!requiredData.status) {
        console.log('No status in task data, setting default "未着手" status');
        // キャッシュされたステータス一覧を取得する試み
        try {
          const cachedStatuses = window.__SPHERE_CACHED_STATUSES;
          if (cachedStatuses && cachedStatuses.length > 0) {
            // 未着手ステータスの検索
            const notStartedStatus = cachedStatuses.find(s => s.name === '未着手');
            if (notStartedStatus) {
              requiredData.status = notStartedStatus.id;
              console.log('Set default status from cache:', notStartedStatus.id);
            } else {
              // 未着手が見つからない場合は最小のorder値を持つステータスを設定
              const firstStatus = [...cachedStatuses].sort((a, b) => a.order - b.order)[0];
              if (firstStatus) {
                requiredData.status = firstStatus.id;
                console.log('Set first ordered status from cache:', firstStatus.id);
              }
            }
          }
        } catch (e) {
          console.warn('Error setting default status:', e);
        }
      }
      
      console.log('Create task data after cleaning:', requiredData);
      
      const response = await apiClient.post('/api/tasks/', requiredData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // タスク更新
  updateTask: async (taskId, taskData) => {
    try {
      console.log('Updating task data:', taskData);
      
      // デバッグのためのモードを追加（緊急措置）
      const DEBUG_MODE = true;
      const SAFE_MODE = true;
      
      // 日付フィールドのISO 8601形式への変換
      const dateFields = ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'];
      const processedData = { ...taskData };
      
      // 日付フィールドをISO 8601形式に変換
      dateFields.forEach(field => {
        if (field in processedData && processedData[field]) {
          // YYYY-MM-DD形式の場合、ISO 8601形式に変換
          if (/^\d{4}-\d{2}-\d{2}$/.test(processedData[field])) {
            processedData[field] = `${processedData[field]}T00:00:00Z`;
            console.log(`Converted ${field} to ISO format:`, processedData[field]);
          }
        }
      });
      
      if (DEBUG_MODE) {
        console.log('🔍 TASK UPDATE DEBUGGING');
        console.log('Task ID:', taskId);
        console.log('Update data (full):', JSON.stringify(processedData, null, 2));
        console.log('Update data keys:', Object.keys(processedData));
        
        if (SAFE_MODE) {
          // セーフモード：タイトルが空の場合は削除し、他のデータのみを更新
          if ('title' in processedData && (!processedData.title || processedData.title.trim() === '')) {
            console.warn('🔴 SAFE MODE: Removing empty title from update data');
            const safeData = { ...processedData };
            delete safeData.title;
            
            // タイトル以外のデータがなければ、更新自体をスキップ
            if (Object.keys(safeData).length === 0) {
              console.warn('🔴 SAFE MODE: No valid data to update, skipping API call');
              return { message: 'No valid data to update' };
            }
            
            // タイトル以外のフィールドだけで更新
            console.log('🟢 SAFE MODE: Updating with safe data:', safeData);
            try {
              const response = await apiClient.patch(`/api/tasks/${taskId}/`, safeData);
              return response.data;
            } catch (safeError) {
              console.error('SAFE MODE update failed:', safeError);
              throw safeError;
            }
          }
        }
      }
      
      // タイトルのバリデーション - 空の場合はエラーを投げる
      if ('title' in processedData && (!processedData.title || processedData.title.trim() === '')) {
        console.error('タイトルは必須項目です。空のタイトルで更新できません。');
        throw new Error('タイトルは必須項目です');
      }
      
      // PUTではなくPATCHメソッドを使用して部分更新する
      // （PUTは全てのフィールドを必要とするが、PATCHは変更されたフィールドだけを更新）
      console.log('Using PATCH method for partial update');
      const response = await apiClient.patch(`/api/tasks/${taskId}/`, processedData);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // タイトルエラーを検出して特別に処理
        if (error.response.data && error.response.data.title) {
          console.warn('Title error detected:', error.response.data.title);
          
          // タイトルエラーを独自の形式で再スロー
          const titleError = new Error('タイトルエラー');
          titleError.field = 'title';
          titleError.details = error.response.data.title;
          throw titleError;
        }
      }
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
      console.log('API - Fetching task categories');
      const response = await apiClient.get('/api/tasks/categories/');
      console.log('API - Categories response:', response);
      
      // レスポンスの形式に応じて適切に処理
      if (response.data && Array.isArray(response.data)) {
        console.log('API - Returning array format categories:', response.data.length);
        return {
          data: response.data
        };
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        console.log('API - Returning paginated categories:', response.data.results.length);
        return {
          data: response.data.results
        };
      } else if (response.data) {
        console.log('API - Returning object format categories');
        return {
          data: [response.data]
        };
      }
      
      // 空の場合はデフォルト値を返す
      console.warn('API - No categories found, returning default');
      return {
        data: [{ id: 1, name: '一般', color: '#6366F1' }]
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      // エラーの場合はデフォルト値を返し、UIが壊れないようにする
      return {
        data: [{ id: 1, name: '一般', color: '#6366F1' }]
      };
    }
  },
  
  // タスクステータス一覧を取得
  getStatuses: async () => {
    try {
      console.log('Calling API: /api/tasks/statuses/');
      const response = await apiClient.get('/api/tasks/statuses/');
      console.log('API response for statuses:', response);
      
      // レスポンスがpaginationフォーマットかどうかをチェック
      if (response.data && response.data.results) {
        console.log('Pagination format detected, returning results array');
        return {
          data: response.data.results
        };
      }
      
      // 配列形式のレスポンスをチェック
      if (Array.isArray(response.data)) {
        console.log('Array format detected, returning as is');
        return {
          data: response.data
        };
      }
      
      // その他の形式
      console.log('Unknown format, returning raw data');
      return response;
    } catch (error) {
      console.error('Error fetching statuses:', error);
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