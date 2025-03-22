import { useState, useEffect, useRef, useCallback } from 'react';
import { tasksApi, clientsApi, usersApi, businessApi } from '../../../api';
import toast from 'react-hot-toast';

/**
 * タスクデータを管理するカスタムフック
 * - マスターデータの取得
 * - 保存処理
 * @param {Object} task - 初期タスクデータ
 * @param {boolean} isNewTask - 新規タスクかどうか
 * @param {Function} onTaskUpdated - タスク更新後のコールバック
 * @returns {Object} タスクデータ関連の状態と関数
 */
export const useTaskData = (task, isNewTask, onTaskUpdated) => {
  // 状態管理
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [businessId, setBusinessId] = useState(1); // デフォルト値設定
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(1); // デフォルト値設定
  
  // API呼び出しの状態管理
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // 保存状態管理
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle, saving, saved, error
  const [pendingChanges, setPendingChanges] = useState({});
  const saveTimerRef = useRef(null);
  const apiTimerRef = useRef(null);
  const businessDataFetchedRef = useRef(false);

  /**
   * ビジネスデータ（ビジネスID、ワークスペースID）を取得
   */
  const fetchBusinessData = useCallback(async () => {
    if (isLoading || businessDataFetchedRef.current) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching user profile for business data');
      const profileResponse = await usersApi.getProfile();
      console.log('Profile response:', profileResponse);
      
      // プロファイルレスポンスの構造を詳細にログ出力
      if (profileResponse) {
        console.log('Profile response structure check:', {
          hasBusinessDirectly: !!profileResponse.business,
          hasDataProperty: !!profileResponse.data,
          hasBusinessInData: profileResponse.data && !!profileResponse.data.business,
          businessValue: profileResponse.business || (profileResponse.data && profileResponse.data.business)
        });
      }
      
      let businessIdValue = null;
      
      // プロファイルレスポンスからビジネスIDを抽出（複数の構造に対応）
      if (profileResponse && profileResponse.business) {
        businessIdValue = profileResponse.business;
      } else if (profileResponse && profileResponse.data && profileResponse.data.business) {
        if (typeof profileResponse.data.business === 'object' && profileResponse.data.business.id) {
          businessIdValue = profileResponse.data.business.id;
        } else {
          businessIdValue = profileResponse.data.business;
        }
      }
      
      if (businessIdValue) {
        // ビジネスIDを設定
        setBusinessId(businessIdValue);
        console.log('Business ID set to:', businessIdValue);
        
        // LocalStorageにも保存
        localStorage.setItem('businessId', businessIdValue);
        
        try {
          // ビジネスのデフォルトワークスペースを取得
          console.log('Fetching workspaces for business:', businessIdValue);
          const workspacesResponse = await businessApi.getWorkspaces(businessIdValue);
          console.log('Workspaces response:', workspacesResponse);
          
          if (workspacesResponse && Array.isArray(workspacesResponse) && workspacesResponse.length > 0) {
            // デフォルトワークスペースをセット（あれば）
            const defaultWorkspace = workspacesResponse.find(ws => ws.is_default) || workspacesResponse[0];
            if (defaultWorkspace) {
              setWorkspaceId(defaultWorkspace.id);
              console.log('Workspace ID set to:', defaultWorkspace.id);
            }
          }
        } catch (error) {
          console.error('Error fetching workspaces:', error);
        }
      } else {
        console.warn('Business ID not found in profile response:', profileResponse);
        
        // ローカルストレージからビジネスIDを取得（フォールバック）
        const storedBusinessId = localStorage.getItem('businessId');
        if (storedBusinessId) {
          console.log('Using BusinessId from localStorage:', storedBusinessId);
          setBusinessId(parseInt(storedBusinessId, 10));
        } else {
          console.warn('No BusinessId found in localStorage either, using default value 1');
          // デフォルト値を使用（最終手段）
          setBusinessId(1);
        }
      }
      
      // 取得完了フラグを設定
      businessDataFetchedRef.current = true;
    } catch (error) {
      console.error('Error fetching profile:', error);
      // エラー時はリトライ（一定回数まで）
      if (!isRetrying) {
        setIsRetrying(true);
        apiTimerRef.current = setTimeout(() => {
          setIsRetrying(false);
          // この時点でまだ取得できていなければ再試行
          if (!businessDataFetchedRef.current) {
            fetchBusinessData();
          }
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
    
    return true; // 処理完了を示す値を返す
  }, [isLoading, isRetrying, businessDataFetchedRef]);

  /**
   * カテゴリ一覧を取得（エラー時にリトライ）
   */
  const fetchCategories = useCallback(async () => {
    if (isLoading) return;
    
    try {
      console.log('Fetching categories with businessId:', businessId);
      const response = await tasksApi.getCategories();
      console.log('Raw categories response:', response);
      
      // 正しいデータ構造の確認
      if (response && response.data) {
        let categoriesData = [];
        
        // DRFのページネーション形式 {count, next, previous, results} を処理
        if (response.data.results && Array.isArray(response.data.results)) {
          console.log('Using pagination results for categories');
          categoriesData = response.data.results;
        }
        // response.dataが直接配列の場合
        else if (Array.isArray(response.data)) {
          console.log('Categories data is direct array');
          categoriesData = response.data;
        }
        // response.data.dataが配列の場合
        else if (response.data.data && Array.isArray(response.data.data)) {
          console.log('Using nested data array for categories');
          categoriesData = response.data.data;
        }
        
        if (categoriesData.length > 0) {
          console.log('Categories data before filtering:', categoriesData);
          // ビジネスIDでフィルタリング
          const filteredCategories = categoriesData.filter(cat => 
            cat && cat.business === businessId
          );
          console.log('Filtered categories by businessId:', filteredCategories);
          setCategories(filteredCategories);
        } else {
          console.log('No categories found in the response data');
          setCategories([]);
        }
      } else {
        console.log('No categories data available in response');
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      console.error('Error response:', error.response?.data);
      // エラーメッセージの表示を制御（リトライ中は表示しない）
      if (!isRetrying) {
        toast.error('カテゴリの取得に失敗しました');
      }
      setCategories([]);
    }
  }, [businessId, isLoading, isRetrying]);

  /**
   * ステータス一覧を取得（エラー時にリトライ）
   */
  const fetchStatuses = useCallback(async () => {
    if (isLoading) return;
    
    try {
      console.log('Fetching statuses with businessId:', businessId);
      const response = await tasksApi.getStatuses();
      console.log('Raw statuses response:', response);
      
      // 正しいデータ構造の確認
      if (response && response.data) {
        let statusesData = [];
        
        // DRFのページネーション形式 {count, next, previous, results} を処理
        if (response.data.results && Array.isArray(response.data.results)) {
          console.log('Using pagination results for statuses');
          statusesData = response.data.results;
        }
        // response.dataが直接配列の場合
        else if (Array.isArray(response.data)) {
          console.log('Statuses data is direct array');
          statusesData = response.data;
        }
        // response.data.dataが配列の場合
        else if (response.data.data && Array.isArray(response.data.data)) {
          console.log('Using nested data array for statuses');
          statusesData = response.data.data;
        }
        
        if (statusesData.length > 0) {
          console.log('Statuses data before filtering:', statusesData);
          // ビジネスIDでフィルタリング
          const filteredStatuses = statusesData.filter(status => 
            status && status.business === businessId
          );
          console.log('Filtered statuses by businessId:', filteredStatuses);
          
          // 順序でソート
          filteredStatuses.sort((a, b) => (a.order || 0) - (b.order || 0));
          
          setStatuses(filteredStatuses);
        } else {
          console.log('No statuses found in the response data');
          setStatuses([]);
        }
      } else {
        console.log('No statuses data available in response');
        setStatuses([]);
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
      console.error('Error response:', error.response?.data);
      // エラーメッセージの表示を制御
      if (!isRetrying) {
        toast.error('ステータスの取得に失敗しました');
      }
      setStatuses([]);
    }
  }, [businessId, isLoading, isRetrying]);

  /**
   * 優先度一覧を取得（エラー時にリトライ）
   */
  const fetchPriorities = useCallback(async () => {
    if (isLoading) return;
    
    try {
      console.log('Fetching priorities with businessId:', businessId);
      const response = await tasksApi.getPriorities();
      console.log('Raw priorities response:', response);
      
      if (response && response.data) {
        let prioritiesData = [];
        
        // データ構造の確認
        if (response.data.results && Array.isArray(response.data.results)) {
          prioritiesData = response.data.results;
        } else if (Array.isArray(response.data)) {
          prioritiesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          prioritiesData = response.data.data;
        }
        
        if (prioritiesData.length > 0) {
          // ビジネスIDでフィルタリング
          const filteredPriorities = prioritiesData.filter(p => 
            p && p.business === businessId
          );
          
          // 重要度でソート
          filteredPriorities.sort((a, b) => (b.value || 0) - (a.value || 0));
          
          setPriorities(filteredPriorities);
        } else {
          setPriorities([]);
        }
      } else {
        setPriorities([]);
      }
    } catch (error) {
      console.error('Error fetching priorities:', error);
      if (!isRetrying) {
        toast.error('優先度の取得に失敗しました');
      }
      setPriorities([]);
    }
  }, [businessId, isLoading, isRetrying]);

  /**
   * クライアント一覧を取得
   */
  const fetchClients = useCallback(async () => {
    console.log('fetchClients called with businessId:', businessId);
    
    if (!businessId) {
      console.warn('Attempting to fetch clients but businessId is not set. Loading from localStorage...');
      const storedBusinessId = localStorage.getItem('businessId');
      if (storedBusinessId) {
        console.log('Using BusinessId from localStorage:', storedBusinessId);
        setBusinessId(parseInt(storedBusinessId, 10));
      } else {
        console.warn('No BusinessId found in localStorage either, using default value 1');
        setBusinessId(1);
      }
    }
    
    try {
      // ビジネスIDを明示的に指定してクライアントを取得
      const effectiveBusinessId = businessId || parseInt(localStorage.getItem('businessId'), 10) || 1;
      console.log('Fetching clients with effective businessId:', effectiveBusinessId);
      
      // URLクエリパラメータとしてビジネスIDを渡す
      const response = await clientsApi.getClients({ business: effectiveBusinessId });
      
      console.log('Raw clients response:', response);
      
      if (response) {
        let clientsData = [];
        
        // データ構造の確認
        if (response.results && Array.isArray(response.results)) {
          console.log('Using response.results array for clients');
          clientsData = response.results;
        } else if (Array.isArray(response)) {
          console.log('Using direct array for clients');
          clientsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          console.log('Using response.data array for clients');
          clientsData = response.data;
        } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
          console.log('Using response.data.results array for clients');
          clientsData = response.data.results;
        }
        
        console.log('Extracted clients data:', clientsData);
        
        // APIから返されたデータ構造の詳細をログ出力
        if (clientsData.length > 0) {
          const sampleClient = clientsData[0];
          console.log('Client data structure sample:', {
            hasId: 'id' in sampleClient,
            hasName: 'name' in sampleClient,
            hasClientName: 'client_name' in sampleClient,
            hasTitle: 'title' in sampleClient,
            allKeys: Object.keys(sampleClient)
          });
        }
        
        // 設定
        if (clientsData.length > 0) {
          console.log('Setting clients data:', clientsData);
          
          // クライアントデータの各オブジェクトを正規化
          const normalizedClients = clientsData.map(client => {
            // クライアントオブジェクトが適切な構造を持っていることを確認
            return {
              id: client.id,
              // 名前プロパティが異なる場合に備える
              name: client.name || client.client_name || client.title || `クライアント #${client.id}`,
              // 他の必要なプロパティも保持
              ...client
            };
          });
          
          console.log('[IMPORTANT] Setting normalized clients to state:', normalizedClients);
          setClients(normalizedClients);
        } else {
          console.log('No clients found in the response - empty array');
          setClients([]);
        }
      } else {
        console.log('No response data for clients - null/undefined response');
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      toast.error('クライアント情報の取得に失敗しました');
      setClients([]);
    }
  }, [businessId]);

  /**
   * ユーザー一覧を取得
   */
  const fetchUsers = useCallback(async () => {
    if (isLoading) return;
    
    try {
      console.log('Fetching users for task assignments');
      const response = await usersApi.getUsers();
      console.log('Raw users response:', response);
      
      if (response) {
        let usersData = [];
        
        // データ構造の確認
        if (response.results && Array.isArray(response.results)) {
          usersData = response.results;
        } else if (Array.isArray(response)) {
          usersData = response;
        } else if (response.data && Array.isArray(response.data)) {
          usersData = response.data;
        } else if (Array.isArray(response.data?.results)) {
          usersData = response.data.results;
        }
        
        // 設定
        if (usersData.length > 0) {
          console.log('Setting users data:', usersData);
          setUsers(usersData);
        } else {
          console.log('No users found in the response');
          setUsers([]);
        }
      } else {
        console.log('No response data for users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (!isRetrying) {
        toast.error('ユーザー情報の取得に失敗しました');
      }
      setUsers([]);
    }
  }, [isLoading, isRetrying]);

  // コンポーネントマウント時に初期データをロード
  useEffect(() => {
    // 初期データロード関数
    const loadInitialData = async () => {
      console.log('useTaskData hook initialized with task:', task, 'isNewTask:', isNewTask);
      // ビジネスIDを取得（初期化時に一度だけ）
      if (!businessDataFetchedRef.current) {
        try {
          console.log('Initial business data fetch...');
          await fetchBusinessData();
          console.log('Business data fetched, now fetching other master data');
          
          // ビジネスIDが取得できたら他のマスターデータも取得
          await Promise.all([
            fetchStatuses(),
            fetchCategories(), 
            fetchPriorities(),
            fetchClients(),
            fetchUsers()
          ]);
          
          console.log('All master data fetched successfully in useTaskData initialization');
          businessDataFetchedRef.current = true;
        } catch (error) {
          console.error('Error fetching initial data:', error);
        }
      }
    };
    
    // フックのアンマウント時にリファレンスをリセット
    return () => {
      businessDataFetchedRef.current = false;
    };
    
    // 初期データをロード
    loadInitialData();
  }, [businessId, isLoading, isRetrying, task, isNewTask, fetchBusinessData, fetchStatuses, fetchCategories, fetchPriorities, fetchClients, fetchUsers]);

  /**
   * クライアントが選択された時の決算期取得
   */
  const fetchFiscalYears = useCallback(async (clientId) => {
    if (!clientId || isLoading) {
      setFiscalYears([]);
      return;
    }

    try {
      const response = await clientsApi.getFiscalYears(clientId);
      if (response && response.data) {
        // 年度の新しい順にソート
        response.data.sort((a, b) => b.year - a.year);
        setFiscalYears(response.data);
      }
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
      // エラーメッセージの表示を制御
      if (!isRetrying) {
        toast.error('決算期の取得に失敗しました');
      }
    }
  }, [isLoading, isRetrying]);

  /**
   * タスクを作成
   */
  const createTask = async (formData) => {
    setSaveState('saving');
    
    try {
      // ワークスペースIDを追加
      if (workspaceId) {
        formData.workspace = workspaceId;
      }
      
      // ビジネスIDを追加（必須）
      formData.business = businessId;
      
      // 必須フィールドの検証
      if (!formData.business) {
        console.error('business IDが未設定です。必須フィールドです。');
        setSaveState('error');
        toast.error('ビジネスIDが設定されていません');
        return null;
      }
      
      console.log('Creating task with data:', formData);
      
      // 新規タスク作成APIを呼び出し
      const response = await tasksApi.createTask(formData);
      console.log('タスク作成サーバーレスポンス:', response);
      
      // APIからの応答データを正しく取得
      // tasksApiの実装によってはresponseがすでにデータオブジェクトの場合がある
      const taskData = response?.data ? response.data : response;
      
      if (taskData && taskData.id) {
        setSaveState('saved');
        // トースト通知はコンポーネント側のみで行う
        // toast.success('タスクを作成しました');
        
        // 作成されたタスク情報を親コンポーネントに通知
        if (onTaskUpdated) {
          onTaskUpdated(taskData);
        }
        
        return taskData;
      }
      
      // APIからのレスポンスがない場合はnullを返す
      console.warn('APIからタスクデータが返されませんでした');
      return null;
    } catch (error) {
      console.error('Error creating task:', error);
      setSaveState('error');
      
      // エラーメッセージをより詳細に
      if (error.response && error.response.data) {
        console.error('API Response Error:', error.response.data);
        // フィールドごとのエラーメッセージを表示
        const errorMessages = [];
        Object.entries(error.response.data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(', ')}`);
          } else {
            errorMessages.push(`${field}: ${messages}`);
          }
        });
        
        if (errorMessages.length > 0) {
          toast.error(`タスクの作成に失敗しました: ${errorMessages.join('; ')}`);
        } else {
          toast.error('タスクの作成に失敗しました');
        }
      } else {
        toast.error('タスクの作成に失敗しました');
      }
      return null;
    }
  };

  /**
   * タスクを更新
   */
  const updateTask = async (taskId, changes, immediate = false) => {
    // 即時保存の場合
    if (immediate) {
      setSaveState('saving');
      
      try {
        const response = await tasksApi.updateTask(taskId, changes);
        
        if (response && response.data) {
          setSaveState('saved');
          
          // 保存完了を通知
          if (onTaskUpdated) {
            onTaskUpdated(response.data);
          }
          
          return response.data;
        }
      } catch (error) {
        console.error('Error updating task:', error);
        setSaveState('error');
        // トースト通知を無効化
        // toast.error('タスクの更新に失敗しました');
        return null;
      }
    } 
    // 通常の遅延保存の場合
    else {
      // 保留中の変更を更新
      setPendingChanges(prev => ({
        ...prev,
        ...changes
      }));
      
      // 変更フラグを立てる
      setIsDirty(true);
      
      // 前回のタイマーをクリア
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      
      // 新しいタイマーをセット
      saveTimerRef.current = setTimeout(() => {
        savePendingChanges(taskId);
      }, 1500);
    }
  };

  /**
   * 保留中の変更を保存
   */
  const savePendingChanges = async (taskId) => {
    if (!isDirty || Object.keys(pendingChanges).length === 0) {
      return;
    }
    
    setSaveState('saving');
    
    try {
      const response = await tasksApi.updateTask(taskId, pendingChanges);
      
      if (response && response.data) {
        setSaveState('saved');
        setPendingChanges({});
        setIsDirty(false);
        
        // 3秒後に保存状態をリセット
        setTimeout(() => {
          setSaveState('idle');
        }, 3000);
        
        // 保存完了を通知
        if (onTaskUpdated) {
          onTaskUpdated(response.data);
        }
      }
    } catch (error) {
      console.error('Error saving pending changes:', error);
      setSaveState('error');
      // トースト通知を無効化
      // toast.error('変更の保存に失敗しました');
    }
  };

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (apiTimerRef.current) {
        clearTimeout(apiTimerRef.current);
      }
    };
  }, []);

  // ビジネスIDが変更されたときに対応するデータを再取得
  useEffect(() => {
    // ビジネスIDが有効な場合のみ
    if (businessId) {
      console.log('[BUSINESS_ID_CHANGED] business ID changed to:', businessId);
      // 新しいビジネスIDでマスターデータを再取得
      fetchCategories();
      fetchStatuses();
      fetchPriorities();
      fetchClients();
      // ユーザーデータもビジネスIDでフィルタリングする場合
      fetchUsers();
    }
  }, [businessId, fetchCategories, fetchStatuses, fetchPriorities, fetchClients, fetchUsers]);

  return {
    categories,
    statuses,
    priorities,
    clients,
    users,
    businessId,
    fiscalYears,
    selectedClient,
    setSelectedClient,
    workspaceId,
    isDirty,
    saveState,
    pendingChanges,
    setPendingChanges,
    setIsDirty,
    setSaveState,
    fetchBusinessData,
    fetchCategories,
    fetchStatuses,
    fetchPriorities,
    fetchClients,
    fetchUsers,
    fetchFiscalYears,
    createTask,
    updateTask,
    savePendingChanges,
    isLoading
  };
}; 