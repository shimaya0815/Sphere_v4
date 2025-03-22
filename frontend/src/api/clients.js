import apiClient from './client';

/**
 * クライアント一覧を取得
 * @param {object} params - クエリパラメータ
 * @returns {Promise<Array>} クライアント一覧
 */
export const getClients = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/clients/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

/**
 * クライアント詳細を取得
 * @param {number} clientId - クライアントID
 * @returns {Promise<object>} クライアント詳細
 */
export const getClient = async (clientId) => {
  try {
    const response = await apiClient.get(`/api/clients/${clientId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching client ${clientId}:`, error);
    throw error;
  }
};

/**
 * クライアントの決算期一覧を取得
 * @param {number} clientId - クライアントID
 * @returns {Promise<Array>} 決算期一覧
 */
export const getFiscalYears = async (clientId) => {
  try {
    const response = await apiClient.get(`/api/clients/${clientId}/fiscal-years/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching fiscal years for client ${clientId}:`, error);
    throw error;
  }
};

/**
 * 決算期を更新
 * @param {number} fiscalYearId - 決算期ID
 * @param {object} data - 更新データ
 * @returns {Promise<object>} 更新された決算期
 */
export const updateFiscalYear = async (fiscalYearId, data) => {
  try {
    const response = await apiClient.patch(`/api/clients/fiscal-years/${fiscalYearId}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating fiscal year ${fiscalYearId}:`, error);
    throw error;
  }
};

/**
 * 決算期を作成
 * @param {number} clientId - クライアントID
 * @param {object} data - 決算期データ
 * @returns {Promise<object>} 作成された決算期
 */
export const createFiscalYear = async (clientId, data) => {
  try {
    const response = await apiClient.post(`/api/clients/${clientId}/fiscal-years/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error creating fiscal year for client ${clientId}:`, error);
    throw error;
  }
};

/**
 * 決算期を現在の決算期に設定
 * @param {number} fiscalYearId - 決算期ID
 * @returns {Promise<object>} 更新された決算期
 */
export const setCurrentFiscalYear = async (fiscalYearId) => {
  try {
    const response = await apiClient.post(`/api/clients/fiscal-years/${fiscalYearId}/set_current/`);
    return response.data;
  } catch (error) {
    console.error(`Error setting fiscal year ${fiscalYearId} as current:`, error);
    throw error;
  }
};

/**
 * 決算期のロック状態を切り替え
 * @param {number} fiscalYearId - 決算期ID
 * @returns {Promise<object>} 更新された決算期
 */
export const toggleFiscalYearLock = async (fiscalYearId) => {
  try {
    const response = await apiClient.post(`/api/clients/fiscal-years/${fiscalYearId}/toggle_lock/`);
    return response.data;
  } catch (error) {
    console.error(`Error toggling lock status for fiscal year ${fiscalYearId}:`, error);
    throw error;
  }
};

/**
 * クライアントを作成
 * @param {object} clientData - クライアントデータ
 * @returns {Promise<object>} 作成されたクライアント
 */
