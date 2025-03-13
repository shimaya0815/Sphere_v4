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

// 分割コンポーネントのインポート
import CurrentAssignee from './components/CurrentAssignee';
import TimeTracking from './components/TimeTracking';
import DeleteTaskModal from './components/DeleteTaskModal';

// セクションコンポーネントのインポート
import {
  TaskEditorHeader,
  TaskEditorFooter,
  TaskBasicInfoSection,
  TaskAssigneeSection,
  TaskDatePrioritySection,
  TaskDescriptionSection,
  TaskMetaInfoSection,
  TaskAdditionalSettingsSection
} from './components/sections';

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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timerIntervalId, setTimerIntervalId] = useState(null);
  const [cachedTimeEntries, setCachedTimeEntries] = useState([]);  // 必ず空配列で初期化
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState(null);
  const [timeEntryForm, setTimeEntryForm] = useState({
    start_time: '',
    end_time: '',
    description: '',
    duration_seconds: 0
  });
  
  // 保存状態管理
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle, saving, saved, error
  const [pendingChanges, setPendingChanges] = useState({});
  const saveTimerRef = useRef(null);

  // フォーム管理
  const { control, handleSubmit, reset, setValue, getValues, watch, formState } = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: '',
      category: '',
      client: '',
      fiscal_year: '',
      worker: '',
      reviewer: '',
      due_date: '',
      start_date: '',
      completed_at: '',
      priority: '',
      priority_value: '',
      is_fiscal_task: '',
      is_recurring: '',
      recurrence_pattern: '',
      recurrence_end_date: '',
      is_template: '',
      template_name: ''
    },
  });
  
  // watchedの値を取得
  const watchedClient = watch('client');
  const watchedIsRecurring = watch('is_recurring');
  const watchedIsTemplate = watch('is_template');
  
  /**
   * タスクデータの初期化
   */
  useEffect(() => {
    if (task && !isNewTask) {
      const formattedTask = { ...task };
      // 日付フィールドの変換
      if (formattedTask.due_date) {
        formattedTask.due_date = formatDateForInput(formattedTask.due_date);
      }
      if (formattedTask.start_date) {
        formattedTask.start_date = formatDateForInput(formattedTask.start_date);
      }
      if (formattedTask.completed_at) {
        formattedTask.completed_at = formatDateForInput(formattedTask.completed_at);
      }
      if (formattedTask.recurrence_end_date) {
        formattedTask.recurrence_end_date = formatDateForInput(formattedTask.recurrence_end_date);
      }
      
      // boolean値を文字列に変換（フォームコントロールの互換性のため）
      if (formattedTask.is_fiscal_task !== undefined) {
        formattedTask.is_fiscal_task = formattedTask.is_fiscal_task ? 'true' : 'false';
      }
      if (formattedTask.is_recurring !== undefined) {
        formattedTask.is_recurring = formattedTask.is_recurring ? 'true' : 'false';
      }
      if (formattedTask.is_template !== undefined) {
        formattedTask.is_template = formattedTask.is_template ? 'true' : 'false';
      }
      
      // 優先度の数値設定
      if (formattedTask.priority) {
        formattedTask.priority_value = formattedTask.priority_value || '';
      }
      
      Object.keys(formattedTask).forEach(key => {
        if (formattedTask[key] === null) {
          formattedTask[key] = '';
        }
      });
      
      // フォームの初期値を設定
      reset(formattedTask);
      
      // 時間記録中かどうかを確認
      checkActiveTimeEntry(formattedTask.id);
      
      // 時間エントリのリストを取得
      fetchTimeEntries();
    }
  }, [task, isNewTask, reset]);
  
  /**
   * 各種マスターデータの取得
   */
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        // ビジネスIDを取得
        const profileResponse = await usersApi.getProfile();
        if (profileResponse.data && profileResponse.data.business) {
          setBusinessId(profileResponse.data.business.id);
        }
        
        // ステータス一覧を取得
        const statusesResponse = await tasksApi.getStatuses();
        setStatuses(statusesResponse.data);
        
        // カテゴリー一覧を取得
        const categoriesResponse = await tasksApi.getCategories();
        setCategories(categoriesResponse.data);
        
        // 優先度一覧を取得
        const prioritiesResponse = await tasksApi.getPriorities();
        setPriorities(prioritiesResponse.data);
        
        // クライアント一覧を取得
        const clientsResponse = await clientsApi.getClients();
        setClients(clientsResponse.data);
        
        // 決算期一覧を取得
        const fiscalYearsResponse = await clientsApi.getFiscalYears();
        setFiscalYears(fiscalYearsResponse.data);
        
        // ユーザー一覧を取得
        const usersResponse = await usersApi.getUsers();
        setUsers(usersResponse.data);
      } catch (error) {
        console.error('Error fetching master data:', error);
        toast.error('マスターデータの取得に失敗しました');
      }
    };
    
    fetchMasterData();
  }, []);
  
  /**
   * クライアント変更時の処理
   */
  useEffect(() => {
    if (watchedClient) {
      const clientId = parseInt(watchedClient);
      setSelectedClient(clientId);
    } else {
      setSelectedClient(null);
    }
  }, [watchedClient]);
  
  /**
   * 保存処理をバッチでまとめる
   */
  const debounceSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(() => {
      if (Object.keys(pendingChanges).length > 0 && !isNewTask && task) {
        saveChanges();
      }
    }, 1000);
  }, [pendingChanges, isNewTask, task]);
  
  /**
   * フィールド変更時の処理
   */
  const handleFieldChange = (fieldName, value) => {
    setIsDirty(true);
    
    if (!isNewTask && task) {
      setPendingChanges(prev => ({
        ...prev,
        [fieldName]: value,
      }));
      
      debounceSave();
    }
  };
  
  /**
   * 保存処理
   */
  const saveChanges = async () => {
    if (!isNewTask && task && Object.keys(pendingChanges).length > 0) {
      setSaveState('saving');
      
      try {
        const updateData = { ...pendingChanges };
        
        // boolean値の変換
        if ('is_fiscal_task' in updateData) {
          updateData.is_fiscal_task = updateData.is_fiscal_task === 'true';
        }
        if ('is_recurring' in updateData) {
          updateData.is_recurring = updateData.is_recurring === 'true';
        }
        if ('is_template' in updateData) {
          updateData.is_template = updateData.is_template === 'true';
        }
        
        // タスク更新処理
        await tasksApi.updateTask(task.id, updateData);
        
        // 状態をリセット
        setPendingChanges({});
        setIsDirty(false);
        setSaveState('saved');
        
        // 3秒後に保存状態表示をクリア
        setTimeout(() => {
          if (setSaveState) setSaveState('idle');
        }, 3000);
        
        // 親コンポーネントに通知
        if (onTaskUpdated) {
          onTaskUpdated();
        }
      } catch (error) {
        console.error('Error saving task:', error);
        setSaveState('error');
        toast.error('タスクの保存に失敗しました');
      }
    }
  };
  
  /**
   * タスク新規作成/更新処理
   */
  const submitTask = async (data) => {
    setSaveState('saving');
    
    try {
      const submitData = { ...data };
      
      // boolean値の変換
      if ('is_fiscal_task' in submitData) {
        submitData.is_fiscal_task = submitData.is_fiscal_task === 'true';
      }
      if ('is_recurring' in submitData) {
        submitData.is_recurring = submitData.is_recurring === 'true';
      }
      if ('is_template' in submitData) {
        submitData.is_template = submitData.is_template === 'true';
      }
      
      // 数値に変換
      if (submitData.worker) submitData.worker = parseInt(submitData.worker);
      if (submitData.reviewer) submitData.reviewer = parseInt(submitData.reviewer);
      if (submitData.status) submitData.status = parseInt(submitData.status);
      if (submitData.category) submitData.category = parseInt(submitData.category);
      if (submitData.client) submitData.client = parseInt(submitData.client);
      if (submitData.fiscal_year) submitData.fiscal_year = parseInt(submitData.fiscal_year);
      if (submitData.priority) submitData.priority = parseInt(submitData.priority);
      if (submitData.priority_value) submitData.priority_value = parseInt(submitData.priority_value);
      
      // ビジネスIDの設定
      if (businessId) {
        submitData.business = businessId;
      }
      
      let response;
      if (isNewTask) {
        // 新規作成
        response = await tasksApi.createTask(submitData);
        toast.success('タスクを作成しました');
      } else {
        // 更新
        response = await tasksApi.updateTask(task.id, submitData);
        toast.success('タスクを保存しました');
      }
      
      // 状態をリセット
      setPendingChanges({});
      setIsDirty(false);
      setSaveState('saved');
      
      // 親コンポーネントに通知
      if (onTaskUpdated) {
        onTaskUpdated(response.data);
      }
      
      // 作成後は閉じる
      if (isNewTask) {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      setSaveState('error');
      toast.error('タスクの保存に失敗しました');
    }
  };
  
  /**
   * 削除確認モーダルを表示
   */
  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(true);
  };
  
  /**
   * タスク削除処理
   */
  const handleDeleteTask = async () => {
    if (!task || !task.id) return;
    
    setIsDeleting(true);
    
    try {
      await tasksApi.deleteTask(task.id);
      setIsDeleteModalOpen(false);
      
      // 親コンポーネントに通知
      if (onTaskUpdated) {
        onTaskUpdated(null, true);
      }
      
      toast.success('タスクを削除しました');
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('タスクの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };
  
  /**
   * タスクの時間記録を開始
   */
  const startTimeRecording = async () => {
    if (!task || !task.id) return;
    
    try {
      const response = await timeManagementApi.startTimeEntry(task.id);
      setTimeEntry(response.data);
      setIsRecordingTime(true);
      setStartTime(new Date());
      
      // タイマーのスタート
      const intervalId = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      setTimerIntervalId(intervalId);
      toast.success('時間記録を開始しました');
    } catch (error) {
      console.error('Error starting time entry:', error);
      toast.error('時間記録の開始に失敗しました');
    }
  };
  
  /**
   * タスクの時間記録を停止
   */
  const stopTimeRecording = async () => {
    if (!task || !task.id || !timeEntry) return;
    
    try {
      await timeManagementApi.stopTimeEntry(timeEntry.id);
      setIsRecordingTime(false);
      setElapsedTime(0);
      
      // タイマーの停止
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
      
      // キャッシュをクリアして時間エントリリストを更新
      setCachedTimeEntries([]);
      fetchTimeEntries();
      
      toast.success('時間記録を停止しました');
    } catch (error) {
      console.error('Error stopping time entry:', error);
      toast.error('時間記録の停止に失敗しました');
    }
  };
  
  /**
   * アクティブな時間エントリを確認
   */
  const checkActiveTimeEntry = async (taskId) => {
    if (!taskId) return;
    
    try {
      const response = await timeManagementApi.getActiveTimeEntry(taskId);
      if (response.data && response.data.id) {
        setTimeEntry(response.data);
        setIsRecordingTime(true);
        
        // 開始時間からの経過時間を計算
        const startTime = new Date(response.data.start_time);
        const now = new Date();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsedSeconds);
        
        // タイマーのスタート
        const intervalId = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
        
        setTimerIntervalId(intervalId);
      }
    } catch (error) {
      console.error('Error checking active time entry:', error);
    }
  };
  
  /**
   * タイマーのクリーンアップ
   */
  useEffect(() => {
    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    };
  }, [timerIntervalId]);
  
  /**
   * 時間エントリのリストを取得
   */
  const fetchTimeEntries = async () => {
    if (!task || !task.id) return;
    
    // キャッシュがあれば使用
    if (cachedTimeEntries && cachedTimeEntries.length > 0) {
      return;
    }
    
    setIsLoadingTimeEntries(true);
    
    try {
      const response = await timeManagementApi.getTimeEntries(task.id);
      setCachedTimeEntries(response.data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast.error('時間記録の取得に失敗しました');
      // エラー時は空の配列を設定して、以降のエラーを防止
      setCachedTimeEntries([]);
    } finally {
      setIsLoadingTimeEntries(false);
    }
  };
  
  /**
   * 時間エントリの編集を開始
   */
  const startEditingTimeEntry = (entry) => {
    setEditingTimeEntry(entry.id);
    
    // フォームに値をセット
    setTimeEntryForm({
      start_time: entry.start_time,
      end_time: entry.end_time || '',
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
  
  /**
   * 日付フォーマット変換（YYYY-MM-DD形式に）
   */
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
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
              <TaskEditorHeader 
                isNewTask={isNewTask}
                onClose={onClose}
                saveState={saveState}
                isDirty={isDirty}
                saveChanges={saveChanges}
              />
              
              {/* フォーム本体 */}
              <div className="flex-1 py-6 px-4 sm:px-6 overflow-auto">
                <form onSubmit={handleSubmit(submitTask)}>
                  <div className="space-y-6">
                    <TaskBasicInfoSection 
                      control={control}
                      statuses={statuses}
                      categories={categories}
                      clients={clients}
                      fiscalYears={fiscalYears}
                      formState={formState}
                      handleFieldChange={handleFieldChange}
                      watch={watch}
                    />
                    
                    <TaskAssigneeSection 
                      task={task}
                      users={users}
                      control={control}
                      handleFieldChange={handleFieldChange}
                      formState={formState}
                      watch={watch}
                    />
                    
                    <TaskDatePrioritySection 
                      control={control}
                      priorities={priorities}
                      handleFieldChange={handleFieldChange}
                      formState={formState}
                      watch={watch}
                    />
                    
                    <TaskDescriptionSection 
                      control={control}
                      handleFieldChange={handleFieldChange}
                    />
                    
                    {/* 作業時間記録セクション - コンポーネント化 */}
                    {!isNewTask && task && (
                      <TimeTracking 
                        task={task}
                        isRecordingTime={isRecordingTime}
                        timeEntry={timeEntry}
                        elapsedTime={elapsedTime}
                        cachedTimeEntries={cachedTimeEntries}
                        isLoadingTimeEntries={isLoadingTimeEntries}
                        editingTimeEntry={editingTimeEntry}
                        timeEntryForm={timeEntryForm}
                        startTimeRecording={startTimeRecording}
                        stopTimeRecording={stopTimeRecording}
                        startEditingTimeEntry={startEditingTimeEntry}
                        cancelEditingTimeEntry={cancelEditingTimeEntry}
                        saveTimeEntryEdit={saveTimeEntryEdit}
                        deleteTimeEntry={deleteTimeEntry}
                        setTimeEntryForm={setTimeEntryForm}
                      />
                    )}
                    
                    {/* 見積時間 - 削除 */}
                    
                    {/* タスク種別（決算期関連）セクションは削除 */}
                    
                    <TaskAdditionalSettingsSection 
                      control={control}
                      handleFieldChange={handleFieldChange}
                      isNewTask={isNewTask}
                      watch={watch}
                    />
                    
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
                      <TaskMetaInfoSection task={task} />
                    )}
                  </div>
                </form>
              </div>
              
              {/* フッター（保存ボタンと削除ボタン） */}
              <TaskEditorFooter
                isNewTask={isNewTask}
                task={task}
                onClose={onClose}
                handleSubmit={handleSubmit}
                submitTask={submitTask}
                saveState={saveState}
                handleDeleteConfirm={handleDeleteConfirm}
              />
              
              {/* 削除確認モーダル */}
              <DeleteTaskModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTask}
                isDeleting={isDeleting}
                taskTitle={task?.title}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskEditor;