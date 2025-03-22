import apiClient from './client';

/**
 * クライアント一覧を取得
 * @param {object} params - クエリパラメータ
 * @returns {Promise<Array>} クライアント一覧
 */
export const getClients = async (params = {}) => {
  try {
    console.log('クライアント取得を試みます...');
    const response = await apiClient.get('/clients/clients/', { params });
    console.log('取得したクライアント:', response.data);
    
    // ページネーション形式（results配列）かどうかをチェック
    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    
    // 通常の配列の場合
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // URLリストの場合は別のエンドポイントを試す
    if (response.data && typeof response.data === 'object' && response.data.clients) {
      console.log('クライアントデータがURLリスト形式のため、別のエンドポイントを試します');
      const clientsResponse = await apiClient.get(response.data.clients);
      
      if (clientsResponse.data && clientsResponse.data.results && Array.isArray(clientsResponse.data.results)) {
        return clientsResponse.data.results;
      } else if (Array.isArray(clientsResponse.data)) {
        return clientsResponse.data;
      }
    }
    
    // その他の形式の場合は空配列を返す
    console.warn('Unexpected client data format:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching clients:', error);
    // バックアップとしてデフォルト値を返す
    console.log('APIエラーが発生したため、デフォルト値を使用します');
    return [];
  }
};

/**
 * クライアント詳細を取得
 * @param {number|string} clientId - クライアントID
 * @returns {Promise<object>} クライアント詳細
 */
export const getClient = async (clientId) => {
  try {
    // 数値に変換できるか確認
    const id = !isNaN(parseInt(clientId)) ? parseInt(clientId) : clientId;
    console.log(`クライアント詳細取得 - 元ID: ${clientId}, 処理後ID: ${id}`);
    
    // 非同期リクエストとして実行
    console.log(`APIリクエスト: GET /clients/clients/${id}/`);
    const response = await apiClient.get(`/clients/clients/${id}/`);
    
    console.log('クライアント詳細APIレスポンス:', response.status);
    console.log('クライアント詳細データ:', response.data);
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching client ${clientId}:`, error);
    
    // エラー詳細をログに出力
    if (error.response) {
      console.error('エラーレスポンス:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('リクエストエラー:', error.request);
    } else {
      console.error('その他のエラー:', error.message);
    }
    
    // エラーを上位へ伝搬
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
    const response = await apiClient.get(`/clients/clients/${clientId}/fiscal-years/`);
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
    const response = await apiClient.post('/clients/clients/', clientData);
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
    const response = await apiClient.patch(`/clients/clients/${clientId}/`, clientData);
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
    await apiClient.delete(`/clients/clients/${clientId}/`);
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
    const response = await apiClient.get('/clients/schedules/');
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
    const response = await apiClient.get(`/clients/clients/${clientId}/task-templates/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching client task templates for client ${clientId}:`, error);
    return [];
  }
};

/**
 * クライアントタスクテンプレート詳細を取得
 * @param {number} templateId - テンプレートID
 * @returns {Promise<Object>} クライアントタスクテンプレート詳細
 */
export const getClientTaskTemplate = async (templateId) => {
  try {
    const response = await apiClient.get(`/clients/client-task-templates/${templateId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching client task template ${templateId}:`, error);
    throw error;
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
    // クライアントIDをデータに含める
    const requestData = {
      ...data,
      client: clientId
    };
    // 正しいエンドポイント（ViewSetが公開しているPOST可能なエンドポイント）を使用
    const response = await apiClient.post(`/clients/client-task-templates/`, requestData);
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
    const response = await apiClient.patch(`/clients/client-task-templates/${templateId}/`, data);
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
    await apiClient.delete(`/clients/client-task-templates/${templateId}/`);
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
    const response = await apiClient.post('/clients/schedules/', data);
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
    const response = await apiClient.patch(`/clients/schedules/${scheduleId}/`, data);
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
    await apiClient.delete(`/clients/schedules/${scheduleId}/`);
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
    const response = await apiClient.post(`/clients/client-task-templates/${templateId}/generate_task/`);
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
    const response = await apiClient.get(`/clients/clients/${clientId}/tax-rules/`, { params });
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
    const response = await apiClient.post(`/clients/clients/${clientId}/tax-rules/`, data);
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
    const response = await apiClient.patch(`/clients/tax-rules/${ruleId}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating tax rule ${ruleId}:`, error);
    throw error;
  }
};

/**
 * 税ルールを削除
 * @param {number} ruleId - ルールID
 * @param {number} clientId - クライアントID (オプション)
 * @returns {Promise<void>}
 */
export const deleteTaxRule = async (ruleId, clientId) => {
  try {
    // 正しいエンドポイントを使用
    await apiClient.delete(`/clients/tax-rules/${ruleId}/`);
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
  getClientTaskTemplate,
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
