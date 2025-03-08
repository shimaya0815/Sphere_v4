import apiClient from './client';

// Clients API service
const clientsApi = {
  // Get all clients with optional filters
  getClients: async (filters = {}) => {
    try {
      const response = await apiClient.get('/api/clients/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      return { results: [], count: 0 };
    }
  },
  
  // Get a specific client by ID
  getClient: async (clientId) => {
    try {
      const response = await apiClient.get(`/api/clients/${clientId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching client ${clientId}:`, error);
      return null;
    }
  },
  
  // Create a new client
  createClient: async (clientData) => {
    console.log("Creating client with data:", clientData);
    try {
      const response = await apiClient.post('/api/clients/', clientData);
      console.log("Client created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to create client:", error.response?.data);
      throw error;
    }
  },
  
  // Update a client
  updateClient: async (clientId, clientData) => {
    const response = await apiClient.patch(`/api/clients/${clientId}/`, clientData);
    return response.data;
  },
  
  // Delete a client
  deleteClient: async (clientId) => {
    const response = await apiClient.delete(`/api/clients/${clientId}/`);
    return response.data;
  },
  
  // Get fiscal years for a client
  getFiscalYears: async (clientId) => {
    const response = await apiClient.get(`/api/clients/${clientId}/fiscal-years/`);
    return response.data;
  },
  
  // Create fiscal year for a client
  createFiscalYear: async (clientId, fiscalYearData) => {
    console.log(`API - Creating fiscal year for client ${clientId}:`, fiscalYearData);
    try {
      const response = await apiClient.post(`/api/clients/${clientId}/fiscal-years/`, fiscalYearData);
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
      const response = await apiClient.patch(`/api/clients/fiscal-years/${fiscalYearId}/`, fiscalYearData);
      console.log('API - Fiscal year updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to update fiscal year:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete fiscal year
  deleteFiscalYear: async (fiscalYearId) => {
    const response = await apiClient.delete(`/api/clients/fiscal-years/${fiscalYearId}/`);
    return response.data;
  },
  
  // Set fiscal year as current
  setCurrentFiscalYear: async (fiscalYearId) => {
    console.log(`API - Setting fiscal year ${fiscalYearId} as current`);
    try {
      const response = await apiClient.post(`/api/clients/fiscal-years/${fiscalYearId}/set_current/`);
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
      const response = await apiClient.post(`/api/clients/fiscal-years/${fiscalYearId}/toggle_lock/`);
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
      const response = await apiClient.get(`/api/clients/${clientId}/fiscal-years/`, {
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
    const response = await apiClient.get(`/api/clients/${clientId}/check-settings/`);
    return response.data;
  },
  
  // Create check setting for a client
  createCheckSetting: async (clientId, checkSettingData) => {
    console.log(`API - Creating check setting for client ${clientId}:`, checkSettingData);
    try {
      const response = await apiClient.post(`/api/clients/${clientId}/check-settings/`, checkSettingData);
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
      const response = await apiClient.patch(`/api/clients/check-settings/${checkSettingId}/`, checkSettingData);
      console.log('API - Check setting updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to update check setting:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete check setting
  deleteCheckSetting: async (checkSettingId) => {
    const response = await apiClient.delete(`/api/clients/check-settings/${checkSettingId}/`);
    return response.data;
  },
  
  // Get all contracts with optional filters
  getContracts: async (filters = {}) => {
    const response = await apiClient.get('/api/clients/contracts/', { params: filters });
    return response.data;
  },
  
  // Get task templates
  getTaskTemplates: async () => {
    try {
      const response = await apiClient.get('/api/tasks/templates/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task templates:', error);
      throw error;
    }
  },
  
  // Get client task templates
  getClientTaskTemplates: async (clientId) => {
    try {
      const response = await apiClient.get(`/api/clients/${clientId}/task-templates/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching client task templates:', error);
      throw error;
    }
  },
  
  // Create client task template
  createClientTaskTemplate: async (clientId, templateData) => {
    try {
      const response = await apiClient.post(`/api/clients/${clientId}/task-templates/`, templateData);
      return response.data;
    } catch (error) {
      console.error('Error creating client task template:', error);
      throw error;
    }
  },
  
  // Update client task template
  updateClientTaskTemplate: async (templateId, templateData) => {
    try {
      const response = await apiClient.patch(`/api/clients/task-templates/${templateId}/`, templateData);
      return response.data;
    } catch (error) {
      console.error('Error updating client task template:', error);
      throw error;
    }
  },
  
  // Delete client task template
  deleteClientTaskTemplate: async (templateId) => {
    try {
      const response = await apiClient.delete(`/api/clients/task-templates/${templateId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting client task template:', error);
      throw error;
    }
  },
  
  // Copy default templates to client-specific templates
  copyDefaultTemplates: async (clientId) => {
    try {
      const response = await apiClient.post(`/api/clients/${clientId}/copy_default_templates/`);
      return response.data;
    } catch (error) {
      console.error('Error copying default templates:', error);
      throw error;
    }
  },
  
  // Apply templates to create tasks
  applyTemplates: async (clientId, data = {}) => {
    try {
      const response = await apiClient.post(`/api/clients/${clientId}/apply_templates/`, data);
      return response.data;
    } catch (error) {
      console.error('Error applying templates:', error);
      throw error;
    }
  },
  
  // Get a specific contract by ID
  getContract: async (contractId) => {
    const response = await apiClient.get(`/api/clients/contracts/${contractId}/`);
    return response.data;
  },
  
  // Create a new contract
  createContract: async (contractData) => {
    const response = await apiClient.post('/api/clients/contracts/', contractData);
    return response.data;
  },
  
  // Update a contract
  updateContract: async (contractId, contractData) => {
    const response = await apiClient.patch(`/api/clients/contracts/${contractId}/`, contractData);
    return response.data;
  },
  
  // Delete a contract
  deleteContract: async (contractId) => {
    const response = await apiClient.delete(`/api/clients/contracts/${contractId}/`);
    return response.data;
  },
  
  // Get all notes with optional filters
  getNotes: async (filters = {}) => {
    const response = await apiClient.get('/api/clients/notes/', { params: filters });
    return response.data;
  },
  
  // Create a new note
  createNote: async (noteData) => {
    const response = await apiClient.post('/api/clients/notes/', noteData);
    return response.data;
  },
  
  // Update a note
  updateNote: async (noteId, noteData) => {
    const response = await apiClient.patch(`/api/clients/notes/${noteId}/`, noteData);
    return response.data;
  },
  
  // Delete a note
  deleteNote: async (noteId) => {
    const response = await apiClient.delete(`/api/clients/notes/${noteId}/`);
    return response.data;
  },
  
  // Get client tasks
  getTasks: async (clientId) => {
    const response = await apiClient.get(`/api/clients/${clientId}/tasks/`);
    return response.data;
  },
  
  // Get client industries (unique list)
  getIndustries: async () => {
    const response = await apiClient.get('/api/clients/industries/');
    return response.data;
  },
  
  // 税ルール（源泉所得税・住民税）の取得
  getTaxRules: async (clientId, params = {}) => {
    console.log(`API - Getting tax rules for client ${clientId}:`, params);
    try {
      const response = await apiClient.get(`/api/clients/${clientId}/tax-rules/`, { 
        params,
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('API - Tax rules fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to get tax rules:', error.response?.data || error.message);
      
      // HTMLレスポンスのエラーハンドリング
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.startsWith('<!DOCTYPE html>')) {
        console.error('Received HTML response instead of JSON');
        return [];
      }
      
      // データが存在しない場合は空配列を返す
      if (error.response?.status === 404) {
        return [];
      }
      
      throw error;
    }
  },
  
  // 税ルールの作成
  createTaxRule: async (clientId, ruleData) => {
    console.log(`API - Creating tax rule for client ${clientId}:`, ruleData);
    try {
      const response = await apiClient.post(`/api/clients/${clientId}/tax-rules/`, ruleData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('API - Tax rule created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to create tax rule:', error.response?.data || error.message);
      
      // HTMLレスポンスのエラーハンドリング
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.startsWith('<!DOCTYPE html>')) {
        console.error('Received HTML response instead of JSON');
        throw new Error('サーバーエラーが発生しました。しばらく経ってから再度お試しください。');
      }
      
      throw error;
    }
  },
  
  // 税ルールの更新
  updateTaxRule: async (ruleId, ruleData) => {
    console.log(`API - Updating tax rule ${ruleId}:`, ruleData);
    try {
      const response = await apiClient.patch(`/api/clients/tax-rules/${ruleId}/`, ruleData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('API - Tax rule updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to update tax rule:', error.response?.data || error.message);
      
      // HTMLレスポンスのエラーハンドリング
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.startsWith('<!DOCTYPE html>')) {
        console.error('Received HTML response instead of JSON');
        throw new Error('サーバーエラーが発生しました。しばらく経ってから再度お試しください。');
      }
      
      throw error;
    }
  },
  
  // 税ルールの削除
  deleteTaxRule: async (ruleId) => {
    console.log(`API - Deleting tax rule ${ruleId}`);
    try {
      const response = await apiClient.delete(`/api/clients/tax-rules/${ruleId}/`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('API - Tax rule deleted successfully');
      return response.data;
    } catch (error) {
      console.error('API - Failed to delete tax rule:', error.response?.data || error.message);
      
      // HTMLレスポンスのエラーハンドリング
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.startsWith('<!DOCTYPE html>')) {
        console.error('Received HTML response instead of JSON');
        throw new Error('サーバーエラーが発生しました。しばらく経ってから再度お試しください。');
      }
      
      throw error;
    }
  },
  
  // 現在適用されている税ルールの取得
  getCurrentTaxRules: async (clientId, taxType = null) => {
    console.log(`API - Getting current tax rules for client ${clientId} and tax type ${taxType}`);
    const params = { is_current: true };
    if (taxType) {
      params.tax_type = taxType;
    }
    
    try {
      const response = await apiClient.get(`/api/clients/${clientId}/tax-rules/`, { 
        params,
        headers: {
          'Accept': 'application/json'
        } 
      });
      console.log('API - Current tax rules fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to get current tax rules:', error.response?.data || error.message);
      
      // HTMLレスポンスのエラーハンドリング
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.startsWith('<!DOCTYPE html>')) {
        console.error('Received HTML response instead of JSON');
        throw new Error('サーバーエラーが発生しました。しばらく経ってから再度お試しください。');
      }
      
      // データが存在しない場合は空配列を返す
      if (error.response?.status === 404) {
        return [];
      }
      
      throw error;
    }
  },
};

export default clientsApi;
