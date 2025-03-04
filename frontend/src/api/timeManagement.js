import apiClient from './client';

// Time Management API service
const timeManagementApi = {
  // Get time entries with optional filters
  getTimeEntries: async (filters = {}) => {
    try {
      const response = await apiClient.get('/time-management/entries/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching time entries:', error);
      // Mock data for development
      return [];
    }
  },
  
  // Get a specific time entry by ID
  getTimeEntry: async (entryId) => {
    try {
      const response = await apiClient.get(`/time-management/entries/${entryId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching time entry:', error);
      return null;
    }
  },
  
  // Create a new time entry
  createTimeEntry: async (entryData) => {
    try {
      const response = await apiClient.post('/time-management/entries/', entryData);
      return response.data;
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }
  },
  
  // Update a time entry
  updateTimeEntry: async (entryId, entryData) => {
    try {
      const response = await apiClient.patch(`/time-management/entries/${entryId}/`, entryData);
      return response.data;
    } catch (error) {
      console.error('Error updating time entry:', error);
      throw error;
    }
  },
  
  // Delete a time entry
  deleteTimeEntry: async (entryId) => {
    try {
      const response = await apiClient.delete(`/time-management/entries/${entryId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting time entry:', error);
      throw error;
    }
  },
  
  // Start a time entry
  startTimeEntry: async (entryData) => {
    try {
      const response = await apiClient.post('/time-management/entries/start/', entryData);
      return response.data;
    } catch (error) {
      console.error('Error starting time entry:', error);
      // Mock data for development
      return {
        id: Math.floor(Math.random() * 1000),
        task_id: entryData.task_id,
        description: entryData.description,
        start_time: new Date().toISOString(),
        is_running: true
      };
    }
  },
  
  // Stop a time entry
  stopTimeEntry: async (entryId) => {
    try {
      const response = await apiClient.post(`/time-management/entries/${entryId}/stop/`);
      return response.data;
    } catch (error) {
      console.error('Error stopping time entry:', error);
      return { success: true };
    }
  },
  
  // Get dashboard summary data
  getDashboardSummary: async (params = {}) => {
    try {
      const response = await apiClient.get('/time-management/dashboard/', { params });
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
  }
};

export default timeManagementApi;