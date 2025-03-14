import apiClient from './client';

// Time Management API service
const timeManagementApi = {
  // Get time entries with optional filters
  getTimeEntries: async (filters = {}) => {
    try {
      // Handle both formats: getTimeEntries(taskId) and getTimeEntries({filters})
      let apiParams = filters;
      if (typeof filters === 'number' || typeof filters === 'string') {
        apiParams = { task_id: filters };
      }
      
      const response = await apiClient.get('/api/time-management/entries/', { params: apiParams });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching time entries:', error);
      // Mock data for development - respect active filter
      const mockEntries = [
        {
          id: 1,
          description: "タスク作成の設計",
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString(),
          duration_seconds: 3600,
          is_running: false,
          task: { id: 1, title: "タスク管理機能実装" },
          client: { id: 1, name: "社内プロジェクト" },
          user: { id: 1, first_name: "テスト", last_name: "ユーザー" }
        },
        {
          id: 2,
          description: "時間記録の実装",
          start_time: new Date(Date.now() - 7200000).toISOString(),
          end_time: null,  // アクティブなエントリ
          duration_seconds: null,
          is_running: true,
          task: { id: 2, title: "時間管理機能開発" },
          client: { id: 1, name: "社内プロジェクト" },
          user: { id: 1, first_name: "テスト", last_name: "ユーザー" }
        }
      ];
      
      // エラー回避のため、filtersを直接使用
      const params = filters || {};
      
      // activeフィルターが指定されていればそれに従う
      if (params.active === 'true') {
        return mockEntries.filter(entry => entry.is_running || !entry.end_time);
      } else if (params.active === 'false') {
        return mockEntries.filter(entry => !entry.is_running && entry.end_time);
      } else if (params.task_id) {
        // タスクIDでフィルター
        return mockEntries.filter(entry => 
          entry.task && entry.task.id.toString() === params.task_id.toString()
        );
      }
      
      return mockEntries;
    }
  },
  
  // Get active time entry for a task
  getActiveTimeEntry: async (taskId) => {
    try {
      const response = await apiClient.get('/api/time-management/entries/', { 
        params: { task_id: taskId, active: true } 
      });
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return { data: response.data[0], active: true };
      } else if (response.data && response.data.results && Array.isArray(response.data.results) && response.data.results.length > 0) {
        return { data: response.data.results[0], active: true };
      }
      
      return { data: { active: false } };
    } catch (error) {
      console.error('Error fetching active time entry:', error);
      // Return mock data for development
      return {
        data: {
          id: Math.floor(Math.random() * 1000),
          task_id: taskId,
          description: "進行中の作業",
          start_time: new Date(Date.now() - 1800000).toISOString(),
          is_running: true,
          task: { id: taskId, title: "作業中のタスク" }
        }
      };
    }
  },
  
  // Get a specific time entry by ID
  getTimeEntry: async (entryId) => {
    try {
      const response = await apiClient.get(`/api/time-management/entries/${entryId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching time entry:', error);
      return null;
    }
  },
  
  // Create a new time entry
  createTimeEntry: async (entryData) => {
    try {
      const response = await apiClient.post('/api/time-management/entries/', entryData);
      return response.data;
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }
  },
  
  // Update a time entry
  updateTimeEntry: async (entryId, entryData) => {
    try {
      const response = await apiClient.patch(`/api/time-management/entries/${entryId}/`, entryData);
      return response.data;
    } catch (error) {
      console.error('Error updating time entry:', error);
      // モックデータでエラーをシミュレート
      const mockResponse = {
        id: entryId,
        ...entryData,
        start_time: entryData.start_time || new Date().toISOString(),
        end_time: entryData.end_time || null,
        is_running: !entryData.end_time,
        task: entryData.task_id ? { 
          id: entryData.task_id, 
          title: "更新されたタスク" 
        } : null,
        client: entryData.client_id ? { 
          id: entryData.client_id, 
          name: "更新されたクライアント" 
        } : null
      };
      return mockResponse;
    }
  },
  
  // Delete a time entry
  deleteTimeEntry: async (entryId) => {
    try {
      const response = await apiClient.delete(`/api/time-management/entries/${entryId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting time entry:', error);
      throw error;
    }
  },
  
  // Start a time entry
  startTimeEntry: async (entryData) => {
    try {
      // データの型を確認・変換して正しいリクエスト形式に合わせる
      const requestData = {
        task_id: entryData.task_id ? Number(entryData.task_id) : null,
        client_id: entryData.client_id ? Number(entryData.client_id) : null,
        fiscal_year_id: entryData.fiscal_year_id ? Number(entryData.fiscal_year_id) : null,
        description: entryData.description || ''
      };
      
      const response = await apiClient.post('/api/time-management/timer/start/', requestData);
      return response.data;
    } catch (error) {
      console.error('Error starting time entry:', error);
      
      // 既に実行中のタイマーがある場合はそのタイマー情報を返す
      if (error.response && 
          error.response.status === 400 && 
          error.response.data && 
          error.response.data.error === "You already have an active timer" &&
          error.response.data.time_entry) {
        console.info('Using existing active timer', error.response.data.time_entry);
        return error.response.data.time_entry;
      }
      
      // その他のAPIエラー時はエラーを投げて、コンポーネントでハンドリングさせる
      throw error;
    }
  },
  
  // Stop a time entry
  stopTimeEntry: async (entryId) => {
    try {
      if (!entryId) {
        console.error('Invalid entryId for stopTimeEntry:', entryId);
        throw new Error('有効なタイマーIDが指定されていません');
      }
      
      // entryIdを数値に変換
      const numericEntryId = Number(entryId);
      console.log(`Sending request to stop timer: ${numericEntryId}`);
      
      const response = await apiClient.post(`/api/time-management/timer/${numericEntryId}/stop/`);
      console.log('Stop timer API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error stopping time entry:', error);
      
      // エラーレスポンスの詳細を記録
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
      
      // APIエラー時はエラーを投げて、コンポーネントでハンドリングさせる
      throw error;
    }
  },
  
  // Get dashboard summary data
  getDashboardSummary: async (params = {}) => {
    try {
      const response = await apiClient.get('/api/time-management/dashboard/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      // Fallback to mock data
      return {
        today: {
          hours: 3.5,
          entry_count: 2
        },
        this_week: {
          hours: 22,
          entry_count: 12
        },
        this_month: {
          hours: 85,
          entry_count: 45
        },
        has_active_timer: false,
        active_timer: null
      };
    }
  },
  
  // Get breaks for a time entry
  getBreaks: async (entryId) => {
    try {
      const response = await apiClient.get(`/api/time-management/entries/${entryId}/breaks/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching breaks:', error);
      return [];
    }
  },
  
  // Start a break
  startBreak: async (entryId, breakData = {}) => {
    try {
      const response = await apiClient.post(`/api/time-management/entries/${entryId}/breaks/start/`, breakData);
      return response.data;
    } catch (error) {
      console.error('Error starting break:', error);
      // Mock data
      return {
        id: Math.floor(Math.random() * 1000),
        time_entry: entryId,
        start_time: new Date().toISOString(),
        reason: breakData.reason || '休憩'
      };
    }
  },
  
  // Stop a break
  stopBreak: async (breakId) => {
    try {
      const response = await apiClient.post(`/api/time-management/breaks/${breakId}/stop/`);
      return response.data;
    } catch (error) {
      console.error('Error stopping break:', error);
      return { success: true };
    }
  },
  
  // Generate a time report
  generateReport: async (reportData) => {
    try {
      const response = await apiClient.post('/api/time-management/reports/generate/', reportData);
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      // Mock data
      return {
        id: Math.floor(Math.random() * 1000),
        name: reportData.name,
        start_date: reportData.start_date,
        end_date: reportData.end_date,
        created_at: new Date().toISOString()
      };
    }
  },
  
  // Export a report to CSV
  exportReportToCsv: async (reportId) => {
    try {
      const response = await apiClient.get(`/api/time-management/reports/${reportId}/export/csv/`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `time-report-${reportId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (error) {
      console.error('Error exporting report to CSV:', error);
      return false;
    }
  },
  
  // Get chart data
  getChartData: async (type = 'time', period = 'week') => {
    try {
      // ViewSetのactionとして定義されているURLパターンに変更
      const response = await apiClient.get('/api/time-management/analytics/chart_data/', {
        params: { type, period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Mock data
      if (type === 'time') {
        return {
          labels: ['月', '火', '水', '木', '金', '土', '日'],
          datasets: [
            {
              label: 'Total Hours',
              data: [4.5, 6.2, 7.8, 5.5, 8.0, 2.5, 0],
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              borderColor: 'rgba(54, 162, 235, 1)',
            },
            {
              label: 'Billable Hours',
              data: [3.5, 5.0, 6.5, 4.5, 7.0, 1.5, 0],
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              borderColor: 'rgba(75, 192, 192, 1)',
            }
          ]
        };
      } else {
        return {
          labels: ['社内プロジェクト', 'クライアントA', 'クライアントB'],
          datasets: [
            {
              label: 'Productivity',
              data: [80, 65, 90],
              backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)'
              ],
            }
          ]
        };
      }
    }
  }
};

export default timeManagementApi;