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
const TaskEditor = ({ isNew = false, initialData = null, onClose = null, projectId = null }) => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { 
    getTask, 
    updateTask, 
    createTask, 
    isLoading: isTaskLoading,
    tasks
  } = useTasks();
  
  // フォームコンテキストを使用（必要な場合）
  const formContext = useTaskFormContext();
  
  // タスクIDを決定（URL、初期データ、または新規タスク用のnull）
  const resolvedTaskId = useMemo(() => {
    if (!isNew) {
      return taskId || (initialData && initialData.id) || null;
    }
    return null;
  }, [isNew, taskId, initialData]);
  
  // タスクデータの初期化
  const [task, setTask] = useState(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef(null);
  
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
      setTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: null,
        assigned_to: null,
        category: null,
        tags: []
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
  }, [isNew, resolvedTaskId, getTask]);
  
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
          project: projectId || formData.project
        });
        message = 'タスクを作成しました';
        
        // 作成後、タスク詳細画面へ遷移
        if (onClose) {
          onClose(savedTask);
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
  }, [isNew, task?.id, createTask, updateTask, projectId, navigate, onClose]);
  
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
        project: projectId || null,
        assignee: null,
        tags: []
      };
    }
    return task || {};
  }, [isNew, task, projectId]);
  
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
    <TaskFormProvider initialValues={initialFormValues} onSubmit={handleSubmit} ref={taskFormRef}>
      <motion.div 
        className="task-editor"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="task-editor-header">
          <button 
            className="back-button" 
            onClick={handleBack}
            aria-label="戻る"
          >
            <MdArrowBack size={24} />
          </button>
          
          {!isNew && task && (
            <div className="task-meta">
              <div className="task-id">#{task.id}</div>
              <div className="task-created">
                作成: {task.created_at ? formatDistanceToNow(parseISO(task.created_at), { addSuffix: true }) : ''}
              </div>
            </div>
          )}
        </div>
        
        <div className="task-editor-content">
          <div className="task-main-column">
            <div className="task-title-section">
              {task && !isNew ? (
                <TaskTitleEditor 
                  initialValue={task.title} 
                  onSave={(newTitle) => updateTask(task.id, { title: newTitle })}
                />
              ) : (
                <div className="form-field">
                  <label htmlFor="title">タイトル</label>
                  <TaskForm.Field name="title" placeholder="タスクのタイトルを入力" required />
                </div>
              )}
            </div>
            
            <div className="task-description-section">
              <label>詳細</label>
              <TaskForm.RichField 
                name="description" 
                placeholder="タスクの詳細を入力してください..." 
              />
            </div>
            
            {!isNew && task && (
              <>
                <div className="task-time-section">
                  <h3>時間記録</h3>
                  <TimeTracking 
                    taskId={task.id}
                    isRecordingTime={isRecordingTime}
                    elapsedTime={elapsedTime}
                    timeEntries={cachedTimeEntries}
                    isLoading={isTimerLoading || isLoadingEntries}
                    onToggleTimer={() => {
                      if (isRecordingTime) {
                        stopTimer();
                      } else {
                        startTimer();
                      }
                    }}
                    onRefresh={fetchTimeEntries}
                  />
                </div>
                
                <div className="task-comments-section">
                  <h3>コメント</h3>
                  <Comments taskId={task.id} />
                </div>
                
                <div className="task-attachments-section">
                  <h3>添付ファイル</h3>
                  <Attachments taskId={task.id} />
                </div>
              </>
            )}
          </div>
          
          <div className="task-sidebar">
            <div className="sidebar-section">
              <h3>ステータス</h3>
              {task && !isNew ? (
                <StatusSelector 
                  value={task.status} 
                  onChange={(status) => updateTask(task.id, { status })}
                />
              ) : (
                <TaskForm.Field name="status" component={StatusSelector} />
              )}
            </div>
            
            <div className="sidebar-section">
              <h3>担当者</h3>
              <TaskForm.UserField name="assignee" />
            </div>
            
            <div className="sidebar-section">
              <h3>優先度</h3>
              <TaskForm.PriorityField name="priority" />
            </div>
            
            <div className="sidebar-section">
              <h3>期日</h3>
              <TaskForm.DateField name="due_date" />
            </div>
            
            {(isNew || !taskId) && (
              <div className="sidebar-section">
                <h3>プロジェクト</h3>
                <TaskForm.ProjectField name="project" defaultValue={projectId} />
              </div>
            )}
            
            <div className="sidebar-section">
              <h3>タグ</h3>
              <TaskForm.TagsField name="tags" />
            </div>
            
            {isNew && (
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  onClick={() => formRef.current && formRef.current.dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  )}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : 'タスクを作成'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        <form 
          ref={formRef} 
          onSubmit={handleFormSubmit}
          style={{ display: 'none' }}
        />
      </motion.div>
    </TaskFormProvider>
  );
};

export default TaskEditor;