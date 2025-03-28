import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../../../hooks/useTasks';
import { TaskFormProvider, useTaskFormContext } from './hooks/useTaskForm';
import TaskForm from './TaskForm';
import StatusSelector from './StatusSelector';
import TimeTracking from './components/TimeTracking';
// エラーになるコンポーネントを一時的にコメントアウト
import Comments from '../../tasks/TaskComments';
import Attachments from '../../tasks/Attachments';
import { useTaskTimer } from './hooks/useTaskTimer';
import { formatDistanceToNow, parseISO } from 'date-fns';
import TaskTitleEditor from '../TaskTitleEditor';
// react-loading-skeletonを一時的にモックアップ
// import Skeleton from 'react-loading-skeleton';
// import 'react-loading-skeleton/dist/skeleton.css';
import { MdArrowBack } from 'react-icons/md';
// framer-motionを一時的にモックアップ
// import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { 
  HiOutlineX, 
  HiCheck, 
  HiOutlineClock, 
  HiUser, 
  HiUserGroup, 
  HiOutlineTrash, 
  HiExclamation,
  HiOutlineCalendar,
  HiOutlineTag,
  HiOutlineRefresh
} from 'react-icons/hi';
import { tasksApi } from '../../../api';
import { clientsApi } from '../../../api';
import { usersApi } from '../../../api';
// ユーティリティとフックのインポート
import { formatDateForInput, getRelativeDateDisplay } from './utils';
import { useTaskData } from './hooks';
import { prepareFormDataForSubmission, prepareTaskDataForForm } from './utils';
// 分割コンポーネントのインポート
import CurrentAssignee from './components/CurrentAssignee';
import DeleteTaskModal from './components/DeleteTaskModal';
// import TaskComments from '../TaskComments';

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

// Skeletonコンポーネントのダミー実装
const Skeleton = ({ height, width, count = 1 }) => {
  const elements = [];
  for (let i = 0; i < count; i++) {
    elements.push(
      <div 
        key={i}
        style={{ 
          height: height || 20, 
          width: width || '100%', 
          backgroundColor: '#f0f0f0',
          marginBottom: '8px',
          borderRadius: '4px'
        }}
      />
    );
  }
  return <>{elements}</>;
};

// motionのダミー実装
const motion = {
  div: ({ children, ...props }) => <div {...props}>{children}</div>
};

// 一時的なダミーコンポーネント
// const Comments = ({ taskId }) => (
//   <div>コメント機能は現在開発中です。タスクID: {taskId}</div>
// );

// const Attachments = ({ taskId }) => (
//   <div>添付ファイル機能は現在開発中です。タスクID: {taskId}</div>
// );

/**
 * Asana風タスク編集コンポーネント
 * - 編集状態のリアルタイム監視
 * - 自動保存とバッチ処理
 * - 視覚的フィードバック強化
 */
