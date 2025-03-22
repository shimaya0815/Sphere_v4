import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../../../hooks/useTasks';
import { TaskFormProvider, useTaskFormContext } from './hooks/useTaskForm';
import TaskForm from './TaskForm';
import StatusSelector from './StatusSelector';
import TimeTracking from './components/TimeTracking';
// エラーになるコンポーネントを一時的にコメントアウト
// import Comments from '../components/TaskComments';
// import Attachments from '../components/Attachments';
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
  HiOutlineTag
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
const Comments = ({ taskId }) => (
  <div>コメント機能は現在開発中です。タスクID: {taskId}</div>
);

const Attachments = ({ taskId }) => (
  <div>添付ファイル機能は現在開発中です。タスクID: {taskId}</div>
);

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
        
        setUsers(Array.isArray(usersData) ? usersData : []);
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
        tags: [],
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
      
      if (isNew) {
        // 新規作成の場合
        savedTask = await createTask({
          ...formData,
          project: initialData?.project || formData.project
        });
        message = 'タスクを作成しました';
        
        // 作成後、タスク詳細画面へ遷移
        if (onTaskUpdated) {
          onTaskUpdated(savedTask);
        } else {
          navigate(`/tasks/${savedTask.id}`);
        }
      } else {
        // 更新の場合
        savedTask = await updateTask(task.id, formData);
        message = 'タスクを更新しました';
        setTask(savedTask);
      }
      
      toast.success(message);
      return savedTask;
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('タスクの保存に失敗しました');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [isNew, task?.id, createTask, updateTask, initialData?.project, navigate, onTaskUpdated]);
  
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
        project: initialData?.project || null,
        assignee: null,
        tags: []
      };
    }
    return task || {};
  }, [isNew, task, initialData]);
  
  if (isLoading && !isNew) {
    return (
      <div className="task-editor loading">
        <Skeleton height={50} width="80%" />
        <Skeleton count={5} height={30} />
      </div>
    );
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
                  handleFieldChange={(value) => {
                    if (task && task.id) {
                      updateTask(task.id, { description: value });
                    }
                  }}
                />
                
                {!isNew && task && <Comments taskId={task.id} />}
                {!isNew && task && <Attachments taskId={task.id} />}
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
                  assignee={task?.assignee}
                  control={formContext?.control}
                  users={users}
                  handleFieldChange={(value) => {
                    if (task && task.id) {
                      updateTask(task.id, { assignee: value });
                    }
                  }}
                />
                <TaskMetaInfoSection 
                  createdAt={task?.created_at}
                  updatedAt={task?.updated_at}
                />
                
                {isNew && (
                  <div className="sidebar-section">
                    <h3>プロジェクト</h3>
                    <TaskForm.ProjectField name="project" defaultValue={initialData?.project} />
                  </div>
                )}
                
                <TaskRecurrenceSection 
                  control={formContext?.control}
                  watch={formContext?.watch}
                  handleFieldChange={(field, value) => {
                    if (task && task.id) {
                      updateTask(task.id, { [field]: value });
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
                <button
                  type="button"
                  className="text-red-600 hover:text-red-800 flex items-center"
                  onClick={() => {
                    // タスク削除機能
                    if (window.confirm('このタスクを削除してもよろしいですか？')) {
                      // 削除処理
                    }
                  }}
                >
                  <HiOutlineTrash className="mr-1" />
                  削除
                </button>
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