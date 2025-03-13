import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  HiOutlineX, 
  HiCheck, 
  HiOutlineClock, 
  HiUser, 
  HiUserGroup, 
  HiOutlineTrash, 
  HiExclamation 
} from 'react-icons/hi';
import { tasksApi, clientsApi, usersApi, timeManagementApi } from '../../../api';
import toast from 'react-hot-toast';

/**
 * Asana風タスク編集コンポーネント
 * - 編集状態のリアルタイム監視
 * - 自動保存とバッチ処理
 * - 視覚的フィードバック強化
 */
const TaskEditor = ({ task, isNewTask = false, onClose, onTaskUpdated, isOpen = false }) => {
  // 状態管理
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [businessId, setBusinessId] = useState(null);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  // is_fiscal_task関連の状態管理は削除
  const [isAssigneeExpanded, setIsAssigneeExpanded] = useState(false);
  const [isDateExpanded, setIsDateExpanded] = useState(false);
  
  // 削除機能関連の状態
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 共通スタイル
  const inputClassName = "shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400";
  const selectClassName = "shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400";
  
  // 時間記録の状態管理
  const [isRecordingTime, setIsRecordingTime] = useState(false);
  const [timeEntry, setTimeEntry] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const timeIntervalRef = useRef(null);
  
  // 時間記録履歴関連
  const [timeEntries, setTimeEntries] = useState([]);
  const [cachedTimeEntries, setCachedTimeEntries] = useState([]); // キャッシュ用の状態を追加
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState(null);
  const [timeEntryForm, setTimeEntryForm] = useState({
    start_time: '',
    end_time: '',
    description: '',
    duration_seconds: 0
  });
  
  // 保存状態管理
  const [saveState, setSaveState] = useState('idle'); // idle, saving, saved, error
  const [isDirty, setIsDirty] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const saveTimerRef = useRef(null);
  
  // React Hook Form
  const { control, handleSubmit, formState, setValue, watch, getValues, reset } = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: '',
      priority: '',
      category: '',
      due_date: '',
      estimated_hours: '',
      client: '',
      worker: '',
      reviewer: '',
      is_fiscal_task: 'false',
      fiscal_year: '',
      is_recurring: 'false',
      recurrence_pattern: '',
      recurrence_end_date: '',
      is_template: 'false',
      template_name: '',
      start_date: '',
      completed_at: '',
    }
  });
  
  // 監視対象のフィールド
  const watchedClient = watch('client');
  // is_fiscal_task監視は削除
  const watchedIsRecurring = watch('is_recurring');
  const watchedIsTemplate = watch('is_template');
  
  // メタデータ読み込み
  useEffect(() => {
    const loadTaskMetadata = async () => {
      try {
        // 最初に現在のユーザーとビジネス情報を取得
        const currentUser = await usersApi.getCurrentUser();
        
        if (currentUser && currentUser.business) {
          setBusinessId(currentUser.business);
          
          // すべてのメタデータを並列で取得
          const [categoriesData, statusesData, prioritiesData, clientsData, usersData] = await Promise.all([
            tasksApi.getCategories(),
            tasksApi.getStatuses(),
            tasksApi.getPriorities(),
            clientsApi.getClients({ contract_status: 'active' }), // 契約中クライアントのみ
            usersApi.getBusinessUsers(currentUser.business), // 同じビジネスのユーザーを取得
          ]);
          
          setCategories(Array.isArray(categoriesData) ? categoriesData : 
                        (categoriesData?.results || []));
          setStatuses(Array.isArray(statusesData) ? statusesData : 
                     (statusesData?.results || []));
          setPriorities(Array.isArray(prioritiesData) ? prioritiesData : 
                       (prioritiesData?.results || []));
          setClients(Array.isArray(clientsData) ? clientsData : 
                    (clientsData?.results || []));
          setUsers(Array.isArray(usersData) ? usersData : 
                  (usersData?.results || []));
        } else {
          console.error('No business ID found for current user');
          toast.error('ビジネス情報の取得に失敗しました');
        }
      } catch (error) {
        console.error('Error loading task metadata:', error);
        toast.error('タスク情報の読み込みに失敗しました');
      }
    };
    
    loadTaskMetadata();
  }, []);
  
  // タスクの既存の時間記録を確認
  useEffect(() => {
    if (!isNewTask && task && task.id) {
      const checkForActiveTimer = async () => {
        try {
          const entries = await timeManagementApi.getTimeEntries({ 
            task_id: task.id,
            active: true
          });
          
          // 進行中のタイマーがあるか確認（end_timeがnullか、is_runningがtrueのもの）
          const activeEntries = Array.isArray(entries) ? entries.filter(entry => 
            entry.task && 
            entry.task.id === task.id && 
            (entry.is_running === true || entry.end_time === null)
          ) : [];
          
          if (activeEntries && activeEntries.length > 0) {
            const activeEntry = activeEntries[0];
            console.log('Active timer found:', activeEntry);
            setTimeEntry(activeEntry);
            setIsRecordingTime(true);
            setStartTime(new Date(activeEntry.start_time));
          } else {
            // アクティブなタイマーがない場合はリセット
            console.log('No active timer found for task ID:', task.id);
            setTimeEntry(null);
            setIsRecordingTime(false);
            setStartTime(null);
          }
        } catch (error) {
          console.error('Error checking for active timer:', error);
          // エラー時はタイマー状態をリセット
          setTimeEntry(null);
          setIsRecordingTime(false);
          setStartTime(null);
        }
      };
      
      // アクティブなタイマーをチェック
      checkForActiveTimer();
      
      // タスクに関連する全ての時間記録を取得（初期状態では折りたたみ表示）
      fetchTimeEntries();
    }
  }, [isNewTask, task]);
  
  // タスクに関連する時間エントリを取得
  const fetchTimeEntries = async () => {
    if (!task || !task.id) return;
    
    setIsLoadingTimeEntries(true);
    try {
      // すでにキャッシュにデータがある場合はAPIを呼ばない
      if (cachedTimeEntries.length > 0) {
        return cachedTimeEntries;
      }
      
      const entries = await timeManagementApi.getTimeEntries({ task_id: task.id });
      
      // 完了した時間エントリ（is_runningがfalseかつend_timeがある）を日付の新しい順に
      const completedEntries = Array.isArray(entries) 
        ? entries
            .filter(entry => 
              entry.task && 
              entry.task.id === task.id && 
              !entry.is_running && 
              entry.end_time
            )
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
        : [];
      
      // データをキャッシュに保存
      setCachedTimeEntries(completedEntries);
      return completedEntries;
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast.error('時間記録の取得に失敗しました');
      return [];
    } finally {
      setIsLoadingTimeEntries(false);
    }
  };
  
  // タスク情報設定
  useEffect(() => {
    if (!task && !isNewTask) return;
    
    const setupTaskForm = () => {
      // 新しいタスクデータが取得された時にコンソールログに出力
      if (task && !isNewTask) {
        console.log('Setting up task form with data:', task);
        console.log('Assignee info:', {
          assignee: task.assignee,
          assignee_name: task.assignee_name,
          status_data: task.status_data,
          worker: task.worker,
          worker_name: task.worker_name,
          reviewer: task.reviewer,
          reviewer_name: task.reviewer_name
        });
      }
      
      if (isNewTask) {
        // 新規タスクの場合のデフォルト値
        const defaultValues = {
          title: '',
          description: '',
          status: statuses[0]?.id.toString() || '',
          priority_value: '',  // 数値入力用フィールド
          category: '',
          due_date: '',
          estimated_hours: '',
          client: '',
          is_fiscal_task: 'false',
          fiscal_year: '',
          is_recurring: 'false',
          recurrence_pattern: '',
          recurrence_end_date: '',
          is_template: 'false',
          template_name: '',
          start_date: '',
          completed_at: '',
        };
        reset(defaultValues);
        setIsDirty(false);
        setPendingChanges({});
        return;
      }
      
      // 既存タスクの編集
      if (task) {
        // タスク情報をデバッグ
        console.log('Task assignee info:', {
          assignee: task.assignee,
          assignee_name: task.assignee_name,
          assignee_type: task.assignee_type,
          worker: task.worker,
          worker_name: task.worker_name,
          reviewer: task.reviewer,
          reviewer_name: task.reviewer_name
        });
        
        // IDを文字列に変換する関数
        const getIdAsString = (field) => {
          if (!field) return '';
          if (typeof field === 'object' && field.id) return field.id.toString();
          return field.toString();
        };
        
        // タスクデータをフォームに設定
        const formValues = {
          title: task.title || '',
          description: task.description || '',
          status: getIdAsString(task.status_data?.id || task.status),
          priority_value: task.priority_data?.priority_value || '',  // 優先度値をそのまま使用
          category: getIdAsString(task.category_data?.id || task.category),
          client: getIdAsString(task.client_data?.id || task.client),
          worker: getIdAsString(task.worker_data?.id || task.worker),
          reviewer: getIdAsString(task.reviewer_data?.id || task.reviewer),
          due_date: task.due_date ? task.due_date.substring(0, 10) : '',
          estimated_hours: task.estimated_hours || '',
          // is_fiscal_task, fiscal_year関連フィールドは削除
          is_recurring: task.is_recurring ? 'true' : 'false',
          recurrence_pattern: task.recurrence_pattern || '',
          recurrence_end_date: task.recurrence_end_date ? task.recurrence_end_date.substring(0, 10) : '',
          is_template: task.is_template ? 'true' : 'false',
          template_name: task.template_name || '',
          start_date: task.start_date ? task.start_date.substring(0, 10) : '',
          completed_at: task.completed_at ? task.completed_at.substring(0, 10) : '',
        };
        
        // フォームリセット
        reset(formValues);
        
        // その他の状態設定
        // setIsFiscalTask削除
        
        // クライアント情報設定
        if (task.client) {
          const clientId = getIdAsString(task.client_data?.id || task.client);
          const clientObj = clients.find(c => c.id.toString() === clientId);
          if (clientObj) {
            setSelectedClient(clientObj);
          }
        }
        
        // 保存状態初期化
        setIsDirty(false);
        setPendingChanges({});
      }
    };
    
    // メタデータ読み込み後にタスク設定
    if (statuses.length > 0) {
      setupTaskForm();
    }
  }, [task, isNewTask, statuses, priorities, clients, reset]);
  
  // クライアント選択時に決算期情報を取得
  useEffect(() => {
    const loadFiscalYears = async () => {
      if (!watchedClient) {
        setFiscalYears([]);
        setSelectedClient(null);
        return;
      }
      
      // クライアント情報設定
      const clientObj = clients.find(c => c.id.toString() === watchedClient);
      if (clientObj) {
        setSelectedClient(clientObj);
      }
      
      // 決算期情報取得
      try {
        const fiscalYearsData = await clientsApi.getFiscalYears(watchedClient);
        setFiscalYears(fiscalYearsData || []);
      } catch (error) {
        console.error('Error loading fiscal years:', error);
        setFiscalYears([]);
      }
    };
    
    // クライアント変更時は即座にクライアント情報を設定し、APIは遅延実行
    if (watchedClient) {
      const clientObj = clients.find(c => c.id.toString() === watchedClient);
      if (clientObj) {
        setSelectedClient(clientObj);
      }
      
      // 既存のタイマーをクリア
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      
      // 遅延実行でAPIリクエスト
      saveTimerRef.current = setTimeout(() => {
        loadFiscalYears();
      }, 300);
    } else {
      setFiscalYears([]);
      setSelectedClient(null);
    }
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [watchedClient, clients]);
  
  // 決算期タスクフラグ監視は削除
  
  // 時間記録の経過時間を更新
  useEffect(() => {
    // インターバルをクリア
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
    
    if (isRecordingTime && startTime) {
      const updateElapsedTime = () => {
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);
        
        const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const seconds = Math.floor(diff % 60).toString().padStart(2, '0');
        
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      };
      
      // 初期表示のために1回実行
      updateElapsedTime();
      // 1秒ごとに更新
      timeIntervalRef.current = setInterval(updateElapsedTime, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    
    // コンポーネントのクリーンアップ時にインターバルをクリア
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, [isRecordingTime, startTime]);
  
  // フォーム変更監視
  useEffect(() => {
    const subscription = formState.dirtyFields;
    if (Object.keys(subscription).length > 0) {
      setIsDirty(true);
      
      // 自動保存タイマーをリセット
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      
      // 2秒後に自動保存
      saveTimerRef.current = setTimeout(() => {
        if (isDirty && !isNewTask && task) {
          saveChanges();
        }
      }, 2000);
    }
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [formState.dirtyFields, getValues]);
  
  /**
   * 変更をサーバーに保存
   */
  const saveChanges = async () => {
    if (!task || isNewTask) return;
    
    try {
      setSaveState('saving');
      const formData = getValues();
      
      // データフォーマット (非同期関数になった)
      const formattedData = await formatDataForApi(formData);
      
      // 更新実行
      const result = await tasksApi.updateTask(task.id, formattedData);
      
      // 成功
      setSaveState('saved');
      setIsDirty(false);
      setPendingChanges({});
      
      // 通知
      if (onTaskUpdated) {
        onTaskUpdated(result);
      }
      
      // 一定時間後に保存状態表示を消す
      setTimeout(() => {
        setSaveState('idle');
      }, 2000);
      
    } catch (error) {
      console.error('タスク保存エラー:', error);
      setSaveState('error');
      toast.error('タスクの保存に失敗しました');
    }
  };
  
  /**
   * タスク削除確認モーダルを表示
   */
  const handleDeleteConfirm = () => {
    if (isNewTask) return;
    setIsDeleteModalOpen(true);
  };
  
  /**
   * タスク削除実行
   */
  const handleDeleteTask = async () => {
    if (isNewTask || !task || !task.id || isDeleting) return;
    
    try {
      setIsDeleting(true);
      await tasksApi.deleteTask(task.id);
      
      // 削除成功
      toast.success('タスクを削除しました');
      
      // モーダルを閉じる
      setIsDeleteModalOpen(false);
      
      // スライドパネルを閉じる
      onClose();
      
      // タスク一覧を更新 (カスタムイベントで通知)
      window.dispatchEvent(new Event('task-update-force-refresh'));
      
    } catch (error) {
      console.error('タスク削除エラー:', error);
      toast.error('タスクの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };
  
  /**
   * タスク作成・保存（フォーム送信）
   */
  const submitTask = async (data) => {
    try {
      setSaveState('saving');
      
      // データフォーマット (非同期関数になった)
      const formattedData = await formatDataForApi(data);
      
      let result;
      if (isNewTask) {
        // 新規作成
        result = await tasksApi.createTask(formattedData);
        toast.success('タスクを作成しました');
        if (onClose) onClose();
      } else {
        // 更新
        result = await tasksApi.updateTask(task.id, formattedData);
        toast.success('タスクを更新しました');
      }
      
      // 状態更新
      setSaveState('saved');
      setIsDirty(false);
      setPendingChanges({});
      
      // 親コンポーネントに通知
      if (onTaskUpdated) {
        onTaskUpdated(result);
      }
      
      // 一定時間後に保存状態表示を消す
      setTimeout(() => {
        setSaveState('idle');
      }, 2000);
      
    } catch (error) {
      console.error('タスク保存エラー:', error);
      setSaveState('error');
      
      // エラーメッセージ構築
      let errorMessage = 'タスクの保存に失敗しました';
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          const errorDetails = Object.entries(error.response.data)
            .map(([field, errors]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              }
              return `${field}: ${errors}`;
            })
            .join('; ');
          
          if (errorDetails) {
            errorMessage = `保存エラー: ${errorDetails}`;
          }
        }
      }
      
      toast.error(errorMessage);
    }
  };
  
  /**
   * データをAPI用にフォーマット
   */
  const formatDataForApi = async (data) => {
    // 優先度値を直接設定
    let priorityValue = null;
    let priorityId = null;
    
    if (data.priority_value) {
      priorityValue = parseInt(data.priority_value, 10);
      if (!isNaN(priorityValue) && priorityValue >= 1 && priorityValue <= 100) {
        try {
          // 優先度値に基づいて優先度レコードを作成または取得
          const priorityResponse = await tasksApi.createPriorityForValue(priorityValue);
          priorityId = priorityResponse.id;
          console.log(`優先度 ${priorityValue} のレコードを取得: ID=${priorityId}`);
        } catch (error) {
          console.error('優先度レコードの作成に失敗:', error);
        }
      }
    }
    
    return {
      ...data,
      // 数値変換
      status: data.status ? parseInt(data.status, 10) : null,
      priority: priorityId,  // レコードIDを設定
      category: data.category ? parseInt(data.category, 10) : null,
      client: data.client ? parseInt(data.client, 10) : null,
      worker: data.worker ? parseInt(data.worker, 10) : null,
      reviewer: data.reviewer ? parseInt(data.reviewer, 10) : null,
      // fiscal_year関連のフィールドは削除
      
      // 真偽値変換
      // is_fiscal_task関連のフィールドは削除
      is_recurring: data.is_recurring === 'true',
      is_template: data.is_template === 'true',
      
      // 日付フォーマット (バックエンドで処理)
      due_date: data.due_date || null,
      start_date: data.start_date || null,
      completed_at: data.completed_at || null,
      recurrence_end_date: data.recurrence_end_date || null,
    };
  };
  
  /**
   * 個別フィールド変更ハンドラー
   */
  const handleFieldChange = (name, value) => {
    // フォーム値更新
    setValue(name, value, {
      shouldDirty: true,
      shouldValidate: true
    });
    
    // 変更をキューに追加
    setPendingChanges(prev => ({
      ...prev,
      [name]: value
    }));
    
    setIsDirty(true);
  };
  
  /**
   * 作業時間記録開始
   */
  const startTimeRecording = async () => {
    if (!task || isNewTask) {
      toast.error('先にタスクを保存してください');
      return;
    }
    
    try {
      // タスク関連情報を取得
      const formData = getValues();
      const statusName = statuses.find(s => s.id.toString() === formData.status)?.name || '';
      const clientId = formData.client ? parseInt(formData.client, 10) : null;
      const fiscalYearId = formData.fiscal_year ? parseInt(formData.fiscal_year, 10) : null;
      
      // 既存のアクティブなタイマーがある場合は警告
      const activeTimers = await timeManagementApi.getTimeEntries({ active: true });
      if (Array.isArray(activeTimers) && activeTimers.length > 0) {
        const otherTaskTimer = activeTimers.find(entry => 
          entry.task && entry.task.id !== task.id
        );
        
        if (otherTaskTimer) {
          const confirmStart = window.confirm(
            `別のタスク「${otherTaskTimer.task?.title || '不明'}」でタイマーが実行中です。\n` +
            'このタスクのタイマーを開始すると、実行中のタイマーは停止されます。\n' +
            '続行しますか？'
          );
          
          if (!confirmStart) {
            return;
          }
          
          // 既存のタイマーを停止
          await timeManagementApi.stopTimeEntry(otherTaskTimer.id);
          toast.success('他のタスクのタイマーを停止しました');
        }
      }
      
      // タイマー開始APIコール
      const response = await timeManagementApi.startTimeEntry({
        task_id: task.id,
        description: `Working on: ${formData.title} (${statusName})`,
        client_id: clientId,
        fiscal_year_id: fiscalYearId
      });
      
      console.log('Timer started:', response);
      
      // 状態更新
      setTimeEntry(response);
      setIsRecordingTime(true);
      setStartTime(new Date(response.start_time));
      
      toast.success('作業時間の記録を開始しました');
    } catch (error) {
      console.error('Error starting time recording:', error);
      toast.error('作業時間の記録開始に失敗しました');
    }
  };
  
  /**
   * 作業時間記録停止
   */
  const stopTimeRecording = async () => {
    if (!timeEntry || !timeEntry.id) {
      toast.error('作業時間の記録が開始されていません');
      return;
    }
    
    try {
      // タイマー停止APIコール
      const stopResult = await timeManagementApi.stopTimeEntry(timeEntry.id);
      console.log('Timer stopped:', stopResult);
      
      // 状態更新
      setTimeEntry(null);
      setIsRecordingTime(false);
      setStartTime(null);
      setElapsedTime('00:00:00');
      
      // インターバルをクリア
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
      
      toast.success('作業時間を記録しました');
      
      // キャッシュを空にして再取得を強制する
      setCachedTimeEntries([]);
      fetchTimeEntries();
    } catch (error) {
      console.error('Error stopping time recording:', error);
      toast.error('作業時間の記録停止に失敗しました');
    }
  };
  
  /**
   * 時間エントリの編集を開始
   */
  const startEditingTimeEntry = (entry) => {
    setEditingTimeEntry(entry.id);
    
    // 日付をフォーム用にフォーマット
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      
      // タイムゾーンを考慮した日時文字列を作成
      const date = new Date(dateString);
      return date.toISOString().substring(0, 16); // YYYY-MM-DDThh:mm 形式
    };
    
    setTimeEntryForm({
      start_time: formatDateForInput(entry.start_time),
      end_time: formatDateForInput(entry.end_time),
      description: entry.description || '',
      duration_seconds: entry.duration_seconds || 0
    });
  };
  
  /**
   * 時間エントリの編集をキャンセル
   */
  const cancelEditingTimeEntry = () => {
    setEditingTimeEntry(null);
    setTimeEntryForm({
      start_time: '',
      end_time: '',
      description: '',
      duration_seconds: 0
    });
  };
  
  /**
   * 時間エントリの編集を保存
   */
  const saveTimeEntryEdit = async () => {
    if (!editingTimeEntry) return;
    
    try {
      // 開始時間と終了時間から新しい所要時間を計算
      const startTime = new Date(timeEntryForm.start_time);
      const endTime = new Date(timeEntryForm.end_time);
      const durationSeconds = Math.floor((endTime - startTime) / 1000);
      
      // 時間エントリの更新データ
      const updateData = {
        ...timeEntryForm,
        duration_seconds: durationSeconds > 0 ? durationSeconds : timeEntryForm.duration_seconds
      };
      
      // APIで更新
      await timeManagementApi.updateTimeEntry(editingTimeEntry, updateData);
      
      // 編集モードを終了
      cancelEditingTimeEntry();
      
      // キャッシュをクリアして時間エントリリストを更新
      setCachedTimeEntries([]);
      fetchTimeEntries();
      
      toast.success('時間記録を更新しました');
    } catch (error) {
      console.error('Error updating time entry:', error);
      toast.error('時間記録の更新に失敗しました');
    }
  };
  
  /**
   * 時間エントリを削除
   */
  const deleteTimeEntry = async (entryId) => {
    if (!entryId) return;
    
    if (!window.confirm('この時間記録を削除してもよろしいですか？')) {
      return;
    }
    
    try {
      // APIで削除
      await timeManagementApi.deleteTimeEntry(entryId);
      
      // キャッシュをクリアして時間エントリリストを更新
      setCachedTimeEntries([]);
      fetchTimeEntries();
      
      toast.success('時間記録を削除しました');
    } catch (error) {
      console.error('Error deleting time entry:', error);
      toast.error('時間記録の削除に失敗しました');
    }
  };
  
  // 保存ステータス表示
  const renderSaveStatus = () => {
    switch (saveState) {
      case 'saving':
        return (
          <div className="flex items-center text-gray-500">
            <HiOutlineClock className="mr-1 animate-pulse" />
            <span>変更を保存中...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-green-500">
            <HiCheck className="mr-1" />
            <span>保存しました</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-500">
            <span>保存に失敗しました</span>
            <button 
              onClick={saveChanges} 
              className="ml-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
            >
              再試行
            </button>
          </div>
        );
      default:
        return isDirty ? (
          <div className="flex items-center text-gray-500">
            <span>未保存の変更があります</span>
            <button 
              onClick={saveChanges} 
              className="ml-2 text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
            >
              保存
            </button>
          </div>
        ) : null;
    }
  };
  
  // Asana風スライドパネル - isOpenプロパティに基づいて条件付きレンダリング
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 overflow-hidden">
        {/* オーバーレイ */}
        <div 
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* スライドパネル */}
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="relative w-screen max-w-2xl transform transition ease-in-out duration-300">
            <div className="h-full flex flex-col bg-white shadow-xl overflow-y-auto">
              {/* ヘッダー */}
              <div className="px-4 py-6 bg-white border-b border-gray-200 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    {isNewTask ? 'タスクを作成' : 'タスクを編集'}
                  </h2>
                  <div className="ml-3 h-7 flex items-center">
                    <button
                      onClick={onClose}
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <span className="sr-only">閉じる</span>
                      <HiOutlineX className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                
                {/* 保存状態表示 */}
                <div className="mt-2 text-sm">
                  {renderSaveStatus()}
                </div>
              </div>
              
              {/* フォーム本体 */}
              <div className="flex-1 py-6 px-4 sm:px-6 overflow-auto">
                <form onSubmit={handleSubmit(submitTask)}>
                  <div className="space-y-6">
                    {/* ステータスとタイトルを1行に */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      {/* ステータス */}
                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          ステータス
                        </label>
                        <div className="mt-1">
                          <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                              <select
                                id="status"
                                className={selectClassName}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleFieldChange('status', e.target.value);
                                }}
                              >
                                <option value="">選択してください</option>
                                {statuses.map((status) => (
                                  <option key={status.id} value={status.id}>
                                    {status.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </div>
                      </div>
                      
                      {/* タイトル (大きく表示) */}
                      <div className="col-span-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                          タイトル
                        </label>
                        <div className="mt-1">
                          <Controller
                            name="title"
                            control={control}
                            rules={{ required: 'タイトルは必須です' }}
                            render={({ field, fieldState }) => (
                              <div>
                                <input
                                  type="text"
                                  id="title"
                                  className={`${inputClassName} text-lg font-medium ${
                                    fieldState.error ? 'border-red-300' : ''
                                  }`}
                                  placeholder="タスクのタイトルを入力"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleFieldChange('title', e.target.value);
                                  }}
                                />
                                {fieldState.error && (
                                  <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>
                                )}
                              </div>
                            )}
                          />
                        </div>
                      </div>
                      </div>

                      {/* カテゴリー、クライアント、決算期 - タイトルの直後に配置 */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {/* カテゴリー */}
                        <div>
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            カテゴリー
                          </label>
                          <div className="mt-1">
                            <Controller
                              name="category"
                              control={control}
                              render={({ field }) => (
                                <select
                                  id="category"
                                  className={selectClassName}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleFieldChange('category', e.target.value);
                                  }}
                                >
                                  <option value="">選択してください</option>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* クライアント */}
                        <div>
                          <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                            クライアント
                          </label>
                          <div className="mt-1">
                            <Controller
                              name="client"
                              control={control}
                              render={({ field }) => (
                                <select
                                  id="client"
                                  className={selectClassName}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleFieldChange('client', e.target.value);
                                  }}
                                >
                                  <option value="">選択してください</option>
                                  {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                      {client.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* 決算期 */}
                        <div>
                          <label htmlFor="fiscal_year" className="block text-sm font-medium text-gray-700">
                            決算期
                          </label>
                          <div className="mt-1">
                            <Controller
                              name="fiscal_year"
                              control={control}
                              render={({ field }) => (
                                <select
                                  id="fiscal_year"
                                  className={selectClassName}
                                  disabled={!watchedClient}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleFieldChange('fiscal_year', e.target.value);
                                  }}
                                >
                                  <option value="">選択してください</option>
                                  {fiscalYears.map((fiscalYear) => (
                                    <option key={fiscalYear.id} value={fiscalYear.id}>
                                      第{fiscalYear.fiscal_period}期
                                    </option>
                                  ))}
                                </select>
                              )}
                            />
                          </div>
                        </div>
                    </div>
                    
                    {/* 担当者設定セクション - ステータス/タイトルの直後に移動 */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                           onClick={() => setIsAssigneeExpanded(!isAssigneeExpanded)}>
                        <div className="flex items-center">
                          <h3 className="text-md font-medium text-gray-700 flex items-center">
                            <HiUserGroup className="mr-2 text-gray-500" />
                            担当者設定
                          </h3>
                          
                          {/* 注意事項をツールチップに変更 */}
                          <div className="ml-2 group relative inline-block" onClick={e => e.stopPropagation()}>
                            <span className="bg-amber-100 text-amber-600 rounded-full w-5 h-5 flex items-center justify-center cursor-help">
                              ?
                            </span>
                            <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity absolute z-10 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-700 top-full left-0 mt-1">
                              タスクのステータスによって担当者は自動的に切り替わります。作業者ステータスでは作業担当者が、レビューステータスではレビュー担当者が担当になります。
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-sm">
                          {/* 現在の担当者表示 - シンプルな形で右側に表示 */}
                          {task && (
                            <div className="bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 flex items-center">
                              <HiUser className="mr-1.5 text-blue-500" />
                              <div className="flex items-center">
                                <span className="text-blue-700 mr-1">現在の担当者:</span>
                                <span className="text-blue-800 font-medium">
                                  {task.assignee_name ||
                                   (task.worker_name && task.status_data?.assignee_type === 'worker' ? task.worker_name : 
                                    task.reviewer_name && task.status_data?.assignee_type === 'reviewer' ? task.reviewer_name :
                                    task.status_data?.assignee_type === 'worker' ? '作業担当者' :
                                    task.status_data?.assignee_type === 'reviewer' ? 'レビュー担当者' :
                                    '担当者なし')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* 折りたたみ展開ボタン */}
                        <button 
                          type="button" 
                          className="text-gray-500 hover:text-gray-700 focus:outline-none"
                          aria-expanded={isAssigneeExpanded}
                        >
                          {isAssigneeExpanded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </div>
                      
                      {/* 現在の担当者表示は上部に移動済み */}
                      
                      {/* 作業者とレビュー担当者 - 折りたたみ可能 */}
                      {isAssigneeExpanded && (
                        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                          {/* 作業者 */}
                          <div className="flex items-center gap-3">
                            <label htmlFor="worker" className="block text-sm font-medium text-gray-700 w-24 flex-shrink-0">
                              作業担当者
                            </label>
                            <div className="flex-grow">
                              <Controller
                                name="worker"
                                control={control}
                                render={({ field }) => (
                                  <select
                                    id="worker"
                                    className={selectClassName}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleFieldChange('worker', e.target.value);
                                    }}
                                  >
                                    <option value="">選択してください</option>
                                    {users.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.get_full_name || user.email}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              />
                            </div>
                          </div>
                          
                          {/* レビュー担当者 */}
                          <div className="flex items-center gap-3">
                            <label htmlFor="reviewer" className="block text-sm font-medium text-gray-700 w-24 flex-shrink-0">
                              レビュー担当者
                            </label>
                            <div className="flex-grow">
                              <Controller
                                name="reviewer"
                                control={control}
                                render={({ field }) => (
                                  <select
                                    id="reviewer"
                                    className={selectClassName}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleFieldChange('reviewer', e.target.value);
                                    }}
                                  >
                                    <option value="">選択してください</option>
                                    {users.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.get_full_name || user.email}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 期限日と優先度 */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="grid grid-cols-2 gap-6">
                        {/* 期限日 */}
                        <div>
                          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                            期限日
                          </label>
                          <div className="mt-1">
                            <Controller
                              name="due_date"
                              control={control}
                              render={({ field }) => (
                                <input
                                  type="date"
                                  id="due_date"
                                  className={inputClassName}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleFieldChange('due_date', e.target.value);
                                  }}
                                />
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* 優先度 */}
                        <div>
                          <label htmlFor="priority_value" className="block text-sm font-medium text-gray-700 flex items-center">
                            優先度
                            <div className="relative ml-2 group">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="absolute left-0 bottom-6 w-52 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <p>優先度は1〜100の数値で指定します。</p>
                                <p className="mt-1">数値が小さいほど優先度が高くなります。</p>
                                <div className="absolute bottom-0 left-3 transform translate-y-full w-2 h-2 bg-gray-800 rotate-45"></div>
                              </div>
                            </div>
                          </label>
                          <div className="mt-1">
                            <Controller
                              name="priority_value"
                              control={control}
                              render={({ field }) => (
                                <input
                                  type="number"
                                  id="priority_value"
                                  min="1"
                                  max="100"
                                  placeholder="1-100の数値を入力"
                                  className={inputClassName}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleFieldChange('priority_value', e.target.value);
                                  }}
                                />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* 開始日と完了日（折りたたみ可能） */}
                      <div className="mt-3">
                        {/* 折りたたみヘッダー */}
                        <div 
                          className="flex items-center justify-between cursor-pointer border-t border-gray-100 pt-3"
                          onClick={() => setIsDateExpanded(!isDateExpanded)}
                        >
                          <h4 className="text-sm font-medium text-gray-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            詳細日付設定
                          </h4>
                          <button 
                            type="button" 
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-expanded={isDateExpanded}
                          >
                            {isDateExpanded ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>
                        </div>
                        
                        {/* 折りたたみコンテンツ */}
                        {isDateExpanded && (
                          <div className="grid grid-cols-2 gap-6 mt-3">
                            {/* 開始日 */}
                            <div>
                              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                                開始日
                              </label>
                              <div className="mt-1">
                                <Controller
                                  name="start_date"
                                  control={control}
                                  render={({ field }) => (
                                    <input
                                      type="date"
                                      id="start_date"
                                      className={inputClassName}
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleFieldChange('start_date', e.target.value);
                                      }}
                                    />
                                  )}
                                />
                              </div>
                            </div>
                            
                            {/* 完了日 */}
                            <div>
                              <label htmlFor="completed_at" className="block text-sm font-medium text-gray-700">
                                完了日
                              </label>
                              <div className="mt-1">
                                <Controller
                                  name="completed_at"
                                  control={control}
                                  render={({ field }) => (
                                    <input
                                      type="date"
                                      id="completed_at"
                                      className={inputClassName}
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleFieldChange('completed_at', e.target.value);
                                      }}
                                    />
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 説明 */}
                    <div className="border-t border-gray-200 pt-4">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        説明
                      </label>
                      <div className="mt-1">
                        <Controller
                          name="description"
                          control={control}
                          render={({ field }) => (
                            <textarea
                              id="description"
                              rows={4}
                              className={inputClassName}
                              placeholder="詳細な説明を入力"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                handleFieldChange('description', e.target.value);
                              }}
                            />
                          )}
                        />
                      </div>
                    </div>
                    
                    {/* 作業時間記録セクション - 説明の下に移動 */}
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-md font-medium text-gray-700 flex items-center mb-3">
                        <HiOutlineClock className="mr-2 text-gray-500" />
                        作業時間記録
                      </h3>
                      
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        {!isNewTask && task ? (
                          <div className="flex flex-col">
                            <div className="space-y-2">
                              {/* 1行目: 作業時間を記録 | フォーム | ボタン */}
                              <div className="flex items-center space-x-3">
                                <div className="text-sm text-gray-700 flex items-center whitespace-nowrap w-28">
                                  {isRecordingTime ? (
                                    <>
                                      <span className="h-3 w-3 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                                      <span className="font-medium">タイマー記録中</span>
                                    </>
                                  ) : (
                                    <span className="font-medium">作業時間を記録</span>
                                  )}
                                </div>
                                
                                <div className="font-mono text-md font-semibold bg-white px-2 py-1 rounded-md border border-gray-300 shadow-sm flex-shrink-0">
                                  {elapsedTime}
                                </div>
                                
                                <div className="flex-grow"></div>
                                
                                {isRecordingTime ? (
                                  <button
                                    type="button"
                                    onClick={stopTimeRecording}
                                    className="flex-shrink-0 px-3 py-1 bg-red-600 text-white text-sm rounded-md flex items-center justify-center hover:bg-red-700 transition-colors"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                    </svg>
                                    保存
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={startTimeRecording}
                                    className="flex-shrink-0 px-3 py-1 bg-blue-600 text-white text-sm rounded-md flex items-center justify-center hover:bg-blue-700 transition-colors"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    開始
                                  </button>
                                )}
                                
                                {/* 記録情報ツールチップを横に移動 */}
                                <div className="relative group ml-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <ul className="list-disc pl-4 space-y-1">
                                      <li>開始時間・終了時間</li>
                                      <li>タスク名・ステータス</li>
                                      <li>クライアント情報</li>
                                      <li>決算期情報（該当する場合）</li>
                                    </ul>
                                    <div className="absolute top-full right-0 transform -translate-x-2 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* 2行目: 見積時間 */}
                              <div className="flex items-center space-x-3">
                                <div className="text-sm text-gray-700 flex items-center whitespace-nowrap w-28">
                                  <span className="font-medium">見積時間</span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Controller
                                    name="estimated_hours"
                                    control={control}
                                    render={({ field }) => (
                                      <input
                                        type="number"
                                        id="estimated_hours"
                                        step="0.5"
                                        min="0"
                                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 w-16 sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400"
                                        placeholder="時間"
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          handleFieldChange('estimated_hours', e.target.value);
                                        }}
                                      />
                                    )}
                                  />
                                  <span className="text-sm text-gray-500">時間</span>
                                </div>
                                
                                {timeEntry && timeEntry.start_time && isRecordingTime && (
                                  <span className="text-xs text-gray-500 ml-auto">
                                    開始: {new Date(timeEntry.start_time).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                              
                              {/* 作業時間履歴（折りたたみ式） */}
                              <div className="border-t border-gray-200 pt-4 mt-3">
                                {/* 折りたたみヘッダー */}
                                <div 
                                  className="flex items-center justify-between cursor-pointer" 
                                  onClick={() => {
                                    if (timeEntries.length > 0) {
                                      // 表示中の場合は折りたたむ
                                      setTimeEntries([]);
                                    } else {
                                      // 非表示の場合はキャッシュまたはAPIから取得して表示
                                      fetchTimeEntries().then(entries => {
                                        setTimeEntries(entries);
                                      });
                                    }
                                  }}
                                >
                                  <h4 className="text-sm font-medium text-gray-700">
                                    作業時間履歴 {cachedTimeEntries.length > 0 && `(${cachedTimeEntries.length}件)`}
                                  </h4>
                                  <button 
                                    type="button" 
                                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                    aria-expanded={timeEntries.length > 0}
                                  >
                                    {timeEntries.length > 0 ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                                
                                {/* 折りたたみコンテンツ */}
                                {isLoadingTimeEntries ? (
                                  <div className="text-center py-3">
                                    <div className="spinner-border w-6 h-6 border-2 rounded-full animate-spin border-b-transparent inline-block mr-2"></div>
                                    <span className="text-sm text-gray-600">読み込み中...</span>
                                  </div>
                                ) : timeEntries.length > 0 && (
                                  <div className="overflow-x-auto mt-2 transition-all duration-300 ease-in-out">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作業時間</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">説明</th>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {timeEntries.map(entry => (
                                          <tr key={entry.id} className="hover:bg-gray-50">
                                            {editingTimeEntry === entry.id ? (
                                              // 編集モード
                                              <>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  <input
                                                    type="datetime-local"
                                                    value={timeEntryForm.start_time}
                                                    onChange={(e) => setTimeEntryForm({...timeEntryForm, start_time: e.target.value})}
                                                    className="w-full text-sm border border-gray-300 rounded-sm px-2 py-1"
                                                  />
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  <input
                                                    type="datetime-local"
                                                    value={timeEntryForm.end_time}
                                                    onChange={(e) => setTimeEntryForm({...timeEntryForm, end_time: e.target.value})}
                                                    className="w-full text-sm border border-gray-300 rounded-sm px-2 py-1"
                                                  />
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  {/* 時間は自動計算 */}
                                                  {(() => {
                                                    const start = new Date(timeEntryForm.start_time);
                                                    const end = new Date(timeEntryForm.end_time);
                                                    const diffSeconds = Math.floor((end - start) / 1000);
                                                    if (isNaN(diffSeconds) || diffSeconds <= 0) return '-';
                                                    
                                                    const hours = Math.floor(diffSeconds / 3600);
                                                    const minutes = Math.floor((diffSeconds % 3600) / 60);
                                                    return `${hours}h ${minutes}m`;
                                                  })()}
                                                </td>
                                                <td className="px-3 py-2">
                                                  <input
                                                    type="text"
                                                    value={timeEntryForm.description}
                                                    onChange={(e) => setTimeEntryForm({...timeEntryForm, description: e.target.value})}
                                                    className="w-full text-sm border border-gray-300 rounded-sm px-2 py-1"
                                                    placeholder="説明"
                                                  />
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-right">
                                                  <button
                                                    type="button"
                                                    onClick={saveTimeEntryEdit}
                                                    className="text-blue-600 hover:text-blue-800 mr-2 text-xs"
                                                  >
                                                    保存
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={cancelEditingTimeEntry}
                                                    className="text-gray-600 hover:text-gray-800 text-xs"
                                                  >
                                                    キャンセル
                                                  </button>
                                                </td>
                                              </>
                                            ) : (
                                              // 表示モード
                                              <>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                                  {new Date(entry.start_time).toLocaleDateString()}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                                  {new Date(entry.start_time).toLocaleTimeString()} - {new Date(entry.end_time).toLocaleTimeString()}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                                  {(() => {
                                                    const seconds = entry.duration_seconds || 0;
                                                    const hours = Math.floor(seconds / 3600);
                                                    const minutes = Math.floor((seconds % 3600) / 60);
                                                    return `${hours}h ${minutes}m`;
                                                  })()}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-900 truncate max-w-[200px]">
                                                  {entry.description || '-'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                                                  <button
                                                    type="button"
                                                    onClick={() => startEditingTimeEntry(entry)}
                                                    className="text-blue-600 hover:text-blue-800 mr-2 text-xs"
                                                  >
                                                    編集
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => deleteTimeEntry(entry.id)}
                                                    className="text-red-600 hover:text-red-800 text-xs"
                                                  >
                                                    削除
                                                  </button>
                                                </td>
                                              </>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-sm text-gray-600 py-2">
                            タスクを保存すると作業時間の記録が可能になります
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 見積時間 - 削除 */}
                    
                    {/* タスク種別（決算期関連）セクションは削除 */}
                    
                    {/* 追加設定（繰り返し、テンプレート） */}
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-md font-medium text-gray-700 mb-3">追加設定</h3>
                      
                      {/* 繰り返しタスク設定 */}
                      <div className="mb-3">
                        <div className="flex items-center">
                          <Controller
                            name="is_recurring"
                            control={control}
                            render={({ field }) => (
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id="is_recurring"
                                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                  checked={field.value === 'true'}
                                  onChange={(e) => {
                                    const newValue = e.target.checked ? 'true' : 'false';
                                    field.onChange(newValue);
                                    handleFieldChange('is_recurring', newValue);
                                  }}
                                />
                                <label htmlFor="is_recurring" className="ml-2 block text-sm font-medium text-gray-700">
                                  繰り返しタスク
                                </label>
                              </div>
                            )}
                          />
                        </div>
                        
                        {/* 繰り返し設定（繰り返しの場合のみ表示） */}
                        {watchedIsRecurring === 'true' && (
                          <div className="ml-6 mt-2 space-y-3">
                            <div>
                              <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-gray-700">
                                繰り返しパターン
                              </label>
                              <div className="mt-1">
                                <Controller
                                  name="recurrence_pattern"
                                  control={control}
                                  render={({ field }) => (
                                    <select
                                      id="recurrence_pattern"
                                      className={selectClassName}
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleFieldChange('recurrence_pattern', e.target.value);
                                      }}
                                    >
                                      <option value="">選択してください</option>
                                      <option value="daily">毎日</option>
                                      <option value="weekly">毎週</option>
                                      <option value="monthly">毎月</option>
                                      <option value="yearly">毎年</option>
                                    </select>
                                  )}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700">
                                繰り返し終了日
                              </label>
                              <div className="mt-1">
                                <Controller
                                  name="recurrence_end_date"
                                  control={control}
                                  render={({ field }) => (
                                    <input
                                      type="date"
                                      id="recurrence_end_date"
                                      className={inputClassName}
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleFieldChange('recurrence_end_date', e.target.value);
                                      }}
                                    />
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* テンプレート設定 */}
                      <div className="mb-3">
                        <div className="flex items-center">
                          <Controller
                            name="is_template"
                            control={control}
                            render={({ field }) => (
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id="is_template"
                                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                  checked={field.value === 'true'}
                                  onChange={(e) => {
                                    const newValue = e.target.checked ? 'true' : 'false';
                                    field.onChange(newValue);
                                    handleFieldChange('is_template', newValue);
                                  }}
                                />
                                <label htmlFor="is_template" className="ml-2 block text-sm font-medium text-gray-700">
                                  テンプレートとして保存
                                </label>
                              </div>
                            )}
                          />
                        </div>
                        
                        {/* テンプレート名（テンプレートの場合のみ表示） */}
                        {watchedIsTemplate === 'true' && (
                          <div className="ml-6 mt-2">
                            <label htmlFor="template_name" className="block text-sm font-medium text-gray-700">
                              テンプレート名
                            </label>
                            <div className="mt-1">
                              <Controller
                                name="template_name"
                                control={control}
                                rules={{ required: watchedIsTemplate === 'true' ? 'テンプレート名は必須です' : false }}
                                render={({ field, fieldState }) => (
                                  <div>
                                    <input
                                      type="text"
                                      id="template_name"
                                      className={`${inputClassName} ${
                                        fieldState.error ? 'border-red-300' : ''
                                      }`}
                                      placeholder="テンプレート名を入力"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleFieldChange('template_name', e.target.value);
                                      }}
                                    />
                                    {fieldState.error && (
                                      <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>
                                    )}
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 開始日と完了日は上に移動したので削除 */}
                    </div>
                    
                    {/* タスクコメント（新規作成時は表示しない） */}
                    {!isNewTask && task && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-md font-medium text-gray-700 mb-3">コメント</h3>
                        {/* TaskCommentsコンポーネントをインポート */}
                        {task.id && (
                          <React.Suspense fallback={<div className="text-center py-4">コメントを読み込み中...</div>}>
                            {/* TaskCommentsコンポーネントの遅延ロード */}
                            {(() => {
                              const TaskComments = React.lazy(() => import('../../tasks/TaskComments'));
                              return <TaskComments taskId={task.id} task={task} onCommentAdded={() => {}} />;
                            })()}
                          </React.Suspense>
                        )}
                      </div>
                    )}

                    {/* タスク作成日時（新規作成時は表示しない） */}
                    {!isNewTask && task && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>作成日: {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}</span>
                          <span>更新日: {task.updated_at ? new Date(task.updated_at).toLocaleString() : '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </div>
              
              {/* フッター（保存ボタンと削除ボタン） */}
              <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 flex justify-between">
                {/* 左側：削除ボタン（新規作成時は非表示） */}
                <div>
                  {!isNewTask && task && (
                    <button
                      type="button"
                      className="bg-white py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={handleDeleteConfirm}
                    >
                      <HiOutlineTrash className="inline-block mr-1 -mt-1" />
                      削除
                    </button>
                  )}
                </div>
                
                {/* 右側：キャンセル・保存ボタン */}
                <div className="flex">
                  <button
                    type="button"
                    className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={onClose}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="bg-primary-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={handleSubmit(submitTask)}
                    disabled={saveState === 'saving'}
                  >
                    {saveState === 'saving' ? '保存中...' : isNewTask ? '作成' : '保存'}
                  </button>
                </div>
              </div>
              
              {/* 削除確認モーダル */}
              {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                  <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    {/* 背景オーバーレイ */}
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsDeleteModalOpen(false)}></div>
                    
                    {/* モーダルパネル */}
                    <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <HiExclamation className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                              タスクを削除
                            </h3>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                タスク「{task?.title}」を削除してもよろしいですか？この操作は取り消せません。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button 
                          type="button" 
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                          onClick={handleDeleteTask}
                          disabled={isDeleting}
                        >
                          {isDeleting ? '削除中...' : '削除する'}
                        </button>
                        <button 
                          type="button" 
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                          onClick={() => setIsDeleteModalOpen(false)}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskEditor;