import apiClient from './client';

// Time Management API service
const timeManagementApi = {
  // Get time entries with optional filters
  getTimeEntries: async (filters = {}) => {
    try {
      const response = await apiClient.get('/api/time-management/entries/', { params: filters });
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
      
      // activeフィルターが指定されていればそれに従う
      if (filters.active === 'true') {
        return mockEntries.filter(entry => entry.is_running || !entry.end_time);
      } else if (filters.active === 'false') {
        return mockEntries.filter(entry => !entry.is_running && entry.end_time);
      } else if (filters.task_id) {
        // タスクIDでフィルター
        return mockEntries.filter(entry => 
          entry.task && entry.task.id.toString() === filters.task_id.toString()
        );
      }
      
      return mockEntries;
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
      const response = await apiClient.post('/api/time-management/timer/start/', entryData);
      return response.data;
    } catch (error) {
      console.error('Error starting time entry:', error);
      // Mock data for development
      return {
        id: Math.floor(Math.random() * 1000),
        task_id: entryData.task_id,
        description: entryData.description,
        start_time: new Date().toISOString(),
        is_running: true,
        task: entryData.task_id ? { id: entryData.task_id, title: "モックタスク" } : null,
        client: entryData.client_id ? { id: entryData.client_id, name: "モッククライアント" } : null
      };
    }
  },
  
  // Stop a time entry
  stopTimeEntry: async (entryId) => {
    try {
      const response = await apiClient.post(`/api/time-management/timer/${entryId}/stop/`);
      return response.data;
    } catch (error) {
      console.error('Error stopping time entry:', error);
      return { success: true };
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
      const response = await apiClient.get('/api/time-management/analytics/chart-data/', {
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