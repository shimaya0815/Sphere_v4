import React, { useState, useEffect, useCallback } from 'react';
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
import toast from 'react-hot-toast';

// ユーティリティとフックのインポート
import { formatDateForInput, getRelativeDateDisplay } from './utils';
import { useTaskData, useTaskTimer } from './hooks';
import { prepareFormDataForSubmission, prepareTaskDataForForm } from './utils';

// 分割コンポーネントのインポート
import CurrentAssignee from './components/CurrentAssignee';
import TimeTracking from './components/TimeTracking';
import DeleteTaskModal from './components/DeleteTaskModal';
import TaskComments from '../TaskComments';

// セクションコンポーネントのインポート
import {
  TaskEditorHeader,
  TaskEditorFooter,
  TaskBasicInfoSection,
  TaskAssigneeSection,
  TaskDatePrioritySection,
  TaskDescriptionSection,
  TaskMetaInfoSection,
  TaskAdditionalSettingsSection,
  TaskRecurrenceSection
} from './components/sections';

/**
 * Asana風タスク編集コンポーネント
 * - 編集状態のリアルタイム監視
 * - 自動保存とバッチ処理
 * - 視覚的フィードバック強化
 */
const TaskEditor = ({ task, isNewTask = false, onClose, onTaskUpdated, isOpen = false }) => {
  // フォームのリセット状態を追跡するためのキー
  const [resetKey, setResetKey] = useState(Date.now());
  
  // UI状態管理
  const [isAssigneeExpanded, setIsAssigneeExpanded] = useState(false);
  const [isDateExpanded, setIsDateExpanded] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 共通スタイル
  const inputClassName = "shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400";
  const selectClassName = "shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400";
  
  // カスタムフックの利用
  const taskData = useTaskData(task, isNewTask, onTaskUpdated);
  const taskTimer = useTaskTimer(task?.id);

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
      is_fiscal_task: 'false',
      is_recurring: 'false',
      recurrence_pattern: '',
      recurrence_end_date: '',
      is_template: 'false', // 明示的にfalseを設定
      template_name: '',
      weekdays: ''
    },
  });
  
  // watchedの値を取得
  const watchedClient = watch('client');
  const watchedIsRecurring = watch('is_recurring');
  const watchedIsTemplate = watch('is_template');
  
  /**
   * isOpen状態の変化を監視してリセット処理
   */
  useEffect(() => {
    console.log("isOpen changed:", isOpen, "isNewTask:", isNewTask);
    if (isOpen) {
      // スライドオーバーが開く時
      if (isNewTask) {
        console.log("Resetting form for new task");
        // 新規タスク作成時はフォームを初期化
        reset({
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
          is_fiscal_task: 'false',
          is_recurring: 'false',
          recurrence_pattern: '',
          recurrence_end_date: '',
          is_template: 'false',
          template_name: '',
          weekdays: ''
        });
        // リセットキーを更新して強制的に再レンダリング
        setResetKey(Date.now());
        // その他の状態もリセット
        taskData.setPendingChanges({});
        taskData.setIsDirty(false);
        taskData.setSaveState('idle');
      }
    }
  }, [isOpen, isNewTask, reset, taskData]);
  
  /**
   * タスクデータの初期化
   */
  useEffect(() => {
    if (task && !isNewTask) {
      const formattedTask = prepareTaskDataForForm(task);
      
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
      
      // フォームの初期値を設定
      reset(formattedTask);
      
      // 時間記録中かどうかを確認
      taskTimer.checkActiveTimeEntry(formattedTask.id);
      
      // 時間エントリのリストを取得
      taskTimer.fetchTimeEntries();
    }
  }, [task, isNewTask, reset, taskTimer]);
  
  /**
   * 各種マスターデータの取得
   */
  useEffect(() => {
    const fetchMasterData = async () => {
      // ビジネスIDの取得
      await taskData.fetchBusinessData();
      
      // 各種マスターデータを取得
      Promise.all([
        taskData.fetchCategories(),
        taskData.fetchStatuses(),
        taskData.fetchPriorities(),
        taskData.fetchClients(),
        taskData.fetchUsers()
      ]);
    };

    fetchMasterData();
  }, [taskData]);
  
  /**
   * クライアントが変更された時に決算期一覧を取得
   */
  useEffect(() => {
    if (watchedClient) {
      taskData.fetchFiscalYears(watchedClient);
      
      // 選択されたクライアントのデータをセット
      const selectedClient = taskData.clients.find(c => c.id.toString() === watchedClient.toString());
      taskData.setSelectedClient(selectedClient);
    } else {
      taskData.setSelectedClient(null);
    }
  }, [watchedClient, taskData]);
  
  /**
   * タスク作成処理
   */
  const handleCreateTask = async (formData) => {
    // 保存用にデータを整形
    const preparedData = prepareFormDataForSubmission(formData);
    
    // タスク作成APIを呼び出し
    const newTask = await taskData.createTask(preparedData);
    
    // 成功したら閉じる
    if (newTask) {
      onClose();
    }
  };
  
  /**
   * フィールド変更時の処理
   */
  const handleFieldChange = (field, value) => {
    // フォームの値を更新
    setValue(field, value);
    
    // 既存タスクの場合は自動保存
    if (!isNewTask && task) {
      // APIに送信するデータを準備
      const changes = { [field]: value };
      
      // boolean型の場合は変換
      if (['is_fiscal_task', 'is_recurring', 'is_template'].includes(field)) {
        changes[field] = value === 'true';
      }
      
      // 空文字列はnullに変換
      if (value === '') {
        changes[field] = null;
      }
      
      // 変更を保存
      taskData.updateTask(task.id, changes);
    }
  };
  
  /**
   * タスク削除処理
   */
  const handleDeleteTask = async () => {
    if (!task || !task.id || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await taskData.deleteTask(task.id);
      toast.success('タスクを削除しました');
      
      // スライドオーバーを閉じて一覧を更新
      onClose();
      if (onTaskUpdated) {
        onTaskUpdated(null, true);  // 削除フラグを立てる
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('タスクの削除に失敗しました');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };
  
  /**
   * タスク完了トグル
   */
  const toggleTaskCompletion = async () => {
    if (!task || !task.id) return;
    
    // 完了ステータスのIDを取得
    const completedStatus = taskData.statuses.find(s => s.name === '完了');
    
    if (!completedStatus) {
      toast.error('完了ステータスが見つかりません');
      return;
    }
    
    // 現在完了状態かどうか
    const isCurrentlyCompleted = task.status === completedStatus.id;
    
    // 変更するステータス
    let newStatusId;
    let completedAt;
    
    if (isCurrentlyCompleted) {
      // 未着手ステータスに戻す
      const notStartedStatus = taskData.statuses.find(s => s.name === '未着手');
      newStatusId = notStartedStatus ? notStartedStatus.id : null;
      completedAt = null;
    } else {
      // 完了ステータスに変更
      newStatusId = completedStatus.id;
      completedAt = new Date().toISOString();
    }
    
    // ステータスと完了日時を更新
    const changes = {
      status: newStatusId,
      completed_at: completedAt
    };
    
    // 即時保存
    await taskData.updateTask(task.id, changes, true);
  };
  
  // スライドオーバーが表示されていない場合は何も表示しない
  if (!isOpen) return null;

  // スライドオーバーのスタイリング - 右側から表示されるよう修正
  return (
    <div className="fixed inset-0 overflow-hidden z-50" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* オーバーレイ背景 */}
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        {/* 右側からのスライドオーバーパネル */}
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto relative w-screen max-w-md">
            <div className="h-full flex flex-col bg-white shadow-xl overflow-hidden">
              {/* ヘッダー */}
              <TaskEditorHeader 
                isNewTask={isNewTask}
                onClose={onClose}
                saveState={taskData.saveState}
                toggleTaskCompletion={toggleTaskCompletion}
                isCompleted={task?.status === taskData.statuses.find(s => s.name === '完了')?.id}
              />
              
              {/* メインコンテンツ */}
              <div className="flex-1 overflow-y-auto p-4">
                {isNewTask ? (
                  // 新規作成フォーム
                  <form onSubmit={handleSubmit(handleCreateTask)}>
                    <TaskBasicInfoSection 
                      control={control}
                      inputClassName={inputClassName}
                      selectClassName={selectClassName}
                      categories={taskData.categories}
                      statuses={taskData.statuses}
                      handleFieldChange={handleFieldChange}
                      watch={watch}
                      formState={formState}
                    />
                    
                    <TaskAssigneeSection 
                      control={control}
                      users={taskData.users}
                      isExpanded={isAssigneeExpanded}
                      setIsExpanded={setIsAssigneeExpanded}
                      handleFieldChange={handleFieldChange}
                      selectClassName={selectClassName}
                      watch={watch}
                      formState={formState}
                    />
                    
                    <TaskDatePrioritySection 
                      control={control}
                      priorities={taskData.priorities}
                      isExpanded={isDateExpanded}
                      setIsExpanded={setIsDateExpanded}
                      handleFieldChange={handleFieldChange}
                      inputClassName={inputClassName}
                      selectClassName={selectClassName}
                      watch={watch}
                      formState={formState}
                    />
                    
                    <TaskDescriptionSection
                      control={control}
                      handleFieldChange={handleFieldChange}
                      inputClassName={inputClassName}
                      watch={watch}
                      formState={formState}
                    />
                    
                    <TaskAdditionalSettingsSection
                      control={control}
                      handleFieldChange={handleFieldChange}
                      clients={taskData.clients}
                      fiscalYears={taskData.fiscalYears}
                      watchedIsTemplate={watchedIsTemplate}
                      selectClassName={selectClassName}
                      inputClassName={inputClassName}
                      watch={watch}
                      formState={formState}
                    />
                    
                    {watchedIsRecurring === 'true' && (
                      <TaskRecurrenceSection
                        control={control}
                        handleFieldChange={handleFieldChange}
                        inputClassName={inputClassName}
                        selectClassName={selectClassName}
                        watch={watch}
                        formState={formState}
                      />
                    )}
                    
                    <div className="mt-8 flex justify-end">
                      <button
                        type="button"
                        className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        onClick={onClose}
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        作成
                      </button>
                    </div>
                  </form>
                ) : (
                  // 既存タスク編集フォーム
                  <>
                    <TaskBasicInfoSection 
                      control={control}
                      inputClassName={inputClassName}
                      selectClassName={selectClassName}
                      categories={taskData.categories}
                      statuses={taskData.statuses}
                      handleFieldChange={handleFieldChange}
                      watch={watch}
                      formState={formState}
                    />
                    
                    <TaskAssigneeSection 
                      control={control}
                      users={taskData.users}
                      isExpanded={isAssigneeExpanded}
                      setIsExpanded={setIsAssigneeExpanded}
                      handleFieldChange={handleFieldChange}
                      selectClassName={selectClassName}
                      watch={watch}
                      formState={formState}
                    />
                    
                    <TaskDatePrioritySection 
                      control={control}
                      priorities={taskData.priorities}
                      isExpanded={isDateExpanded}
                      setIsExpanded={setIsDateExpanded}
                      handleFieldChange={handleFieldChange}
                      inputClassName={inputClassName}
                      selectClassName={selectClassName}
                      watch={watch}
                      formState={formState}
                    />
                    
                    <TaskDescriptionSection
                      control={control}
                      handleFieldChange={handleFieldChange}
                      inputClassName={inputClassName}
                      watch={watch}
                      formState={formState}
                    />
                    
                    <TaskAdditionalSettingsSection
                      control={control}
                      handleFieldChange={handleFieldChange}
                      clients={taskData.clients}
                      fiscalYears={taskData.fiscalYears}
                      watchedIsTemplate={watchedIsTemplate}
                      selectClassName={selectClassName}
                      inputClassName={inputClassName}
                      watch={watch}
                      formState={formState}
                    />
                    
                    {watchedIsRecurring === 'true' && (
                      <TaskRecurrenceSection
                        control={control}
                        handleFieldChange={handleFieldChange}
                        inputClassName={inputClassName}
                        selectClassName={selectClassName}
                        watch={watch}
                        formState={formState}
                      />
                    )}
                    
                    {/* 時間計測セクション */}
                    <div className="mt-5">
                      <TimeTracking
                        taskId={task?.id}
                        isRecordingTime={taskTimer.isRecordingTime}
                        elapsedTime={taskTimer.elapsedTime}
                        startTime={taskTimer.startTime}
                        timeEntries={taskTimer.cachedTimeEntries}
                        isLoadingTimeEntries={taskTimer.isLoadingTimeEntries}
                        editingTimeEntry={taskTimer.editingTimeEntry}
                        setEditingTimeEntry={taskTimer.setEditingTimeEntry}
                        timeEntryForm={taskTimer.timeEntryForm}
                        setTimeEntryForm={taskTimer.setTimeEntryForm}
                        onStart={taskTimer.startTimer}
                        onStop={taskTimer.stopTimer}
                        onDelete={taskTimer.deleteTimeEntry}
                        onRefresh={taskTimer.fetchTimeEntries}
                      />
                    </div>
                    
                    {/* コメントセクション */}
                    <div className="mt-5">
                      <TaskComments taskId={task?.id} />
                    </div>
                    
                    {/* メタ情報 */}
                    <TaskMetaInfoSection task={task} />
                    
                    {/* 削除ボタン */}
                    <div className="mt-8 border-t pt-4">
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={() => setIsDeleteModalOpen(true)}
                      >
                        <HiOutlineTrash className="-ml-0.5 mr-2 h-4 w-4" />
                        タスクを削除
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              {/* フッター */}
              {!isNewTask && (
                <TaskEditorFooter 
                  saveState={taskData.saveState}
                  handleSubmit={handleSubmit}
                  submitTask={handleCreateTask}
                  onClose={onClose}
                  task={task}
                  isNewTask={isNewTask}
                />
              )}
              
              {/* 削除確認モーダル */}
              <DeleteTaskModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onDelete={handleDeleteTask}
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