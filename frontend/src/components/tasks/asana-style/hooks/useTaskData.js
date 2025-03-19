import { useState, useEffect, useRef } from 'react';
import { tasksApi, clientsApi, usersApi, businessApi } from '../../../../api';
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
  const [businessId, setBusinessId] = useState(null);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  
  // 保存状態管理
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle, saving, saved, error
  const [pendingChanges, setPendingChanges] = useState({});
  const saveTimerRef = useRef(null);

  /**
   * ビジネスIDとワークスペースIDを取得
   */
  const fetchBusinessData = async () => {
    try {
      const profileResponse = await usersApi.getProfile();
      console.log('Profile Response:', profileResponse);
      
      if (profileResponse && profileResponse.data && profileResponse.data.business && profileResponse.data.business.id) {
        const businessIdValue = profileResponse.data.business.id;
        console.log('Setting businessId to:', businessIdValue);
        setBusinessId(businessIdValue);
        
        // ワークスペースを取得
        try {
          const workspacesResponse = await businessApi.getWorkspaces(businessIdValue);
          console.log('Workspaces Response:', workspacesResponse);
          
          if (workspacesResponse && workspacesResponse.data && Array.isArray(workspacesResponse.data) && workspacesResponse.data.length > 0) {
            const workspaceIdValue = workspacesResponse.data[0].id;
            console.log('Setting workspaceId to:', workspaceIdValue);
            setWorkspaceId(workspaceIdValue);
          } else {
            console.warn('No workspaces found or invalid response format. Using default value 1 for workspaceId.');
            setWorkspaceId(1);
          }
        } catch (error) {
          console.error('Error fetching workspaces:', error);
          console.warn('Using default value 1 for workspaceId.');
          setWorkspaceId(1);
        }
      } else {
        console.warn('Business ID not found in profile response. Using default value 1.');
        setBusinessId(1); // フォールバック値
        setWorkspaceId(1);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      console.warn('Using default values: businessId=1, workspaceId=1');
      setBusinessId(1); // フォールバック値
      setWorkspaceId(1);
    }
  };

  /**
   * カテゴリ一覧を取得
   */
  const fetchCategories = async () => {
    try {
      const response = await tasksApi.getCategories();
      if (response.data) {
        // ビジネスIDでフィルタリング
        const filteredCategories = response.data.filter(cat => 
          cat.business === businessId
        );
        setCategories(filteredCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('カテゴリの取得に失敗しました');
    }
  };

  /**
   * ステータス一覧を取得
   */
  const fetchStatuses = async () => {
    try {
      const response = await tasksApi.getStatuses();
      if (response.data) {
        // ビジネスIDでフィルタリング
        const filteredStatuses = response.data.filter(status => 
          status.business === businessId
        );
        
        // 順序でソート
        filteredStatuses.sort((a, b) => a.order - b.order);
        
        setStatuses(filteredStatuses);
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
      toast.error('ステータスの取得に失敗しました');
    }
  };

  /**
   * 優先度一覧を取得
   */
  const fetchPriorities = async () => {
    try {
      const response = await tasksApi.getPriorities();
      if (response.data) {
        // ビジネスIDでフィルタリング
        const filteredPriorities = response.data.filter(priority => 
          priority.business === businessId
        );
        
        // 優先度で昇順ソート（低い値が高優先度）
        filteredPriorities.sort((a, b) => a.priority_value - b.priority_value);
        
        setPriorities(filteredPriorities);
      }
    } catch (error) {
      console.error('Error fetching priorities:', error);
      toast.error('優先度の取得に失敗しました');
    }
  };

  /**
   * クライアント一覧を取得
   */
  const fetchClients = async () => {
    try {
      const response = await clientsApi.getClients();
      if (response.data) {
        setClients(response.data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('クライアントの取得に失敗しました');
    }
  };

  /**
   * ユーザー一覧を取得
   */
  const fetchUsers = async () => {
    try {
      const response = await usersApi.getUsers();
      if (response.data) {
        // ビジネスIDでフィルタリング
        const filteredUsers = response.data.filter(user => 
          user.business === businessId
        );
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('ユーザーの取得に失敗しました');
    }
  };

  /**
   * クライアントが選択された時の決算期取得
   */
  const fetchFiscalYears = async (clientId) => {
    if (!clientId) {
      setFiscalYears([]);
      return;
    }

    try {
      const response = await clientsApi.getFiscalYears(clientId);
      if (response.data) {
        // 年度の新しい順にソート
        response.data.sort((a, b) => b.year - a.year);
        setFiscalYears(response.data);
      }
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
      toast.error('決算期の取得に失敗しました');
    }
  };

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
      
      // 新規タスク作成APIを呼び出し
      const response = await tasksApi.createTask(formData);
      
      if (response.data) {
        setSaveState('saved');
        toast.success('タスクを作成しました');
        
        // 作成されたタスク情報を親コンポーネントに通知
        if (onTaskUpdated) {
          onTaskUpdated(response.data);
        }
        
        return response.data;
      }
    } catch (error) {
      console.error('Error creating task:', error);
      setSaveState('error');
      toast.error('タスクの作成に失敗しました');
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
        
        if (response.data) {
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
        toast.error('タスクの更新に失敗しました');
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
      
      if (response.data) {
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
      toast.error('変更の保存に失敗しました');
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
    };
  }, []);

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
    fetchBusinessData,
    fetchCategories,
    fetchStatuses,
    fetchPriorities,
    fetchClients,
    fetchUsers,
    fetchFiscalYears,
    createTask,
    updateTask,
    savePendingChanges
  };
}; 