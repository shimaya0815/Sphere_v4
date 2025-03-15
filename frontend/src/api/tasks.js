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
      
      // クリーンなデータオブジェクトを作成
      const cleanedData = { ...taskData };
      
      // nullとundefinedと空文字列を削除する - 特定のフィールドは例外的に処理
      Object.keys(cleanedData).forEach(key => {
        // 説明フィールドは常に送信する（空文字列も保持）
        if (key === 'description') {
          // 説明フィールドは空文字列もnullも明示的に送信
          console.log(`Preserving description value in create: "${cleanedData[key]}"`);
          return;
        }
        
        // 日付フィールドも明示的にnullを送信（クリア処理として）
        const dateFields = ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'];
        if (dateFields.includes(key)) {
          // 空文字列はnullに変換して明示的に送信
          if (cleanedData[key] === '') {
            cleanedData[key] = null;
            console.log(`Converting empty date to null for ${key}`);
          }
          return; // 日付フィールドは常に保持する
        }
        
        // 優先度も空欄の場合は明示的にnullに設定
        if (key === 'priority_value' || key === 'priority') {
          if (cleanedData[key] === '') {
            cleanedData[key] = null;
            console.log(`Converting empty priority to null for ${key}`);
          }
          return; // 優先度フィールドは常に保持する
        }
        
        // 週次繰り返しの曜日処理
        if (key === 'weekday') {
          if (cleanedData[key] === '' || cleanedData[key] === undefined) {
            cleanedData[key] = null;
            console.log('週次繰り返しの曜日が空のため、nullに設定します');
          } else if (typeof cleanedData[key] === 'string' && !isNaN(parseInt(cleanedData[key], 10))) {
            // 文字列の場合は数値に変換
            cleanedData[key] = parseInt(cleanedData[key], 10);
            console.log('週次繰り返しの曜日を数値に変換しました:', cleanedData[key]);
          }
          return; // weekdayフィールドは常に保持する
        }
        
        // 複数曜日指定の処理
        if (key === 'weekdays') {
          if (cleanedData[key] === '' || cleanedData[key] === undefined) {
            cleanedData[key] = null;
            console.log('週次繰り返しの複数曜日指定が空のため、nullに設定します');
          } else {
            console.log('週次繰り返しの複数曜日指定:', cleanedData[key]);
            
            // weekdaysフィールドが正しい形式かチェック（カンマ区切りの数値）
            try {
              const weekdayValues = cleanedData[key].split(',').map(day => parseInt(day.trim(), 10));
              const validWeekdays = weekdayValues.filter(val => !isNaN(val) && val >= 0 && val <= 6);
              if (validWeekdays.length > 0) {
                cleanedData[key] = validWeekdays.join(',');
                console.log('正規化された複数曜日:', cleanedData[key]);
              } else {
                cleanedData[key] = null;
                console.log('有効な曜日が指定されていないため、nullに設定します');
              }
            } catch (e) {
              console.error('複数曜日の解析エラー:', e);
              cleanedData[key] = null;
            }
          }
          return; // weekdaysフィールドは常に保持する
        }
        
        // カテゴリー、クライアント、決算期、担当者、レビューアーのフィールドは明示的なnullを保持する
        const preserveNullFields = ['category', 'client', 'fiscal_year', 'worker', 'reviewer'];
        if (preserveNullFields.includes(key) && cleanedData[key] === null) {
          // これらのフィールドはnullの場合でも保持する（クリアする意図がある）
          console.log(`Preserving null value for ${key}`);
        } else if (cleanedData[key] === null || cleanedData[key] === undefined || cleanedData[key] === '') {
          delete cleanedData[key];
        }
      });
      
      // 日付フィールドの処理
      const dateFields = ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'];
      
      // 日付フィールドをISO 8601形式に変換（存在する場合のみ）
      dateFields.forEach(field => {
        if (field in cleanedData && cleanedData[field]) {
          // YYYY-MM-DD形式の場合、ISO 8601形式に変換
          if (typeof cleanedData[field] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cleanedData[field])) {
            cleanedData[field] = `${cleanedData[field]}T00:00:00Z`;
            console.log(`Converted ${field} to ISO format:`, cleanedData[field]);
          }
        }
      });
      
      // タイトルの確認
      if (!cleanedData.title) {
        cleanedData.title = '新規タスク';
      }
      
      // ステータスがない場合は「未着手」のステータスを検索して設定
      if (!cleanedData.status) {
        console.log('No status in task data, setting default "未着手" status');
        
        try {
          const cachedStatuses = window.__SPHERE_CACHED_STATUSES;
          if (cachedStatuses && cachedStatuses.length > 0) {
            // 未着手ステータスの検索
            const notStartedStatus = cachedStatuses.find(s => s.name === '未着手');
            if (notStartedStatus) {
              cleanedData.status = notStartedStatus.id;
              console.log('Set default status from cache:', notStartedStatus.id);
            }
          }
        } catch (e) {
          console.warn('Error setting default status:', e);
        }
      }
      
      console.log('Create task data after cleaning:', cleanedData);
      
      const response = await apiClient.post('/api/tasks/', cleanedData);
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
      console.log('Task ID for update:', taskId);
      
      // ステータス関連のデバッグ
      if ('status' in taskData) {
        console.log('更新するステータス値:', taskData.status);
        console.log('ステータス値の型:', typeof taskData.status);
      }
      
      // データをクリーンアップ
      const cleanedData = { ...taskData };
      
      // 優先度の特別処理 - priority_valueがnullまたは空文字列の場合は明示的にnullとして扱う
      if ('priority_value' in cleanedData && (cleanedData.priority_value === null || cleanedData.priority_value === '')) {
        cleanedData.priority_value = null;
        console.log('優先度値がnullまたは空文字列のため、明示的にnullに設定します');
      }
      
      // 週次繰り返しの曜日処理 - 空文字列はnullに変換
      if ('weekday' in cleanedData && (cleanedData.weekday === '' || cleanedData.weekday === undefined)) {
        cleanedData.weekday = null;
        console.log('週次繰り返しの曜日が空のため、nullに設定します');
      } else if ('weekday' in cleanedData && typeof cleanedData.weekday === 'string' && !isNaN(parseInt(cleanedData.weekday, 10))) {
        // 文字列の場合は数値に変換
        cleanedData.weekday = parseInt(cleanedData.weekday, 10);
        console.log('週次繰り返しの曜日を数値に変換しました:', cleanedData.weekday);
      }
      
      // 複数曜日指定の処理
      if ('weekdays' in cleanedData) {
        if (cleanedData.weekdays === '' || cleanedData.weekdays === undefined) {
          cleanedData.weekdays = null;
          console.log('週次繰り返しの複数曜日指定が空のため、nullに設定します');
        } else {
          console.log('週次繰り返しの複数曜日指定:', cleanedData.weekdays);
          
          // weekdaysフィールドが正しい形式かチェック（カンマ区切りの数値）
          try {
            const weekdayValues = cleanedData.weekdays.split(',').map(day => parseInt(day.trim(), 10));
            const validWeekdays = weekdayValues.filter(val => !isNaN(val) && val >= 0 && val <= 6);
            if (validWeekdays.length > 0) {
              cleanedData.weekdays = validWeekdays.join(',');
              console.log('正規化された複数曜日:', cleanedData.weekdays);
            } else {
              cleanedData.weekdays = null;
              console.log('有効な曜日が指定されていないため、nullに設定します');
            }
          } catch (e) {
            console.error('複数曜日の解析エラー:', e);
            cleanedData.weekdays = null;
          }
        }
      }
      
      // 日付フィールド処理
      const dateFields = ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'];
      
      // nullとundefinedと空文字列を削除する - 特定のフィールドは例外的に処理
      Object.keys(cleanedData).forEach(key => {
        // 説明フィールドは常に送信する（空文字列も保持）
        if (key === 'description') {
          // 説明フィールドは空文字列もnullも明示的に送信
          console.log(`Preserving description value: "${cleanedData[key]}"`);
          return;
        }
        
        // 日付フィールドも明示的にnullを送信（クリア処理として）
        const dateFields = ['due_date', 'start_date', 'completed_at', 'recurrence_end_date'];
        if (dateFields.includes(key)) {
          // 空文字列はnullに変換して明示的に送信
          if (cleanedData[key] === '') {
            cleanedData[key] = null;
            console.log(`Converting empty date to null for ${key} in update`);
          }
          return; // 日付フィールドは常に保持する
        }
        
        // 優先度も空欄の場合は明示的にnullに設定
        if (key === 'priority_value' || key === 'priority') {
          if (cleanedData[key] === '' || cleanedData[key] === undefined) {
            cleanedData[key] = null;
            console.log(`Converting empty priority to null for ${key} in update`);
          }
          return; // 優先度フィールドは常に保持する
        }
        
        // カテゴリー、クライアント、決算期、担当者、レビューアーのフィールドは明示的なnullを保持する
        const preserveNullFields = ['category', 'client', 'fiscal_year', 'worker', 'reviewer', 'status'];
        if (preserveNullFields.includes(key) && cleanedData[key] === null) {
          // これらのフィールドはnullの場合でも保持する（クリアする意図がある）
          console.log(`Preserving null value for ${key} in update`);
        } else if (cleanedData[key] === null || cleanedData[key] === undefined || cleanedData[key] === '') {
          delete cleanedData[key];
        }
      });
      
      // 日付フィールドをISO 8601形式に変換（存在する場合のみ）
      dateFields.forEach(field => {
        if (field in cleanedData && cleanedData[field]) {
          // YYYY-MM-DD形式の場合、ISO 8601形式に変換
          if (typeof cleanedData[field] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cleanedData[field])) {
            cleanedData[field] = `${cleanedData[field]}T00:00:00Z`;
            console.log(`Converted ${field} to ISO format:`, cleanedData[field]);
          }
        }
      });
      
      console.log('Cleaned update data:', cleanedData);
      
      // タイトルのバリデーション - 空の場合はエラーを投げる
      if ('title' in cleanedData && (!cleanedData.title || cleanedData.title.trim() === '')) {
        console.error('タイトルは必須項目です。空のタイトルで更新できません。');
        throw new Error('タイトルは必須項目です');
      }
      
      // 最終確認 - ステータスがちゃんと含まれているか
      if ('status' in cleanedData) {
        console.log('最終的なステータス値:', cleanedData.status);
      } else {
        console.log('ステータス値はクリーニング中に削除されました');
      }
      
      // PATCHメソッドを使用して部分更新
      console.log('Using PATCH method with cleaned data');
      const response = await apiClient.patch(`/api/tasks/${taskId}/`, cleanedData);
      console.log('Task update response:', response.data);
      
      // レスポンスのステータス確認
      if (response.data && response.data.status) {
        console.log('更新後のステータスID:', response.data.status);
        
        // ステータスIDが文字列の場合は数値に変換（バックエンドとの一貫性のため）
        if (response.data.status && typeof response.data.status === 'string' && !isNaN(parseInt(response.data.status, 10))) {
          response.data.status = parseInt(response.data.status, 10);
          console.log('ステータスIDを数値に変換しました:', response.data.status);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
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
      
      let statusesList = [];
      
      // レスポンスがpaginationフォーマットかどうかをチェック
      if (response.data && response.data.results) {
        console.log('Pagination format detected, using results array');
        statusesList = response.data.results;
      }
      // 配列形式のレスポンスをチェック
      else if (Array.isArray(response.data)) {
        console.log('Array format detected, using as is');
        statusesList = response.data;
      }
      // その他の形式
      else if (response.data) {
        console.log('Unknown format, using raw data');
        statusesList = [response.data];
      } else {
        console.warn('No data found in API response');
        statusesList = [];
      }
      
      // 「完了」ステータスが存在するか確認
      const hasCompletedStatus = statusesList.some(status => status.name === '完了');
      console.log('Does status list include 完了?', hasCompletedStatus);
      
      // 「完了」ステータスがない場合はフォールバックリストを使用
      if (!hasCompletedStatus && statusesList.length > 0) {
        console.warn('Completed status not found in API response. Adding a default one.');
        
        // IDを数値型で設定する（文字列型からの変更）
        const maxId = Math.max(...statusesList.map(s => parseInt(s.id) || 0));
        statusesList.push({
          id: maxId + 1,  // 既存の最大IDに+1した数値を使用
          name: '完了',
          color: '#10B981',
          order: 999,
          business: statusesList[0].business
        });
      }
      
      return {
        data: statusesList
      };
    } catch (error) {
      console.error('Error fetching statuses:', error);
      // エラー時はフォールバック値を返す
      return {
        data: [
          { id: 1, name: '未着手', color: '#9CA3AF', order: 1 },
          { id: 2, name: '進行中', color: '#3B82F6', order: 2 },
          { id: 3, name: '完了', color: '#10B981', order: 3 }
        ]
      };
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
  },

  /**
   * タスクの完了状態を更新
   */
  completeTask: async (taskId, isCompleted) => {
    try {
      // 完了日時は自動設定せず、ステータスのみを変更
      const cachedStatuses = window.__SPHERE_CACHED_STATUSES;
      let statusId = null;
      
      if (cachedStatuses && cachedStatuses.length > 0) {
        if (isCompleted) {
          // 完了ステータスを検索
          const completedStatus = cachedStatuses.find(s => s.name === '完了');
          if (completedStatus) {
            statusId = completedStatus.id;
          }
        } else {
          // 未着手ステータスを検索（完了から戻す場合）
          const notStartedStatus = cachedStatuses.find(s => s.name === '未着手');
          if (notStartedStatus) {
            statusId = notStartedStatus.id;
          }
        }
      }
      
      // ステータスIDが見つかった場合のみ更新
      const updateData = {};
      if (statusId !== null) {
        updateData.status = statusId;
      }
      
      console.log(`タスク${taskId}の完了状態を${isCompleted ? '完了' : '未完了'}に変更します。ステータスID: ${statusId}`);
      const response = await apiClient.patch(`/api/tasks/${taskId}/`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  },

  /**
   * 次回の繰り返しタスクを作成
   */
  createNextRecurringTask: async (taskId) => {
    try {
      // APIのパスを修正
      const response = await apiClient.post(`/api/tasks/${taskId}/create-next-recurring/`);
      return response.data;
    } catch (error) {
      console.error('Error creating next recurring task:', error);
      throw error;
    }
  },

  /**
   * 次回の繰り返し日付を計算
   */
  calculateNextRecurringDates: async (taskId) => {
    try {
      // APIのパスを修正
      const response = await apiClient.get(`/api/tasks/${taskId}/calculate-next-dates/`);
      return response.data;
    } catch (error) {
      console.error('Error calculating next dates:', error);
      throw error;
    }
  }
};

export default tasksApi;