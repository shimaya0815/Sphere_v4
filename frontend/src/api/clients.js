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

export default {
  getClients,
  getClient,
  getFiscalYears,
  createClient,
  updateClient,
  deleteClient
};
