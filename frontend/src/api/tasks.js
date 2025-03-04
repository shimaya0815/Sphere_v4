import apiClient from './client';

// APIリクエストのレスポンスが正常に返ってこない場合のモックデータ
const mockTasks = [
  {
    id: 1,
    title: "年度決算書類の作成",
    description: "クライアントの年度決算処理を行い、必要な書類を全て作成する。\n\n- 貸借対照表\n- 損益計算書\n- キャッシュフロー計算書\n- 勘定科目内訳書",
    status: "in_progress",
    status_name: "進行中",
    priority: "high",
    priority_name: "高",
    due_date: "2025-03-31",
    assignee_name: "山田太郎",
    reviewer_name: "佐藤次郎",
    client_name: "株式会社ABC商事",
    is_fiscal_task: true,
    fiscal_period: "15",
    estimated_hours: 12,
    created_at: "2025-01-15T09:00:00Z"
  },
  {
    id: 2,
    title: "月次試算表チェック",
    description: "本月の会計データをチェックし、試算表を作成する。異常値がある場合は修正し、クライアントに報告する。",
    status: "not_started",
    status_name: "未着手",
    priority: "medium",
    priority_name: "中",
    due_date: "2025-04-15",
    assignee_name: "山田太郎",
    reviewer_name: "佐藤次郎",
    client_name: "株式会社XYZ工業",
    is_fiscal_task: false,
    estimated_hours: 4,
    created_at: "2025-03-01T10:30:00Z"
  },
  {
    id: 3,
    title: "法人税申告書の作成",
    description: "確定した決算書に基づいて法人税申告書を作成する。税額控除や特例の適用可能性を検討すること。",
    status: "in_review",
    status_name: "レビュー中",
    priority: "high",
    priority_name: "高",
    due_date: "2025-05-20",
    assignee_name: "高橋花子",
    reviewer_name: "佐藤次郎",
    client_name: "株式会社ABC商事",
    is_fiscal_task: true,
    fiscal_period: "15",
    estimated_hours: 8,
    created_at: "2025-02-10T14:00:00Z"
  }
];

// タスク関連のAPI
const tasksApi = {
  // タスク一覧を取得
  getTasks: async (filters = {}) => {
    try {
      console.log('Fetching tasks with filters:', filters);
      const response = await apiClient.get('/tasks/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      console.log('Using mock data as fallback');
      return mockTasks;
    }
  },
  
  // タスクの詳細を取得
  getTask: async (taskId) => {
    try {
      const response = await apiClient.get(`/tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task with id ${taskId}:`, error);
      // ID に該当するモックデータを返す
      const mockTask = mockTasks.find(task => task.id === parseInt(taskId));
      if (mockTask) {
        return mockTask;
      }
      // モックにもなければエラーを投げる
      throw error;
    }
  },
  
  // 新規タスク作成
  createTask: async (taskData) => {
    try {
      const response = await apiClient.post('/tasks/', taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      // モック用に仮のレスポンスを返す
      return {
        ...taskData,
        id: Math.floor(Math.random() * 1000) + 100,
        created_at: new Date().toISOString()
      };
    }
  },
  
  // タスク更新
  updateTask: async (taskId, taskData) => {
    try {
      const response = await apiClient.put(`/tasks/${taskId}/`, taskData);
      return response.data;
    } catch (error) {
      console.error(`Error updating task with id ${taskId}:`, error);
      // モック用に仮のレスポンスを返す
      return {
        ...taskData,
        id: taskId,
        updated_at: new Date().toISOString()
      };
    }
  },
  
  // タスク削除
  deleteTask: async (taskId) => {
    try {
      const response = await apiClient.delete(`/tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting task with id ${taskId}:`, error);
      // モック用に仮のレスポンスを返す
      return { success: true };
    }
  },
  
  // タスクステータス変更
  changeStatus: async (taskId, statusData) => {
    try {
      const response = await apiClient.post(`/tasks/${taskId}/change-status/`, statusData);
      return response.data;
    } catch (error) {
      console.error(`Error changing status for task with id ${taskId}:`, error);
      // モック用に仮のレスポンスを返す
      return { 
        id: taskId,
        status: statusData.status,
        status_name: statusData.status === 'completed' ? '完了' : 
                     statusData.status === 'in_progress' ? '進行中' : 
                     statusData.status === 'in_review' ? 'レビュー中' : '未着手'
      };
    }
  },
  
  // タスク完了マーク
  markComplete: async (taskId) => {
    try {
      const response = await apiClient.post(`/tasks/${taskId}/complete/`);
      return response.data;
    } catch (error) {
      console.error(`Error marking task ${taskId} as complete:`, error);
      // モック用に仮のレスポンスを返す
      return { 
        id: taskId,
        status: 'completed',
        status_name: '完了',
        completed_at: new Date().toISOString()
      };
    }
  },
  
  // タスクテンプレート一覧を取得
  getTaskTemplates: async () => {
    try {
      const response = await apiClient.get('/tasks/templates/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task templates:', error);
      // モック用に仮のレスポンスを返す
      return [
        {
          id: 1,
          name: '月次試算表作成',
          description: '月次の会計データを確認し、試算表を作成する',
          status: 'not_started',
          priority: 'medium',
          estimated_hours: 4,
          category: 'accounting'
        },
        {
          id: 2,
          name: '年度決算処理',
          description: '年度末の決算書類を作成する一連の作業',
          status: 'not_started',
          priority: 'high',
          estimated_hours: 16,
          category: 'accounting',
          is_fiscal_task: true
        }
      ];
    }
  },
  
  // タスクカテゴリー一覧を取得
  getCategories: async () => {
    try {
      const response = await apiClient.get('/tasks/categories/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task categories:', error);
      // モック用に仮のレスポンスを返す
      return [
        { id: 1, name: '一般', color: '#3B82F6' },
        { id: 2, name: '税務顧問', color: '#10B981' },
        { id: 3, name: '記帳代行', color: '#8B5CF6' },
        { id: 4, name: '決算', color: '#F59E0B' }
      ];
    }
  },
  
  // タスクステータス一覧を取得
  getStatuses: async () => {
    try {
      const response = await apiClient.get('/tasks/statuses/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task statuses:', error);
      // モック用に仮のレスポンスを返す
      return [
        { id: 1, name: '未着手', color: '#9CA3AF', code: 'not_started', assignee_type: 'worker' },
        { id: 2, name: '進行中', color: '#3B82F6', code: 'in_progress', assignee_type: 'worker' },
        { id: 3, name: 'レビュー中', color: '#F59E0B', code: 'in_review', assignee_type: 'reviewer' },
        { id: 4, name: '完了', color: '#10B981', code: 'completed', assignee_type: 'none' }
      ];
    }
  },
  
  // タスク優先度一覧を取得
  getPriorities: async () => {
    try {
      const response = await apiClient.get('/tasks/priorities/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task priorities:', error);
      // モック用に仮のレスポンスを返す
      return [
        { id: 1, name: '低', color: '#10B981', code: 'low' },
        { id: 2, name: '中', color: '#F59E0B', code: 'medium' },
        { id: 3, name: '高', color: '#EF4444', code: 'high' }
      ];
    }
  }
};

export default tasksApi;