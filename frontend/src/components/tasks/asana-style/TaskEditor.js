import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { HiOutlineX, HiCheck, HiOutlineClock, HiUser, HiUserGroup } from 'react-icons/hi';
import { tasksApi, clientsApi, usersApi, businessApi } from '../../../api';
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
  const [isFiscalTask, setIsFiscalTask] = useState(false);
  
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
  const watchedIsFiscalTask = watch('is_fiscal_task');
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
  
  // タスク情報設定
  useEffect(() => {
    if (!task && !isNewTask) return;
    
    const setupTaskForm = () => {
      if (isNewTask) {
        // 新規タスクの場合のデフォルト値
        const defaultValues = {
          title: '',
          description: '',
          status: statuses[0]?.id.toString() || '',
          priority: priorities[0]?.id.toString() || '',
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
          priority: getIdAsString(task.priority_data?.id || task.priority),
          category: getIdAsString(task.category_data?.id || task.category),
          client: getIdAsString(task.client_data?.id || task.client),
          worker: getIdAsString(task.worker_data?.id || task.worker),
          reviewer: getIdAsString(task.reviewer_data?.id || task.reviewer),
          due_date: task.due_date ? task.due_date.substring(0, 10) : '',
          estimated_hours: task.estimated_hours || '',
          is_fiscal_task: task.is_fiscal_task ? 'true' : 'false',
          fiscal_year: getIdAsString(task.fiscal_year_data?.id || task.fiscal_year),
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
        setIsFiscalTask(task.is_fiscal_task);
        
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
    if (statuses.length > 0 && priorities.length > 0) {
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
  
  // 決算期タスクフラグ監視
  useEffect(() => {
    setIsFiscalTask(watchedIsFiscalTask === 'true');
  }, [watchedIsFiscalTask]);
  
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
      
      // データフォーマット
      const formattedData = formatDataForApi(formData);
      
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
   * タスク作成・保存（フォーム送信）
   */
  const submitTask = async (data) => {
    try {
      setSaveState('saving');
      
      // データフォーマット
      const formattedData = formatDataForApi(data);
      
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
  const formatDataForApi = (data) => {
    return {
      ...data,
      // 数値変換
      status: data.status ? parseInt(data.status, 10) : null,
      priority: data.priority ? parseInt(data.priority, 10) : null,
      category: data.category ? parseInt(data.category, 10) : null,
      client: data.client ? parseInt(data.client, 10) : null,
      worker: data.worker ? parseInt(data.worker, 10) : null,
      reviewer: data.reviewer ? parseInt(data.reviewer, 10) : null,
      fiscal_year: data.fiscal_year ? parseInt(data.fiscal_year, 10) : null,
      
      // 真偽値変換
      is_fiscal_task: data.is_fiscal_task === 'true',
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
          <div className="relative w-screen max-w-lg transform transition ease-in-out duration-300">
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
                    {/* タイトル */}
                    <div>
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
                                className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
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
                    
                    {/* 説明 */}
                    <div>
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
                              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    
                    {/* ステータスと優先度 */}
                    <div className="grid grid-cols-2 gap-6">
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
                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                      
                      <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                          優先度
                        </label>
                        <div className="mt-1">
                          <Controller
                            name="priority"
                            control={control}
                            render={({ field }) => (
                              <select
                                id="priority"
                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleFieldChange('priority', e.target.value);
                                }}
                              >
                                <option value="">選択してください</option>
                                {priorities.map((priority) => (
                                  <option key={priority.id} value={priority.id}>
                                    {priority.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* カテゴリーと期限日 */}
                    <div className="grid grid-cols-2 gap-6">
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
                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    </div>
                    
                    {/* 見積時間 */}
                    <div>
                      <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700">
                        見積時間（時間）
                      </label>
                      <div className="mt-1">
                        <Controller
                          name="estimated_hours"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="number"
                              id="estimated_hours"
                              step="0.5"
                              min="0"
                              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="例: 2.5"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                handleFieldChange('estimated_hours', e.target.value);
                              }}
                            />
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
                              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                      
                      {/* 選択中のクライアント情報 */}
                      {selectedClient && (
                        <div className="mt-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="text-sm space-y-1">
                            <div className="bg-white p-2 rounded mb-1">
                              <span className="font-medium">クライアント名:</span> {selectedClient.name}
                            </div>
                            <div className="bg-white p-2 rounded mb-1">
                              <span className="font-medium">契約状況:</span>{' '}
                              {selectedClient.contract_status_display || selectedClient.contract_status}
                            </div>
                            {selectedClient.fiscal_year && (
                              <div className="bg-white p-2 rounded">
                                <span className="font-medium">現在の決算期:</span> 第{selectedClient.fiscal_year}期
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 担当者設定セクション */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                        <HiUserGroup className="mr-2 text-gray-500" />
                        担当者設定
                      </h3>
                      
                      {/* 作業者とレビュー担当者 */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* 作業者 */}
                        <div>
                          <label htmlFor="worker" className="block text-sm font-medium text-gray-700">
                            作業担当者
                          </label>
                          <div className="mt-1">
                            <Controller
                              name="worker"
                              control={control}
                              render={({ field }) => (
                                <select
                                  id="worker"
                                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                        <div>
                          <label htmlFor="reviewer" className="block text-sm font-medium text-gray-700">
                            レビュー担当者
                          </label>
                          <div className="mt-1">
                            <Controller
                              name="reviewer"
                              control={control}
                              render={({ field }) => (
                                <select
                                  id="reviewer"
                                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                      
                      <p className="mt-2 text-sm text-gray-500">
                        <span className="text-amber-600 font-medium">注意:</span> タスクのステータスによって担当者は自動的に切り替わります。
                        作業者ステータスでは作業担当者が、レビューステータスではレビュー担当者が担当になります。
                      </p>
                    </div>
                    
                    {/* タスク種別（決算期関連） */}
                    <div>
                      <div className="flex items-center">
                        <Controller
                          name="is_fiscal_task"
                          control={control}
                          render={({ field }) => (
                            <div className="flex items-center">
                              <select
                                id="is_fiscal_task"
                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleFieldChange('is_fiscal_task', e.target.value);
                                }}
                                disabled={!watchedClient}
                              >
                                <option value="false">通常タスク</option>
                                <option value="true">決算期関連タスク</option>
                              </select>
                            </div>
                          )}
                        />
                      </div>
                      
                      {/* 決算期選択（決算期タスクの場合のみ表示） */}
                      {isFiscalTask && watchedClient && (
                        <div className="mt-2">
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
                                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleFieldChange('fiscal_year', e.target.value);
                                  }}
                                >
                                  <option value="">選択してください</option>
                                  {fiscalYears.map((fiscalYear) => (
                                    <option key={fiscalYear.id} value={fiscalYear.id}>
                                      第{fiscalYear.fiscal_period}期 (
                                      {new Date(fiscalYear.start_date).toLocaleDateString()} 〜 
                                      {new Date(fiscalYear.end_date).toLocaleDateString()})
                                    </option>
                                  ))}
                                </select>
                              )}
                            />
                          </div>
                          
                          {fiscalYears.length === 0 && (
                            <p className="mt-1 text-sm text-amber-600">
                              選択したクライアントに決算期情報が登録されていません。
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
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
                                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                                      className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
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
                      
                      {/* 開始日と完了日 */}
                      <div className="grid grid-cols-2 gap-4">
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
                                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    </div>
                    
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
              
              {/* フッター（保存ボタン） */}
              <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 flex justify-end">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskEditor;