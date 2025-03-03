import apiClient from './client';

// Time Management API service
const timeManagementApi = {
  // Get time entries with optional filters
  getTimeEntries: async (filters = {}) => {
    const response = await apiClient.get('/time-management/entries/', { params: filters });
    return response.data;
  },
  
  // Get a specific time entry by ID
  getTimeEntry: async (entryId) => {
    const response = await apiClient.get(`/time-management/entries/${entryId}/`);
    return response.data;
  },
  
  // Create a new time entry
  createTimeEntry: async (entryData) => {
    const response = await apiClient.post('/time-management/entries/', entryData);
    return response.data;
  },
  
  // Update a time entry
  updateTimeEntry: async (entryId, entryData) => {
    const response = await apiClient.patch(`/time-management/entries/${entryId}/`, entryData);
    return response.data;
  },
  
  // Delete a time entry
  deleteTimeEntry: async (entryId) => {
    const response = await apiClient.delete(`/time-management/entries/${entryId}/`);
    return response.data;
  },
  
  // Start a time entry
  startTimeEntry: async (entryData) => {
    const response = await apiClient.post('/time-management/entries/start/', entryData);
    return response.data;
  },
  
  // Stop a time entry
  stopTimeEntry: async (entryId) => {
    const response = await apiClient.post(`/time-management/entries/${entryId}/stop/`);
    return response.data;
  },
  
  // Start a break
  startBreak: async (entryId, breakData = {}) => {
    const response = await apiClient.post(`/time-management/entries/${entryId}/breaks/start/`, breakData);
    return response.data;
  },
  
  // Stop a break
  stopBreak: async (breakId) => {
    const response = await apiClient.post(`/time-management/breaks/${breakId}/stop/`);
    return response.data;
  },
  
  // Get breaks for a time entry
  getBreaks: async (entryId) => {
    const response = await apiClient.get(`/time-management/entries/${entryId}/breaks/`);
    return response.data;
  },
  
  // Get time reports
  getReports: async () => {
    const response = await apiClient.get('/time-management/reports/');
    return response.data;
  },
  
  // Get a specific report by ID
  getReport: async (reportId) => {
    const response = await apiClient.get(`/time-management/reports/${reportId}/`);
    return response.data;
  },
  
  // Create a new report
  createReport: async (reportData) => {
    const response = await apiClient.post('/time-management/reports/', reportData);
    return response.data;
  },
  
  // Update a report
  updateReport: async (reportId, reportData) => {
    const response = await apiClient.patch(`/time-management/reports/${reportId}/`, reportData);
    return response.data;
  },
  
  // Delete a report
  deleteReport: async (reportId) => {
    const response = await apiClient.delete(`/time-management/reports/${reportId}/`);
    return response.data;
  },
  
  // Generate a report
  generateReport: async (reportParams) => {
    const response = await apiClient.post('/time-management/reports/generate/', reportParams);
    return response.data;
  },
  
  // Export a report to CSV
  exportReportToCsv: async (reportId) => {
    const response = await apiClient.get(`/time-management/reports/${reportId}/export/csv/`, {
      responseType: 'blob',
    });
    
    // Create a download link and trigger it
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `time-report-${reportId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return response.data;
  },
  
  // Get dashboard summary data
  getDashboardSummary: async (params = {}) => {
    const response = await apiClient.get('/time-management/dashboard/', { params });
    return response.data;
  },
  
  // Get chart data
  getChartData: async (type = 'time', period = 'week') => {
    const response = await apiClient.get('/time-management/analytics/chart-data/', { 
      params: { type, period } 
    });
    return response.data;
  },
  
  // Generate analytics
  generateAnalytics: async (date, userId) => {
    const params = { date, user_id: userId };
    const response = await apiClient.get('/time-management/analytics/generate/', { params });
    return response.data;
  },
  
  // Get analytics
  getAnalytics: async (filters = {}) => {
    const response = await apiClient.get('/time-management/analytics/', { params: filters });
    return response.data;
  }
};

export default timeManagementApi;