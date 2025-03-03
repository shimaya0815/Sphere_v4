import apiClient from './client';

// モックデータ作成のためのヘルパー関数
const generateMockTimeEntries = (count = 10) => {
  const entries = [];
  const now = new Date();
  const statuses = ['active', 'completed'];
  
  for (let i = 0; i < count; i++) {
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - Math.floor(Math.random() * 30));
    
    const isCompleted = Math.random() > 0.1; // 10%は進行中
    
    const endDate = isCompleted ? new Date(startDate.getTime() + Math.random() * 3600000) : null;
    const duration = isCompleted ? (endDate - startDate) : null;
    
    entries.push({
      id: i + 1,
      user: {
        id: 1,
        email: 'user@example.com',
        full_name: 'テストユーザー'
      },
      task: Math.random() > 0.3 ? {
        id: Math.floor(Math.random() * 3) + 1,
        title: `タスク${Math.floor(Math.random() * 3) + 1}`
      } : null,
      client: Math.random() > 0.3 ? {
        id: Math.floor(Math.random() * 2) + 1,
        name: `クライアント${Math.floor(Math.random() * 2) + 1}`
      } : null,
      description: `作業内容 ${i + 1}`,
      start_time: startDate.toISOString(),
      end_time: endDate ? endDate.toISOString() : null,
      duration: duration,
      duration_seconds: duration ? duration / 1000 : null,
      is_billable: Math.random() > 0.2,
      is_approved: Math.random() > 0.7,
      is_running: !isCompleted,
      created_at: startDate.toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  return entries;
};

// モックレポートデータ作成
const generateMockReport = (id, reportData) => {
  return {
    id: id,
    name: reportData.name || `レポート ${id}`,
    description: reportData.description || '自動生成レポート',
    start_date: reportData.start_date,
    end_date: reportData.end_date,
    filters: reportData.filters || {},
    data: {
      entry_count: Math.floor(Math.random() * 50) + 10,
      total_hours: Math.floor(Math.random() * 100) + 20,
      user_data: [
        {
          user_id: 1,
          user_name: 'テストユーザー',
          hours: Math.floor(Math.random() * 100) + 20,
          entry_count: Math.floor(Math.random() * 30) + 5
        }
      ],
      task_data: [
        {
          task_id: 1,
          task_title: 'タスク1',
          hours: Math.floor(Math.random() * 50) + 10,
          entry_count: Math.floor(Math.random() * 20) + 2
        },
        {
          task_id: 2,
          task_title: 'タスク2',
          hours: Math.floor(Math.random() * 50) + 10,
          entry_count: Math.floor(Math.random() * 20) + 2
        }
      ],
      client_data: [
        {
          client_id: 1,
          client_name: 'クライアント1',
          hours: Math.floor(Math.random() * 70) + 15,
          entry_count: Math.floor(Math.random() * 25) + 3
        },
        {
          client_id: 2,
          client_name: 'クライアント2',
          hours: Math.floor(Math.random() * 70) + 15,
          entry_count: Math.floor(Math.random() * 25) + 3
        }
      ],
      generated_at: new Date().toISOString()
    },
    creator: {
      id: 1,
      email: 'user@example.com',
      full_name: 'テストユーザー'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

// モックチャートデータ作成
const generateMockChartData = (type, period) => {
  if (type === 'time') {
    let labels = [];
    if (period === 'day') {
      labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    } else if (period === 'week') {
      labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    } else if (period === 'month') {
      labels = Array.from({length: 30}, (_, i) => `${i+1}`);
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Hours',
          data: labels.map(() => Math.random() * 8),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)'
        },
        {
          label: 'Billable Hours',
          data: labels.map(() => Math.random() * 6),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)'
        }
      ]
    };
  } else {
    // 生産性チャート
    let labels = [];
    if (period === 'day') {
      labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    } else if (period === 'week') {
      labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    } else if (period === 'month') {
      labels = Array.from({length: 30}, (_, i) => `${i+1}`);
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Productivity',
          data: labels.map(() => Math.random() * 100),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)'
        }
      ]
    };
  }
};

