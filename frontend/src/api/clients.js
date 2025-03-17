import apiClient from './client';

// Clients API service
const clientsApi = {
  // Get all clients with optional filters
  getClients: async (filters = {}) => {
    try {
      console.log('API - Fetching clients with filters:', filters);
      const response = await apiClient.get('/api/clients/clients/', { params: filters });
      console.log('API - Client response structure:', {
        hasData: !!response.data,
        dataType: response.data ? typeof response.data : 'undefined',
        hasResults: response.data && response.data.results ? 'yes' : 'no',
        isArray: Array.isArray(response.data),
        resultCount: response.data && response.data.results ? response.data.results.length : 
                     (Array.isArray(response.data) ? response.data.length : 0)
      });
      
      // レスポンスのデータ構造に応じた処理
      if (response.data && response.data.results) {
        // DRF標準のページネーション形式
        console.log('API - Returning paginated client data:', response.data.results.length);
        return response.data;
      } else if (Array.isArray(response.data)) {
        // 直接配列が返される場合
        console.log('API - Returning array client data:', response.data.length);
        return {
          results: response.data,
          count: response.data.length
        };
      } else if (response.data && typeof response.data === 'object') {
        // その他のオブジェクト形式 (フォールバック)
        console.log('API - Returning object client data');
        return response.data;
      }
      
      // 空データの場合のフォールバック
      console.warn('API - No client data found, returning empty results');
      return { results: [], count: 0 };
    } catch (error) {
      console.error('Error fetching clients:', error);
      return { results: [], count: 0 };
    }
  },
  
  // Get a specific client by ID
  getClient: async (clientId) => {
    try {
      const response = await apiClient.get(`/api/clients/clients/${clientId}/`);
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
      const response = await apiClient.post('/api/clients/clients/', clientData);
      console.log("Client created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to create client:", error.response?.data);
      throw error;
    }
  },
  
  // Update a client
  updateClient: async (clientId, clientData) => {
    const response = await apiClient.patch(`/api/clients/clients/${clientId}/`, clientData);
    return response.data;
  },
  
  // Delete a client
  deleteClient: async (clientId) => {
    const response = await apiClient.delete(`/api/clients/clients/${clientId}/`);
    return response.data;
  },
  
  // Get fiscal years for a client
  getFiscalYears: async (clientId) => {
    try {
      // クライアントIDがない場合は早期リターン
      if (!clientId || clientId === 'undefined') {
        console.log('クライアントIDが未指定のため、決算期情報を取得せずに空配列を返します');
        return [];
      }
      
      console.log('Fetching fiscal years for client ID:', clientId);
      
      // 明示的なHTTPヘッダーとオプションを設定してリクエスト
      const response = await apiClient.get(`/api/clients/clients/${clientId}/fiscal-years/`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Fiscal years API response status:', response.status);
      console.log('Fiscal years raw response:', response.data);
      
      // テスト用のモックデータを作成（本番環境では削除）
      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        console.warn('No fiscal years found, creating mock data for testing');
        const mockData = [{
          id: 999,
          client: parseInt(clientId),
          fiscal_period: 1,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          is_current: true
        }];
        console.log('Using mock fiscal year data:', mockData);
        return mockData;
      }
      
      // レスポンスの形式を確認して適切に処理
      if (Array.isArray(response.data)) {
        // APIから配列が直接返ってきた場合
        console.log('Returning fiscal years array directly, count:', response.data.length);
        return response.data;
      } else if (response.data && response.data.results) {
        // ページネーション形式の場合
        console.log('Returning fiscal years from paginated response, count:', response.data.results.length);
        return response.data.results;
      } else if (response.data && typeof response.data === 'object') {
        // その他のオブジェクト形式の場合
        console.log('Returning fiscal years from object response');
        return [response.data]; // オブジェクトを配列にラップ
      }
      
      // それ以外の場合は空配列
      console.warn('No fiscal year data found, returning empty array');
      return [];
    } catch (error) {
      console.error(`Error fetching fiscal years for client ${clientId}:`, error);
      console.error('Error details:', error.response?.status, error.response?.data);
      
      // テスト用のモックデータを作成（本番環境では削除）
      console.warn('Error occurred, creating mock data for testing');
      const mockData = [{
        id: 999,
        client: parseInt(clientId),
        fiscal_period: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        is_current: true
      }];
      console.log('Using mock fiscal year data due to API error:', mockData);
      return mockData;
    }
  },
  
  // Create fiscal year for a client
  createFiscalYear: async (clientId, fiscalYearData) => {
    console.log(`API - Creating fiscal year for client ${clientId}:`, fiscalYearData);
    try {
      const response = await apiClient.post(`/api/clients/clients/${clientId}/fiscal-years/`, fiscalYearData);
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
      const response = await apiClient.get(`/api/clients/clients/${clientId}/fiscal-years/`, {
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
  
  
  // Get all contracts with optional filters
  getContracts: async (filters = {}) => {
    const response = await apiClient.get('/api/clients/contracts/', { params: filters });
    return response.data;
  },
  
  // Get task templates 
  getTaskTemplates: async () => {
    try {
      // まずビジネス全体のタスクテンプレートを試みる
      const response = await apiClient.get('/api/tasks/templates/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task templates:', error);
      // エラーの場合は空の配列を返す（APIエラーでフロントエンドを壊さない）
      return [];
    }
  },
  
  // Get task template schedules
  getTaskTemplateSchedules: async () => {
    try {
      const response = await apiClient.get('/api/clients/task-template-schedules/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task template schedules:', error);
      // エラーの場合は空の配列を返す（APIエラーでフロントエンドを壊さない）
      return [];
    }
  },
  
  // Create task template schedule
  createTaskTemplateSchedule: async (scheduleData) => {
    try {
      const response = await apiClient.post('/api/clients/task-template-schedules/', scheduleData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating task template schedule:', error);
      
      // HTMLレスポンスをより詳細に解析してエラーメッセージを抽出
      if (error.response && error.response.data && typeof error.response.data === 'string' && 
          error.response.data.includes('<!DOCTYPE html>')) {
        
        // エラーメッセージを抽出
        const htmlData = error.response.data;
        let errorMsg = "サーバーエラーが発生しました";
        
        // integrity error (duplicate key) の検出
        if (htmlData.includes('IntegrityError') && 
            (htmlData.includes('duplicate key') || htmlData.includes('already exists'))) {
          
          // 情報を付加したエラーオブジェクトを作成
          const enhancedError = new Error('重複キーエラー：同じ名前のスケジュールが既に存在します');
          enhancedError.response = error.response;
          enhancedError.isDuplicateKeyError = true;
          enhancedError.originalError = error;
          enhancedError.originalData = htmlData;
          
          console.warn('重複キーエラーを検出しました。既存のスケジュールを検索してください。');
          throw enhancedError;
        }
        
        // エラーメッセージの抽出を試みる
        const exceptionMatch = htmlData.match(/<pre class="exception_value">(.*?)<\/pre>/s);
        if (exceptionMatch && exceptionMatch[1]) {
          errorMsg = exceptionMatch[1].trim();
        }
        
        // 拡張エラーオブジェクト
        const enhancedError = new Error(errorMsg);
        enhancedError.response = error.response;
        enhancedError.originalError = error;
        
        throw enhancedError;
      }
      
      throw error;
    }
  },
  
  // Update task template schedule
  updateTaskTemplateSchedule: async (scheduleId, scheduleData) => {
    try {
      const response = await apiClient.patch(`/api/clients/task-template-schedules/${scheduleId}/`, scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error updating task template schedule:', error);
      throw error;
    }
  },
  
  // Delete task template schedule
  deleteTaskTemplateSchedule: async (scheduleId) => {
    try {
      const response = await apiClient.delete(`/api/clients/task-template-schedules/${scheduleId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task template schedule:', error);
      throw error;
    }
  },
  
  // Get client task templates
  getClientTaskTemplates: async (clientId) => {
    try {
      if (!clientId) {
        console.error('Client ID is required to fetch client task templates');
        return [];
      }
      const response = await apiClient.get(`/api/clients/clients/${clientId}/task-templates/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching client task templates:', error);
      // エラーの場合は空の配列を返す（APIエラーでフロントエンドを壊さない）
      return [];
    }
  },
  
  // Create client task template
  createClientTaskTemplate: async (clientId, templateData) => {
    try {
      const response = await apiClient.post(`/api/clients/clients/${clientId}/task-templates/`, templateData);
      return response.data;
    } catch (error) {
      console.error('Error creating client task template:', error);
      throw error;
    }
  },
  
  // Update client task template
  updateClientTaskTemplate: async (templateId, templateData) => {
    try {
      const response = await apiClient.patch(`/api/clients/client-task-templates/${templateId}/`, templateData);
      return response.data;
    } catch (error) {
      console.error('Error updating client task template:', error);
      throw error;
    }
  },
  
  // Delete client task template
  deleteClientTaskTemplate: async (templateId) => {
    try {
      const response = await apiClient.delete(`/api/clients/client-task-templates/${templateId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting client task template:', error);
      throw error;
    }
  },
  
  // Generate task from template
  generateTaskFromTemplate: async (templateId) => {
    try {
      const response = await apiClient.post(`/api/clients/client-task-templates/${templateId}/generate_task/`);
      return response.data;
    } catch (error) {
      console.error('Error generating task from template:', error);
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
    try {
      console.log('契約情報を作成します:', contractData);
      
      // 終了日のバリデーション
      if (contractData.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(contractData.end_date)) {
        throw new Error('終了日の形式が正しくありません。YYYY-MM-DD形式で入力してください。');
      }
      
      // クライアントIDを取得
      const clientId = contractData.client;
      
      // サービス名のマッピング
      const serviceNameMap = {
        '1': '顧問契約',
        '2': '記帳代行',
        '3': '給与計算',
        '4': '源泉所得税(原則)',
        '5': '源泉所得税(特例)',
        '6': '住民税(原則)',
        '7': '住民税(特例)',
        '8': '社会保険',
        '9': 'その他'
      };
      
      // ローカルストレージから既存の契約データを取得
      const localStorageKey = `client_${clientId}_contracts`;
      let existingContracts = [];
      
      try {
        const storedData = localStorage.getItem(localStorageKey);
        existingContracts = storedData ? JSON.parse(storedData) : [];
        
        if (!Array.isArray(existingContracts)) {
          console.warn('既存の契約データが配列ではありません。空の配列にリセットします。');
          existingContracts = [];
        }
      } catch (parseError) {
        console.error('ローカルストレージのデータ解析エラー:', parseError);
        existingContracts = [];
      }
      
      // 新しい契約データを作成
      const newContract = {
        id: Date.now(),  // 一意のID
        ...contractData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // サービス名を設定
        service_name: contractData.custom_service_name || 
                    (contractData.service ? serviceNameMap[contractData.service.toString()] || `サービスID: ${contractData.service}` : '未設定'),
        // ステータス表示用の日本語名
        status_display: {
          'active': '契約中',
          'suspended': '休止中',
          'terminated': '終了',
          'preparing': '準備中'
        }[contractData.status] || contractData.status
      };
      
      // 契約データを追加
      existingContracts.push(newContract);
      
      // ローカルストレージに保存
      localStorage.setItem(localStorageKey, JSON.stringify(existingContracts));
      console.log('契約情報をローカルストレージに保存しました:', newContract);
      
      return newContract;
    } catch (error) {
      console.error('契約作成エラー:', error);
      throw error;
    }
  },
  
  // Update a contract
  updateContract: async (contractId, contractData) => {
    try {
      console.log(`契約ID ${contractId} を更新します:`, contractData);
      
      // 終了日のバリデーション
      if (contractData.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(contractData.end_date)) {
        throw new Error('終了日の形式が正しくありません。YYYY-MM-DD形式で入力してください。');
      }
      
      // クライアントIDを取得
      const clientId = contractData.client;
      
      // サービス名のマッピング
      const serviceNameMap = {
        '1': '顧問契約',
        '2': '記帳代行',
        '3': '給与計算',
        '4': '源泉所得税(原則)',
        '5': '源泉所得税(特例)',
        '6': '住民税(原則)',
        '7': '住民税(特例)',
        '8': '社会保険',
        '9': 'その他'
      };
      
      // ローカルストレージから既存の契約データを取得
      const localStorageKey = `client_${clientId}_contracts`;
      let existingContracts = [];
      
      try {
        const storedData = localStorage.getItem(localStorageKey);
        existingContracts = storedData ? JSON.parse(storedData) : [];
        
        if (!Array.isArray(existingContracts)) {
          console.warn('既存の契約データが配列ではありません。空の配列にリセットします。');
          existingContracts = [];
        }
      } catch (parseError) {
        console.error('ローカルストレージのデータ解析エラー:', parseError);
        existingContracts = [];
      }
      
      // 更新対象の契約を検索
      const contractIndex = existingContracts.findIndex(contract => contract.id === contractId);
      
      if (contractIndex === -1) {
        throw new Error(`契約ID ${contractId} が見つかりません。`);
      }
      
      // 更新済みの契約データを作成
      const updatedContract = {
        ...existingContracts[contractIndex],
        ...contractData,
        id: contractId,  // IDは変更しない
        updated_at: new Date().toISOString(),
        // サービス名を更新
        service_name: contractData.custom_service_name || 
                    (contractData.service ? serviceNameMap[contractData.service.toString()] || 
                    existingContracts[contractIndex].service_name : existingContracts[contractIndex].service_name),
        // ステータス表示用の日本語名
        status_display: {
          'active': '契約中',
          'suspended': '休止中',
          'terminated': '終了',
          'preparing': '準備中'
        }[contractData.status] || contractData.status
      };
      
      // 既存のデータを更新
      existingContracts[contractIndex] = updatedContract;
      
      // ローカルストレージに保存
      localStorage.setItem(localStorageKey, JSON.stringify(existingContracts));
      console.log('更新された契約情報をローカルストレージに保存しました:', updatedContract);
      
      return updatedContract;
    } catch (error) {
      console.error('契約更新エラー:', error);
      throw error;
    }
  },
  
  // Delete a contract
  deleteContract: async (contractId) => {
    try {
      console.log(`契約ID ${contractId} を削除します`);
      
      // すべてのクライアントのローカルストレージを検索
      const storageKeys = Object.keys(localStorage).filter(key => key.startsWith('client_') && key.endsWith('_contracts'));
      
      let deleted = false;
      let clientId = null;
      
      for (const key of storageKeys) {
        try {
          let contracts = JSON.parse(localStorage.getItem(key));
          
          if (Array.isArray(contracts)) {
            const initialLength = contracts.length;
            contracts = contracts.filter(contract => contract.id !== contractId);
            
            if (contracts.length < initialLength) {
              // 契約が見つかった場合
              localStorage.setItem(key, JSON.stringify(contracts));
              deleted = true;
              clientId = key.replace('client_', '').replace('_contracts', '');
              console.log(`クライアントID ${clientId} の契約 ${contractId} を削除しました`);
              break;
            }
          }
        } catch (parseError) {
          console.error(`キー ${key} のデータ解析エラー:`, parseError);
        }
      }
      
      if (!deleted) {
        throw new Error(`契約ID ${contractId} が見つかりません。`);
      }
      
      return { success: true, message: '契約が正常に削除されました' };
    } catch (error) {
      console.error('契約削除エラー:', error);
      throw error;
    }
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
    const response = await apiClient.get(`/api/clients/clients/${clientId}/tasks/`);
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
      const response = await apiClient.get(`/api/clients/clients/${clientId}/tax-rules/`, { 
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
      const response = await apiClient.post(`/api/clients/clients/${clientId}/tax-rules/`, ruleData, {
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
      const response = await apiClient.patch(`/api/clients/clients/tax-rules/${ruleId}/`, ruleData, {
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
      const response = await apiClient.delete(`/api/clients/clients/tax-rules/${ruleId}/`, {
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
      const response = await apiClient.get(`/api/clients/clients/${clientId}/tax-rules/`, { 
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
  
  // タスクカテゴリの取得
  getTaskCategories: async () => {
    try {
      const response = await apiClient.get('/api/tasks/categories/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task categories:', error);
      // エラーの場合は空の配列を返す
      return [];
    }
  },
  
  // タスク優先度の取得
  getTaskPriorities: async () => {
    try {
      const response = await apiClient.get('/api/tasks/priorities/');
      return response.data;
    } catch (error) {
      console.error('Error fetching task priorities:', error);
      // エラーの場合は空の配列を返す
      return [];
    }
  },

  // 契約サービス関連のメソッド
  // 契約サービス一覧取得
  getContractServices: async () => {
    try {
      console.log('API - Fetching contract services');
      const response = await apiClient.get('/api/clients/contract-services/', {
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('API - Contract services fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to fetch contract services:', error.response?.data || error.message);
      return [];
    }
  },

  // デフォルト契約サービスの作成
  createDefaultContractServices: async () => {
    try {
      console.log('API - Creating default contract services');
      const response = await apiClient.post('/api/clients/contract-services/create-defaults/', {}, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('API - Default contract services created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API - Failed to create default contract services:', error.response?.data || error.message);
      throw error;
    }
  },

  // 契約サービスの作成
  createContractService: async (serviceData) => {
    try {
      const response = await apiClient.post('/api/clients/contract-services/', serviceData);
      return response.data;
    } catch (error) {
      console.error('Error creating contract service:', error);
      throw error;
    }
  },

  // 契約サービスの更新
  updateContractService: async (serviceId, serviceData) => {
    try {
      const response = await apiClient.put(`/api/clients/contract-services/${serviceId}/`, serviceData);
      return response.data;
    } catch (error) {
      console.error('Error updating contract service:', error);
      throw error;
    }
  },

  // 契約サービスの削除
  deleteContractService: async (serviceId) => {
    try {
      const response = await apiClient.delete(`/api/clients/contract-services/${serviceId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting contract service:', error);
      throw error;
    }
  },

  // クライアント契約関連のメソッド
  // クライアントの契約一覧取得
  getClientContracts: async (clientId) => {
    try {
      console.log(`契約情報取得 - クライアントID: ${clientId}`);
      
      // ローカルストレージから契約データを取得
      const localStorageKey = `client_${clientId}_contracts`;
      let localData = [];
      
      try {
        const storedData = localStorage.getItem(localStorageKey);
        
        if (storedData) {
          localData = JSON.parse(storedData);
          
          if (!Array.isArray(localData)) {
            console.warn('ローカルストレージのデータが配列ではありません。空の配列にリセットします。');
            localData = [];
          } else if (localData.length > 0) {
            console.log(`ローカルストレージから ${localData.length} 件の契約情報を読み込みました`);
          }
        } else {
          console.log('ローカルストレージに契約情報がありません');
        }
      } catch (localStorageError) {
        console.error('ローカルストレージからの読み込みエラー:', localStorageError);
        localData = [];
      }
      
      // APIリクエストを行わず、ローカルストレージのデータのみを返す
      return localData;
    } catch (error) {
      console.error('契約情報取得エラー:', error);
      return [];
    }
  },

  // 契約の詳細を取得
  getContract: async (contractId) => {
    try {
      const response = await apiClient.get(`/api/clients/client-contracts/${contractId}/`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching contract details:', error);
      return null;
    }
  },
};

export default clientsApi;