const TaskEditor = ({ 
  isOpen = false, 
  isNewTask = false, 
  task: taskData = null, 
  onClose = null, 
  onTaskUpdated = null 
}) => {
  const { taskId: urlTaskId } = useParams();
  const navigate = useNavigate();
  const initialData = taskData;
  const taskId = initialData?.id || urlTaskId;
  const isNew = isNewTask;
  const { 
    getTask, 
    updateTask,
    debouncedUpdateTask, 
    createTask, 
    isLoading: isTaskLoading,
    tasks
  } = useTasks();
  
  // フォームコンテキストを使用（必要な場合）
  const formContext = useTaskFormContext();
  
  // データ取得用ステート
  const [statuses, setStatuses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [priorities, setPriorities] = useState([]);
  
  // タスクデータの初期化
  const [task, setTask] = useState(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef(null);
  
  // データの初期ロード
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // 実際のAPIからデータを取得
        console.log('TaskEditor: Fetching metadata including users');
        const [statusesData, categoriesData, clientsData, usersData, prioritiesData] = await Promise.all([
          tasksApi.getStatuses(),
          tasksApi.getCategories(),
          clientsApi.getClients(),
          usersApi.getAvailableWorkers(),
          tasksApi.getPriorities()
        ]);
        
        setStatuses(Array.isArray(statusesData) ? statusesData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        
        // clientsDataの処理 - レスポンス構造が異なる可能性を考慮
        if (clientsData && clientsData.results && Array.isArray(clientsData.results)) {
          setClients(clientsData.results);
        } else if (Array.isArray(clientsData)) {
          setClients(clientsData);
        } else {
          console.warn('Unexpected clients data format:', clientsData);
          setClients([]);
        }
        
        // ユーザーデータの処理
        console.log('Users data received:', usersData);
        if (Array.isArray(usersData)) {
          console.log(`Setting ${usersData.length} users`);
          setUsers(usersData);
        } else if (usersData && Array.isArray(usersData.results)) {
          console.log(`Setting ${usersData.results.length} users from results property`);
          setUsers(usersData.results);
        } else {
          console.warn('Unexpected users data format:', usersData);
          setUsers([]);
        }
        
        setPriorities(Array.isArray(prioritiesData) ? prioritiesData : []);
        
        // ワークスペースデータを設定（モックデータ）
        setWorkspaces([
          { id: 1, name: 'デフォルトワークスペース' }
        ]);
        
        // クライアントが選択されている場合は決算期も取得
        if (task?.client) {
          const fiscalYearsData = await clientsApi.getFiscalYears(task.client);
          setFiscalYears(Array.isArray(fiscalYearsData) ? fiscalYearsData : []);
        }
      } catch (error) {
        console.error('メタデータの取得に失敗しました:', error);
        toast.error('データの読み込みに失敗しました');
      }
    };
    
    fetchMetadata();
  }, [task?.client]);
  
  // タスクIDを決定（URL、初期データ、または新規タスク用のnull）
  const resolvedTaskId = useMemo(() => {
    if (!isNew) {
      return taskId || (initialData && initialData.id) || null;
    }
    return null;
  }, [isNew, taskId, initialData]);
  
  // タスクフォームのコンテキスト参照
  const taskFormRef = useRef(null);
  
  // タスクが読み込まれているかチェック
  const isTaskLoaded = useMemo(() => !isNew && task && task.id, [isNew, task]);
  
  // タスクタイマーを初期化
  const {
    isRecordingTime,
    elapsedTime,
    startTime,
    timeEntry,
    cachedTimeEntries,
    isLoading: isTimerLoading,
    isLoadingEntries,
    startTimer,
    stopTimer,
    fetchTimeEntries
  } = useTaskTimer(task?.id);
  
  // タスクのタイムエントリを初期読み込み
  useEffect(() => {
    if (task?.id && isTaskLoaded) {
      fetchTimeEntries();
    }
  }, [task?.id, isTaskLoaded, fetchTimeEntries]);
  
  // タスクを読み込む
  const loadTask = useCallback(async () => {
    if (isNew) {
      // 新規タスクの場合は空のタスクデータをセット
      // ステータスはIDを使用する必要があるため、ロード済みのstatusesから取得
      const defaultStatus = statuses && statuses.length > 0 ? statuses[0].id : null;
      const defaultPriority = priorities && priorities.length > 0 ? priorities[0].id : null;
      // デフォルトワークスペースのIDを設定（確実に存在する場合はデフォルトワークスペースを選択）
      const defaultWorkspace = workspaces && workspaces.length > 0 
        ? (workspaces.find(w => w.name === 'デフォルトワークスペース')?.id || workspaces[0].id) 
        : null;
      
      setTask({
        title: '',
        description: '',
        status: defaultStatus,
        priority: defaultPriority,
        due_date: null,
        assigned_to: null,
        category: null,
        workspace: defaultWorkspace // デフォルトワークスペースを設定
      });
      setIsLoading(false);
      return;
    }
    
    if (!resolvedTaskId) return;
    
    setIsLoading(true);
    try {
      const fetchedTask = await getTask(resolvedTaskId);
      if (fetchedTask) {
        setTask(fetchedTask);
      }
    } catch (error) {
      console.error('Error loading task:', error);
      toast.error('タスクの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [isNew, resolvedTaskId, getTask, statuses, priorities, workspaces]);
  
  // タスクIDが変わったらタスクを読み込む
  useEffect(() => {
    if (isNew) {
      loadTask();
    } else if (resolvedTaskId) {
      // キャッシュから簡易的に取得
      const cachedTask = tasks.find(t => t.id === parseInt(resolvedTaskId));
      if (cachedTask) {
        setTask(cachedTask);
        setIsLoading(false);
      } else {
        loadTask();
      }
    }
  }, [resolvedTaskId, loadTask, tasks, isNew]);
  
  // statuses や priorities が更新されたときに、新規タスクの場合はステータスとプライオリティを更新
  useEffect(() => {
    if (isNew && task) {
      const defaultStatus = statuses && statuses.length > 0 ? statuses[0].id : null;
      const defaultPriority = priorities && priorities.length > 0 ? priorities[0].id : null;
      // デフォルトワークスペースの設定を改善
      const defaultWorkspace = workspaces && workspaces.length > 0 
        ? (workspaces.find(w => w.name === 'デフォルトワークスペース')?.id || workspaces[0].id) 
        : null;
      
      // ステータス、プライオリティ、またはワークスペースが未設定の場合は更新
      setTask(prev => {
        // 値が変更された場合のみ更新
        if (
          (!prev.status && defaultStatus) || 
          (!prev.priority && defaultPriority) || 
          (!prev.workspace && defaultWorkspace)
        ) {
          return {
            ...prev,
            status: prev.status || defaultStatus,
            priority: prev.priority || defaultPriority,
            workspace: prev.workspace || defaultWorkspace
          };
        }
        return prev;
      });
    }
  }, [isNew, statuses, priorities, workspaces, task]);
  
  // フォーム送信処理
  const handleSubmit = useCallback(async (formData) => {
    setIsSaving(true);
    try {
      let savedTask;
      let message;
      
      // 完了ステータスの確認（スコープの問題を解決するために関数の先頭に移動）
      const completedStatusIds = statuses
        .filter(s => 
          // 承認完了（クローズ）のみを厳密に検出
          s.name === '承認完了（クローズ）' || 
          // 厳密に完全一致するステータス名のみをチェック
          s.name === 'クローズ'
        )
        .map(s => s.id);
      
      // データの前処理（バックエンドが期待する形式に変換）
      const processedData = { ...formData };
      
      // 数値型フィールドの変換
      if (processedData.status && typeof processedData.status === 'string') {
        processedData.status = parseInt(processedData.status, 10) || processedData.status;
      }
      
      if (processedData.priority && typeof processedData.priority === 'string') {
        processedData.priority = parseInt(processedData.priority, 10) || processedData.priority;
      }
      
      // boolean型フィールドの変換
      ['is_recurring', 'is_template', 'is_fiscal_task'].forEach(field => {
        if (processedData[field] !== undefined) {
          processedData[field] = processedData[field] === 'true' || processedData[field] === true;
        }
      });
      
      // 空文字をnullに変換
      Object.keys(processedData).forEach(key => {
        if (processedData[key] === '') {
          processedData[key] = null;
        }
      });
      
      console.log("送信するデータ:", processedData);
      console.log("繰り返し設定:", processedData.is_recurring, processedData.recurrence_pattern);
      
      if (isNew) {
        // 新規作成の場合
        savedTask = await createTask({
          ...processedData
        });
        message = 'タスクを作成しました';
        
        // 作成後、即時パネルを閉じてタスク一覧に戻る
        if (onTaskUpdated) {
          // 第2引数をtrueにして、新規作成であることを伝える
          onTaskUpdated(savedTask, true);
        } else {
          // パネルを閉じる
          if (onClose) {
            onClose();
          } else {
            navigate('/tasks', { replace: true });
          }
        }
      } else {
        // 更新の場合
        savedTask = await updateTask(task.id, processedData);
        message = 'タスクを更新しました';
        
        // ステータスのデバッグ出力
        console.log("保存後のタスク:", savedTask);
        console.log("保存後のステータスID:", savedTask.status);
        
        // すべてのステータスを出力して確認
        console.log("すべてのステータス:", statuses.map(s => ({id: s.id, name: s.name})));
        
        // 完了ステータスの確認
        console.log("完了と判定するステータスID:", completedStatusIds);
        console.log("完了と判定するステータス名:", statuses
          .filter(s => completedStatusIds.includes(s.id))
          .map(s => s.name));
        console.log("現在のステータス名:", statuses.find(s => s.id === savedTask.status)?.name);
        console.log("繰り返し設定:", savedTask.is_recurring, savedTask.recurrence_pattern);
        
        // タスクが完了状態になったかチェック（より緩やかな条件でチェック）
        const taskHasBeenCompleted = 
          // 承認完了または完了ステータスに変更された場合
          (savedTask.status && completedStatusIds.includes(savedTask.status)) &&
          // 元のタスクが繰り返し設定を持っている場合
          savedTask.is_recurring && 
          savedTask.recurrence_pattern;
        
        console.log("完了状態と判定:", taskHasBeenCompleted);
        
        if (taskHasBeenCompleted) {
          try {
            console.log("次の繰り返しタスク生成を試みます...");
            // タスクが完了状態の場合、念のためmarkCompleteを呼び出してcompleted_atを設定
            try {
              console.log("タスクを完了状態に設定します...");
              const completedTask = await tasksApi.markTaskComplete(savedTask.id);
              
              // markTaskCompleteの結果を確認
              console.log("タスクの完了処理結果:", completedTask);
              
              // markTaskComplete APIはすでに次の繰り返しタスクを生成するため、
              // 次の繰り返しタスクが生成されているかを確認
              if (completedTask && completedTask.next_task_created) {
                console.log("markTaskComplete APIで次のタスクが生成されました");
                message = '承認完了しました。次回の繰り返しタスクを作成しました';
                return; // 次のタスク生成処理をスキップ
              }
              
              // バックエンドが次のタスクを生成していない場合は手動で生成を試みる
              console.log("バックエンドで次のタスクが生成されていないため、手動で生成を試みます");
              
              // 次の繰り返しタスクを生成
              const nextTask = await tasksApi.createNextRecurringTask(savedTask.id);
              
              if (nextTask) {
                // 明確なメッセージに更新
                message = '承認完了しました。次回の繰り返しタスクを作成しました';
                
                // ログに出力して確認
                console.log('次の繰り返しタスクが作成されました:', nextTask);
                console.log('新しいタスクのステータス:', nextTask.status);
                
                // 次のタスクのステータスを確認（バックエンドで自動的に未着手になるはず）
                const nextTaskStatus = statuses.find(s => s.id === nextTask.status);
                console.log('次のタスクのステータス名:', nextTaskStatus?.name);
              }
            } catch (markCompleteError) {
              console.error('タスクを完了状態に設定中にエラーが発生しました:', markCompleteError);
              // エラーは無視して次の処理に進む
            }
          } catch (error) {
            console.error('次の繰り返しタスク生成中にエラーが発生しました:', error);
            console.error('エラーの詳細:', error.response?.data);
            // エラーは表示せず、承認完了メッセージのみ表示
            message = '承認完了しました';
          }
        }
        
        setTask(savedTask);
        
        // 更新後の処理
        if (onTaskUpdated) {
          onTaskUpdated(savedTask, false);
        }
      }
      
      toast.success(message);
      
      // タスクが完了状態になった場合は自動的にパネルを閉じる
      if (!isNew && savedTask.status && completedStatusIds.includes(savedTask.status)) {
        if (onClose) {
          onClose();
        } else {
          navigate('/tasks', { replace: true });
        }
      }
      
      return savedTask;
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('タスクの保存に失敗しました');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [isNew, task?.id, statuses, createTask, updateTask, navigate, onTaskUpdated, onClose]);
  
  // 戻るボタン処理
  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };
  
  // 新規タスク作成フォームの初期化
  const initialFormValues = useMemo(() => {
    if (isNew) {
      return {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: null,
        assignee: null
      };
    }
    return task || {};
  }, [isNew, task]);
  
  // タスクを完了としてマークし、次回インスタンスを生成する
  const handleMarkCompleteAndGenerateNext = async () => {
    if (!task || !task.id) return;
    
    try {
      setIsSaving(true);
      toast.loading('タスクを完了にして次回インスタンスを生成中...');
      
      // タスクを完了状態にする
      await tasksApi.markTaskComplete(task.id);
      
      // 次の繰り返しインスタンスを生成
      const nextTask = await tasksApi.createNextRecurringTask(task.id);
      
      toast.dismiss();
      toast.success('タスクを完了にし、次回インスタンスを生成しました');
      
      // タスクの更新通知
      if (onTaskUpdated) {
        onTaskUpdated(task, false);
      }
      
      // パネルを閉じてタスク一覧に戻る
      if (onClose) {
        onClose();
      } else {
        navigate('/tasks', { replace: true });
      }
    } catch (error) {
      console.error('タスク完了と次回インスタンス生成エラー:', error);
      toast.dismiss();
      toast.error('処理に失敗しました: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFieldChange = useCallback(async (field, value) => {
    if (!task || !task.id) return;
    
    // 値が変更されていない場合は更新をスキップ
    if (task[field] === value) {
      return;
    }
    
    // 更新データを作成
    const updateData = { [field]: value };
    
    // 空のオブジェクトの場合は更新をスキップ
    if (Object.keys(updateData).length === 0) {
      return;
    }
    
    try {
      // まずタスクの存在確認
      try {
        await tasksApi.getTask(task.id);
      } catch (error) {
        if (error.response?.status === 404) {
          console.error(`タスク ${task.id} が見つかりません`);
          toast.error('タスクが見つかりません。既に削除されている可能性があります。');
          // パネルを閉じてタスク一覧に戻る
          if (onClose) {
            onClose();
          } else {
            navigate('/tasks', { replace: true });
          }
          return;
        }
        throw error;
      }
      
      // デバウンスされたタスク更新関数を使用
      debouncedUpdateTask(task.id, updateData)
        .then(updatedTask => {
          if (updatedTask) {
            setTask(updatedTask);
          }
        })
        .catch(error => {
          console.error(`タスク ${task.id} の更新中にエラーが発生しました:`, error);
          
          // エラーメッセージの表示
          if (error.response?.status === 404) {
            toast.error('タスクが見つかりません。既に削除されている可能性があります。');
            if (onClose) {
              onClose();
            }
          } else if (error.response?.status === 403) {
            toast.error('このタスクを更新する権限がありません。');
          } else {
            toast.error('タスクの更新に失敗しました。');
          }
        });
    } catch (error) {
      console.error(`タスク ${task.id} の確認中にエラーが発生しました:`, error);
      toast.error('タスクの確認に失敗しました。');
    }
  }, [task, debouncedUpdateTask, onClose, navigate]);
  
  if (isLoading && !isNew) {
    // 非表示の場合はローディングも表示しない
    if (!isOpen) {
      return null;
    }
    
    return (
      <div className="task-editor loading">
        <Skeleton height={50} width="80%" />
        <Skeleton count={5} height={30} />
      </div>
    );
  }
  
  // 非表示の場合は何も表示しない
  if (!isOpen) {
    return null;
  }
  
  // フォーム送信ハンドラ
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (taskFormRef.current && taskFormRef.current.handleSubmit) {
      taskFormRef.current.handleSubmit(e);
    }
  };
  
  return (
    <>
      {/* オーバーレイ背景 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* スライドパネル */}
      <div 
        className={`fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 xl:w-2/5 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}
      >
        <TaskFormProvider initialValues={initialFormValues} onSubmit={handleSubmit} ref={taskFormRef}>
          <div className="task-editor h-full flex flex-col">
            <div className="task-editor-header px-4 py-3 border-b flex items-center justify-between">
              <button 
                className="back-button flex items-center text-gray-600 hover:text-gray-900" 
                onClick={handleBack}
                aria-label="戻る"
              >
                <MdArrowBack size={24} />
                <span className="ml-2">戻る</span>
              </button>
              
              <div className="flex items-center space-x-2">
                {!isNew && task && (
                  <div className="text-sm text-gray-500">
                    {task.updated_at && `更新: ${formatDistanceToNow(new Date(task.updated_at))}前`}
                  </div>
                )}
                <button 
                  className="ml-auto rounded-full p-1 hover:bg-gray-200"
                  onClick={onClose}
                  aria-label="閉じる"
                >
                  <HiOutlineX size={20} />
                </button>
              </div>
            </div>
            
            <div className="task-editor-content flex-1 overflow-y-auto p-4">
              <div className="task-main-column space-y-6">
                <TaskBasicInfoSection 
                  task={task}
                  control={formContext?.control}
                  statuses={statuses}
                  categories={categories}
                  clients={clients}
                  fiscalYears={fiscalYears}
                  workspaces={workspaces}
                  formState={formContext?.formState}
                  handleFieldChange={(field, value) => {
                    if (task && task.id) {
                      updateTask(task.id, { [field]: value });
                    }
                  }}
                  watch={formContext?.watch}
                />
                <TaskDescriptionSection 
                  description={task?.description}
                  control={formContext?.control}
                  handleFieldChange={(field, value) => {
                    // 説明編集の度に更新せず、内部状態のみ更新
                    // フォーム送信時にのみAPI送信される
                    if (formContext && formContext.setValue) {
                      formContext.setValue('description', value);
                    }
                  }}
                />
                
                {/* 一時的にコメントアウト - AuthProvider問題の解決まで */}
                {/* !isNew && task && <Comments taskId={task.id} /> */}
                {/* !isNew && task && <Attachments taskId={task.id} /> */}
              </div>
              
              <div className="task-sidebar mt-8 space-y-6">
                <TaskDatePrioritySection 
                  dueDate={task?.due_date}
                  priority={task?.priority}
                  priorities={priorities}
                  control={formContext?.control}
                  handleFieldChange={(field, value) => {
                    if (task && task.id) {
                      updateTask(task.id, { [field]: value });
                    }
                  }}
                />
                <TaskAssigneeSection 
                  task={task}
                  users={users}
                  control={formContext?.control}
                  formState={formContext?.formState}
                  watch={formContext?.watch}
                  handleFieldChange={(field, value) => {
                    if (task && task.id) {
                      updateTask(task.id, { [field]: value });
                    }
                  }}
                />
                <TaskMetaInfoSection 
                  createdAt={task?.created_at}
                  updatedAt={task?.updated_at}
                />
                
                <TaskRecurrenceSection 
                  control={formContext?.control}
                  watch={formContext?.watch}
                  setValue={formContext?.setValue}
                  inputClassName="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  selectClassName="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  task={task}
                  handleFieldChange={(field, value) => {
                    if (task && task.id) {
                      updateTask(task.id, { [field]: value });
                    } else {
                      // 新規タスクの場合、一時的なデータを保存
                      const newValue = { ...task, [field]: value };
                      setTask(newValue);
                      console.log(`新規タスク作成モードでフィールド ${field} を値 ${value} に更新しました`);
                    }
                  }}
                />
                <TaskAdditionalSettingsSection 
                  control={formContext?.control}
                  watch={formContext?.watch}
                  handleFieldChange={(field, value) => {
                    if (task && task.id) {
                      updateTask(task.id, { [field]: value });
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="task-editor-footer p-4 border-t flex justify-between items-center bg-gray-50">
              {!isNew && task && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-800 flex items-center"
                    onClick={async () => {
                      // タスク削除機能
                      if (window.confirm('このタスクを削除してもよろしいですか？')) {
                        try {
                          setIsSaving(true);
                          
                          // まずタスクの存在確認
                          try {
                            await tasksApi.getTask(task.id);
                          } catch (error) {
                            if (error.response?.status === 404) {
                              toast.error('タスクが見つかりません。既に削除されている可能性があります。');
                              // パネルを閉じてタスク一覧に戻る
                              if (onClose) {
                                onClose();
                              } else {
                                navigate('/tasks', { replace: true });
                              }
                              return;
                            }
                            throw error;
                          }
                          
                          // タスクの削除を実行
                          await tasksApi.deleteTask(task.id);
                          toast.success('タスクを削除しました');
                          
                          // 削除イベントを発火
                          window.dispatchEvent(new CustomEvent('task-deleted', {
                            detail: {
                              taskId: task.id,
                              timestamp: new Date().getTime()
                            }
                          }));
                          
                          // パネルを閉じてタスク一覧に戻る
                          if (onClose) {
                            onClose();
                          } else {
                            navigate('/tasks', { replace: true });
                          }
                        } catch (error) {
                          console.error('タスク削除エラー:', error);
                          if (error.response?.status === 404) {
                            toast.error('タスクが見つかりません。既に削除されている可能性があります。');
                          } else if (error.response?.status === 403) {
                            toast.error('このタスクを削除する権限がありません。');
                          } else {
                            toast.error('タスクの削除に失敗しました。');
                          }
                        } finally {
                          setIsSaving(false);
                        }
                      }
                    }}
                  >
                    <HiOutlineTrash className="mr-1" />
                    削除
                  </button>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={onClose}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={handleFormSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      保存中...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <HiCheck className="mr-1" />
                      {isNew ? '作成' : '保存'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* ポップアップモーダル用のコンテナ */}
          <div id="modal-container"></div>
        </TaskFormProvider>
      </div>
    </>
  );
};

export default TaskEditor;