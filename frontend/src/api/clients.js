import apiClient from './client';

// Clients API service
const clientsApi = {
  // Get all clients with optional filters
  getClients: async (filters = {}) => {
    const response = await apiClient.get('/clients/', { params: filters });
    return response.data;
  },
  
  // Get a specific client by ID
  getClient: async (clientId) => {
    const response = await apiClient.get(`/clients/${clientId}/`);
    return response.data;
  },
  
  // Create a new client
  createClient: async (clientData) => {
    console.log("Creating client with data:", clientData);
    try {
      const response = await apiClient.post('/clients/', clientData);
      console.log("Client created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to create client:", error.response?.data);
      throw error;
    }
  },
  
  // Update a client
  updateClient: async (clientId, clientData) => {
    const response = await apiClient.patch(`/clients/${clientId}/`, clientData);
    return response.data;
  },
  
  // Delete a client
  deleteClient: async (clientId) => {
    const response = await apiClient.delete(`/clients/${clientId}/`);
    return response.data;
  },
  
  // Get fiscal years for a client
  getFiscalYears: async (clientId) => {
    const response = await apiClient.get(`/clients/${clientId}/fiscal-years/`);
    return response.data;
  },
  
  // Create fiscal year for a client
  createFiscalYear: async (clientId, fiscalYearData) => {
    console.log(`API - Creating fiscal year for client ${clientId}:`, fiscalYearData);
    try {
      const response = await apiClient.post(`/clients/${clientId}/fiscal-years/`, fiscalYearData);
      console.log('API - Fiscal year created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to create fiscal year:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Update fiscal year
  updateFiscalYear: async (fiscalYearId, fiscalYearData) => {
    console.log(`API - Updating fiscal year ${fiscalYearId}:`, fiscalYearData);
    try {
      const response = await apiClient.patch(`/clients/fiscal-years/${fiscalYearId}/`, fiscalYearData);
      console.log('API - Fiscal year updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to update fiscal year:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete fiscal year
  deleteFiscalYear: async (fiscalYearId) => {
    const response = await apiClient.delete(`/clients/fiscal-years/${fiscalYearId}/`);
    return response.data;
  },
  
  // Set fiscal year as current
  setCurrentFiscalYear: async (fiscalYearId) => {
    console.log(`API - Setting fiscal year ${fiscalYearId} as current`);
    try {
      const response = await apiClient.post(`/clients/fiscal-years/${fiscalYearId}/set_current/`);
      console.log('API - Fiscal year set as current successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to set fiscal year as current:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Toggle fiscal year lock status
  toggleFiscalYearLock: async (fiscalYearId) => {
    console.log(`API - Toggling lock status for fiscal year ${fiscalYearId}`);
    try {
      const response = await apiClient.post(`/clients/fiscal-years/${fiscalYearId}/toggle_lock/`);
      console.log('API - Fiscal year lock status toggled successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to toggle fiscal year lock status:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get current fiscal year for a client
  getCurrentFiscalYear: async (clientId) => {
    console.log(`API - Getting current fiscal year for client ${clientId}`);
    try {
      const response = await apiClient.get(`/clients/${clientId}/fiscal-years/`, {
        params: { is_current: true }
      });
      console.log('API - Current fiscal year fetched successfully:', response.data);
      // Return the first item or null if no current fiscal year
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('API - Failed to get current fiscal year:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get check settings for a client
  getCheckSettings: async (clientId) => {
    const response = await apiClient.get(`/clients/${clientId}/check-settings/`);
    return response.data;
  },
  
  // Create check setting for a client
  createCheckSetting: async (clientId, checkSettingData) => {
    console.log(`API - Creating check setting for client ${clientId}:`, checkSettingData);
    try {
      const response = await apiClient.post(`/clients/${clientId}/check-settings/`, checkSettingData);
      console.log('API - Check setting created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to create check setting:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Update check setting
  updateCheckSetting: async (checkSettingId, checkSettingData) => {
    console.log(`API - Updating check setting ${checkSettingId}:`, checkSettingData);
    try {
      const response = await apiClient.patch(`/clients/check-settings/${checkSettingId}/`, checkSettingData);
      console.log('API - Check setting updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to update check setting:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete check setting
  deleteCheckSetting: async (checkSettingId) => {
    const response = await apiClient.delete(`/clients/check-settings/${checkSettingId}/`);
    return response.data;
  },
  
  // Get all contracts with optional filters
  getContracts: async (filters = {}) => {
    const response = await apiClient.get('/clients/contracts/', { params: filters });
    return response.data;
  },
  
  // Get task templates
  getTaskTemplates: async () => {
    // APIエンドポイントが実装されていない場合、仮のデータを返す
    try {
      const response = await apiClient.get('/tasks/templates/');
      return response.data;
    } catch (error) {
      console.warn('Task templates API not implemented yet, returning mock data');
      return [
        { id: 1, title: 'スタンダード月次チェック' },
        { id: 2, title: '簡易月次チェック' },
        { id: 3, title: '法人税確定申告' },
        { id: 4, title: '所得税確定申告' }
      ];
    }
  },
  
  // Get a specific contract by ID
  getContract: async (contractId) => {
    const response = await apiClient.get(`/clients/contracts/${contractId}/`);
    return response.data;
  },
  
  // Create a new contract
  createContract: async (contractData) => {
    const response = await apiClient.post('/clients/contracts/', contractData);
    return response.data;
  },
  
  // Update a contract
  updateContract: async (contractId, contractData) => {
    const response = await apiClient.patch(`/clients/contracts/${contractId}/`, contractData);
    return response.data;
  },
  
  // Delete a contract
  deleteContract: async (contractId) => {
    const response = await apiClient.delete(`/clients/contracts/${contractId}/`);
    return response.data;
  },
  
  // Get all notes with optional filters
  getNotes: async (filters = {}) => {
    const response = await apiClient.get('/clients/notes/', { params: filters });
    return response.data;
  },
  
  // Create a new note
  createNote: async (noteData) => {
    const response = await apiClient.post('/clients/notes/', noteData);
    return response.data;
  },
  
  // Update a note
  updateNote: async (noteId, noteData) => {
    const response = await apiClient.patch(`/clients/notes/${noteId}/`, noteData);
    return response.data;
  },
  
  // Delete a note
  deleteNote: async (noteId) => {
    const response = await apiClient.delete(`/clients/notes/${noteId}/`);
    return response.data;
  },
  
  // Get client tasks
  getTasks: async (clientId) => {
    const response = await apiClient.get(`/clients/${clientId}/tasks/`);
    return response.data;
  },
  
  // Get client industries (unique list)
  getIndustries: async () => {
    const response = await apiClient.get('/clients/industries/');
    return response.data;
  },
};

export default clientsApi;