export const createClient = async (clientData) => {
  try {
    const response = await apiClient.post('/api/clients/', clientData);
    return response.data;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

/**
 * クライアントを更新
 * @param {number} clientId - クライアントID
 * @param {object} clientData - 更新データ
 * @returns {Promise<object>} 更新されたクライアント
 */
export const updateClient = async (clientId, clientData) => {
  try {
    const response = await apiClient.patch(`/api/clients/${clientId}/`, clientData);
    return response.data;
  } catch (error) {
    console.error(`Error updating client ${clientId}:`, error);
    throw error;
  }
};

/**
 * クライアントを削除
 * @param {number} clientId - クライアントID
 * @returns {Promise<void>}
 */
export const deleteClient = async (clientId) => {
  try {
    await apiClient.delete(`/api/clients/${clientId}/`);
  } catch (error) {
    console.error(`Error deleting client ${clientId}:`, error);
    throw error;
  }
};

/**
 * タスクテンプレート一覧を取得
 * @returns {Promise<Array>} タスクテンプレート一覧
 */
export const getTaskTemplates = async () => {
  try {
    const response = await apiClient.get('/api/tasks/templates/');
    return response.data;
  } catch (error) {
    console.error('Error fetching task templates:', error);
    return [];
  }
};

/**
 * タスクテンプレートスケジュール一覧を取得
 * @returns {Promise<Array>} タスクテンプレートスケジュール一覧
 */
export const getTaskTemplateSchedules = async () => {
  try {
    const response = await apiClient.get('/api/clients/schedules/');
    return response.data;
  } catch (error) {
    console.error('Error fetching task template schedules:', error);
    return [];
  }
};

/**
 * クライアントタスクテンプレート一覧を取得
 * @param {number} clientId - クライアントID
 * @returns {Promise<Array>} クライアントタスクテンプレート一覧
 */
export const getClientTaskTemplates = async (clientId) => {
  try {
    const response = await apiClient.get(`/api/clients/${clientId}/task-templates/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching client task templates for client ${clientId}:`, error);
    return [];
  }
};

/**
 * クライアントタスクテンプレートを作成
 * @param {number} clientId - クライアントID
 * @param {object} data - テンプレートデータ
 * @returns {Promise<object>} 作成されたテンプレート
 */
export const createClientTaskTemplate = async (clientId, data) => {
  try {
    const response = await apiClient.post(`/api/clients/${clientId}/task-templates/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error creating client task template for client ${clientId}:`, error);
    throw error;
  }
};

/**
 * クライアントタスクテンプレートを更新
 * @param {number} templateId - テンプレートID
 * @param {object} data - 更新データ
 * @returns {Promise<object>} 更新されたテンプレート
 */
export const updateClientTaskTemplate = async (templateId, data) => {
  try {
    const response = await apiClient.patch(`/api/clients/task-templates/${templateId}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating client task template ${templateId}:`, error);
    throw error;
  }
};

/**
 * クライアントタスクテンプレートを削除
 * @param {number} templateId - テンプレートID
 * @returns {Promise<void>}
 */
export const deleteClientTaskTemplate = async (templateId) => {
  try {
    await apiClient.delete(`/api/clients/task-templates/${templateId}/`);
  } catch (error) {
    console.error(`Error deleting client task template ${templateId}:`, error);
    throw error;
  }
};

/**
 * タスクテンプレートスケジュールを作成
 * @param {object} data - スケジュールデータ
 * @returns {Promise<object>} 作成されたスケジュール
 */
export const createTaskTemplateSchedule = async (data) => {
  try {
    const response = await apiClient.post('/api/clients/schedules/', data);
    return response.data;
  } catch (error) {
    console.error('Error creating task template schedule:', error);
    throw error;
  }
};

/**
 * タスクテンプレートスケジュールを更新
 * @param {number} scheduleId - スケジュールID
 * @param {object} data - 更新データ
 * @returns {Promise<object>} 更新されたスケジュール
 */
export const updateTaskTemplateSchedule = async (scheduleId, data) => {
  try {
    const response = await apiClient.patch(`/api/clients/schedules/${scheduleId}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating task template schedule ${scheduleId}:`, error);
    throw error;
  }
};

/**
 * タスクテンプレートスケジュールを削除
 * @param {number} scheduleId - スケジュールID
 * @returns {Promise<void>}
 */
export const deleteTaskTemplateSchedule = async (scheduleId) => {
  try {
    await apiClient.delete(`/api/clients/schedules/${scheduleId}/`);
  } catch (error) {
    console.error(`Error deleting task template schedule ${scheduleId}:`, error);
    throw error;
  }
};

/**
 * テンプレートからタスクを生成
 * @param {number} templateId - テンプレートID
 * @returns {Promise<object>} 生成されたタスク
 */
export const generateTaskFromTemplate = async (templateId) => {
  try {
    const response = await apiClient.post(`/api/clients/task-templates/${templateId}/generate_task/`);
    return response.data;
  } catch (error) {
    console.error(`Error generating task from template ${templateId}:`, error);
    throw error;
  }
};

/**
 * 税ルール一覧を取得
 * @param {number} clientId - クライアントID
 * @param {object} params - クエリパラメータ
 * @returns {Promise<Array>} 税ルール一覧
 */
export const getTaxRules = async (clientId, params = {}) => {
  try {
    const response = await apiClient.get(`/api/clients/${clientId}/tax-rules/`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching tax rules for client ${clientId}:`, error);
    return [];
  }
};

/**
 * 税ルールを作成
 * @param {number} clientId - クライアントID
 * @param {object} data - ルールデータ
 * @returns {Promise<object>} 作成されたルール
 */
export const createTaxRule = async (clientId, data) => {
  try {
    const response = await apiClient.post(`/api/clients/${clientId}/tax-rules/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error creating tax rule for client ${clientId}:`, error);
    throw error;
  }
};

/**
 * 税ルールを更新
 * @param {number} ruleId - ルールID
 * @param {object} data - 更新データ
 * @returns {Promise<object>} 更新されたルール
 */
export const updateTaxRule = async (ruleId, data) => {
  try {
    const response = await apiClient.patch(`/api/clients/tax-rules/${ruleId}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating tax rule ${ruleId}:`, error);
    throw error;
  }
};

/**
 * 税ルールを削除
 * @param {number} ruleId - ルールID
 * @returns {Promise<void>}
 */
export const deleteTaxRule = async (ruleId) => {
  try {
    await apiClient.delete(`/api/clients/tax-rules/${ruleId}/`);
  } catch (error) {
    console.error(`Error deleting tax rule ${ruleId}:`, error);
    throw error;
  }
};

/**
 * タスクカテゴリを取得
 * @returns {Promise<Array>} カテゴリ一覧
 */
export const getTaskCategories = async () => {
  try {
    const response = await apiClient.get('/api/tasks/categories/');
    return response.data;
  } catch (error) {
    console.error('Error fetching task categories:', error);
    return [];
  }
};

/**
 * タスク優先度一覧を取得
 * @returns {Promise<Array>} 優先度一覧
 */
export const getTaskPriorities = async () => {
  try {
    const response = await apiClient.get('/api/tasks/priorities/');
    return response.data;
  } catch (error) {
    console.error('Error fetching task priorities:', error);
    return [];
  }
};

export default {
  getClients,
  getClient,
  getFiscalYears,
  updateFiscalYear,
  createFiscalYear,
  setCurrentFiscalYear,
  toggleFiscalYearLock,
  createClient,
  updateClient,
  deleteClient,
  getTaskTemplates,
  getTaskTemplateSchedules,
  getClientTaskTemplates,
  createClientTaskTemplate,
  updateClientTaskTemplate,
  deleteClientTaskTemplate,
  createTaskTemplateSchedule,
  updateTaskTemplateSchedule,
  deleteTaskTemplateSchedule,
  generateTaskFromTemplate,
  getTaxRules,
  createTaxRule,
  updateTaxRule,
  deleteTaxRule,
  getTaskCategories,
  getTaskPriorities
};