// Time Management API service - モックデータ版
const timeManagementApi = {
  // Get time entries with optional filters
  getTimeEntries: async (filters = {}) => {
    console.log('Using mock getTimeEntries with filters:', filters);
    // APIが実装されたら以下をコメント解除
    // const response = await apiClient.get('/time-management/entries/', { params: filters });
    // return response.data;
    
    // モックデータ
    const mockEntries = generateMockTimeEntries(20);
    return mockEntries;
  },
  
  // Get a specific time entry by ID
  getTimeEntry: async (entryId) => {
    console.log('Using mock getTimeEntry:', entryId);
    // const response = await apiClient.get(`/time-management/entries/${entryId}/`);
    // return response.data;
    
    const mockEntries = generateMockTimeEntries(20);
    return mockEntries.find(entry => entry.id === entryId) || null;
  },
  
  // Create a new time entry
  createTimeEntry: async (entryData) => {
    console.log('Using mock createTimeEntry:', entryData);
    // const response = await apiClient.post('/time-management/entries/', entryData);
    // return response.data;
    
    const mockEntry = {
      id: Math.floor(Math.random() * 1000) + 100,
      user: {
        id: 1,
        email: 'user@example.com',
        full_name: 'テストユーザー'
      },
      task: entryData.task_id ? {
        id: entryData.task_id,
        title: `タスク${entryData.task_id}`
      } : null,
      client: entryData.client_id ? {
        id: entryData.client_id,
        name: `クライアント${entryData.client_id}`
      } : null,
      description: entryData.description || '',
      start_time: new Date().toISOString(),
      end_time: null,
      duration: null,
      duration_seconds: null,
      is_billable: true,
      is_approved: false,
      is_running: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return mockEntry;
  },
  
  // Update a time entry
  updateTimeEntry: async (entryId, entryData) => {
    console.log('Using mock updateTimeEntry:', entryId, entryData);
    // const response = await apiClient.patch(`/time-management/entries/${entryId}/`, entryData);
    // return response.data;
    
    return {
      ...entryData,
      id: entryId,
      updated_at: new Date().toISOString()
    };
  },
  
  // Delete a time entry
  deleteTimeEntry: async (entryId) => {
    console.log('Using mock deleteTimeEntry:', entryId);
    // const response = await apiClient.delete(`/time-management/entries/${entryId}/`);
    // return response.data;
    
    return { success: true };
  },
  
  // Start a time entry
  startTimeEntry: async (entryData) => {
    console.log('Using mock startTimeEntry:', entryData);
    // const response = await apiClient.post('/time-management/entries/start/', entryData);
    // return response.data;
    
    const mockEntry = {
      id: Math.floor(Math.random() * 1000) + 100,
      user: {
        id: 1,
        email: 'user@example.com',
        full_name: 'テストユーザー'
      },
      task: entryData.task_id ? {
        id: entryData.task_id,
        title: `タスク${entryData.task_id}`
      } : null,
      client: entryData.client_id ? {
        id: entryData.client_id,
        name: `クライアント${entryData.client_id}`
      } : null,
      description: entryData.description || '',
      start_time: new Date().toISOString(),
      end_time: null,
      duration: null,
      duration_seconds: null,
      is_billable: true,
      is_approved: false,
      is_running: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return mockEntry;
  },
  
  // Stop a time entry
  stopTimeEntry: async (entryId) => {
    console.log('Using mock stopTimeEntry:', entryId);
    // const response = await apiClient.post(`/time-management/entries/${entryId}/stop/`);
    // return response.data;
    
    const now = new Date();
    const startTime = new Date(now.getTime() - 3600000); // 1時間前
    
    return {
      id: entryId,
      user: {
        id: 1,
        email: 'user@example.com',
        full_name: 'テストユーザー'
      },
      task: null,
      client: null,
      description: '作業中断',
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      duration: '01:00:00',
      duration_seconds: 3600,
      is_billable: true,
      is_approved: false,
      is_running: false,
      created_at: startTime.toISOString(),
      updated_at: now.toISOString()
    };
  },
  
  // Start a break
  startBreak: async (entryId, breakData = {}) => {
    console.log('Using mock startBreak:', entryId, breakData);
    // const response = await apiClient.post(`/time-management/entries/${entryId}/breaks/start/`, breakData);
    // return response.data;
    
    return {
      id: Math.floor(Math.random() * 100) + 1,
      time_entry: entryId,
      start_time: new Date().toISOString(),
      end_time: null,
      duration: null,
      duration_seconds: null,
      reason: breakData.reason || '休憩'
    };
  },
  
  // Stop a break
  stopBreak: async (breakId) => {
    console.log('Using mock stopBreak:', breakId);
    // const response = await apiClient.post(`/time-management/breaks/${breakId}/stop/`);
    // return response.data;
    
    const startTime = new Date(new Date().getTime() - 600000); // 10分前
    const endTime = new Date();
    
    return {
      id: breakId,
      time_entry: 1,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration: '00:10:00',
      duration_seconds: 600,
      reason: '休憩'
    };
  },
  
  // Get breaks for a time entry
  getBreaks: async (entryId) => {
    console.log('Using mock getBreaks:', entryId);
    // const response = await apiClient.get(`/time-management/entries/${entryId}/breaks/`);
    // return response.data;
    
    return [];
  },
  
  // Get time reports
  getReports: async () => {
    console.log('Using mock getReports');
    // const response = await apiClient.get('/time-management/reports/');
    // return response.data;
    
    return [generateMockReport(1, { name: 'レポート1' }), generateMockReport(2, { name: 'レポート2' })];
  },
  
  // Get a specific report by ID
  getReport: async (reportId) => {
    console.log('Using mock getReport:', reportId);
    // const response = await apiClient.get(`/time-management/reports/${reportId}/`);
    // return response.data;
    
    return generateMockReport(reportId, { name: `レポート ${reportId}` });
  },
  
  // Create a new report
  createReport: async (reportData) => {
    console.log('Using mock createReport:', reportData);
    // const response = await apiClient.post('/time-management/reports/', reportData);
    // return response.data;
    
    return generateMockReport(Math.floor(Math.random() * 100) + 10, reportData);
  },
  
  // Update a report
  updateReport: async (reportId, reportData) => {
    console.log('Using mock updateReport:', reportId, reportData);
    // const response = await apiClient.patch(`/time-management/reports/${reportId}/`, reportData);
    // return response.data;
    
    return generateMockReport(reportId, reportData);
  },
  
  // Delete a report
  deleteReport: async (reportId) => {
    console.log('Using mock deleteReport:', reportId);
    // const response = await apiClient.delete(`/time-management/reports/${reportId}/`);
    // return response.data;
    
    return { success: true };
  },
  
  // Generate a report
  generateReport: async (reportParams) => {
    console.log('Using mock generateReport:', reportParams);
    // const response = await apiClient.post('/time-management/reports/generate/', reportParams);
    // return response.data;
    
    return generateMockReport(Math.floor(Math.random() * 100) + 10, reportParams);
  },
  
  // Export a report to CSV
  exportReportToCsv: async (reportId) => {
    console.log('Using mock exportReportToCsv:', reportId);
    // const response = await apiClient.get(`/time-management/reports/${reportId}/export/csv/`, {
    //   responseType: 'blob',
    // });
    
    // CSVデータ生成
    const csvContent = 
`"Report Name","レポート ${reportId}"
"Period","2023-01-01 to 2023-01-31"
"Generated At","${new Date().toISOString()}"
"Total Hours","42.5"
"Entry Count","15"

"User Data"
"User ID","User Name","Hours","Entry Count"
"1","テストユーザー","42.5","15"

"Task Data"
"Task ID","Task Title","Hours","Entry Count"
"1","タスク1","25.3","8"
"2","タスク2","17.2","7"

"Client Data"
"Client ID","Client Name","Hours","Entry Count"
"1","クライアント1","30.1","10"
"2","クライアント2","12.4","5"`;
    
    // Blobを作成
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    // ダウンロードリンクを作成して自動クリック
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `time-report-${reportId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return blob;
  },
  
  // Get dashboard summary data
  getDashboardSummary: async (params = {}) => {
    console.log('Using mock getDashboardSummary:', params);
    // const response = await apiClient.get('/time-management/dashboard/', { params });
    // return response.data;
    
    return {
      today: {
        hours: Math.random() * 8,
        entry_count: Math.floor(Math.random() * 5) + 1
      },
      this_week: {
        hours: Math.random() * 40,
        entry_count: Math.floor(Math.random() * 15) + 5
      },
      this_month: {
        hours: Math.random() * 160,
        entry_count: Math.floor(Math.random() * 60) + 20
      },
      has_active_timer: false,
      active_timer: null
    };
  },
  
  // Get chart data
  getChartData: async (type = 'time', period = 'week') => {
    console.log('Using mock getChartData:', type, period);
    // const response = await apiClient.get('/time-management/analytics/chart-data/', { 
    //   params: { type, period } 
    // });
    // return response.data;
    
    return generateMockChartData(type, period);
  },
  
  // Generate analytics
  generateAnalytics: async (date, userId) => {
    console.log('Using mock generateAnalytics:', date, userId);
    // const params = { date, user_id: userId };
    // const response = await apiClient.get('/time-management/analytics/generate/', { params });
    // return response.data;
    
    return {
      id: Math.floor(Math.random() * 100) + 1,
      user: {
        id: userId || 1,
        email: 'user@example.com',
        full_name: 'テストユーザー'
      },
      date: date || new Date().toISOString().split('T')[0],
      total_hours: Math.random() * 8,
      billable_hours: Math.random() * 7,
      break_time: Math.random() * 1,
      productivity_score: Math.random() * 100,
      task_completion_rate: Math.random() * 100,
      tasks_worked: Math.floor(Math.random() * 10) + 1,
      tasks_completed: Math.floor(Math.random() * 8) + 1,
      hourly_data: {
        hours: Array.from({length: 24}, (_, i) => ({
          hour: i,
          time: Math.random() * 60,
          entry_count: Math.floor(Math.random() * 2)
        }))
      },
      task_data: {
        tasks: Array.from({length: 3}, (_, i) => ({
          task_id: i + 1,
          title: `タスク${i + 1}`,
          status: Math.random() > 0.5 ? 'completed' : 'in_progress',
          hours: Math.random() * 3,
          entry_count: Math.floor(Math.random() * 3) + 1
        }))
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },
  
  // Get analytics
  getAnalytics: async (filters = {}) => {
    console.log('Using mock getAnalytics:', filters);
    // const response = await apiClient.get('/time-management/analytics/', { params: filters });
    // return response.data;
    
    return Array.from({length: 10}, (_, i) => ({
      id: i + 1,
      user: {
        id: 1,
        email: 'user@example.com',
        full_name: 'テストユーザー'
      },
      date: new Date(new Date().setDate(new Date().getDate() - i)).toISOString().split('T')[0],
      total_hours: Math.random() * 8,
      billable_hours: Math.random() * 7,
      break_time: Math.random() * 1,
      productivity_score: Math.random() * 100,
      task_completion_rate: Math.random() * 100,
      tasks_worked: Math.floor(Math.random() * 10) + 1,
      tasks_completed: Math.floor(Math.random() * 8) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }
};

export default timeManagementApi;