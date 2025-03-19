import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TaskList from '../components/tasks/list/index';
import { tasksApi } from '../api';
// TaskEditorをレイジーロードに変更
const TaskEditor = lazy(() => import('../components/tasks/asana-style/TaskEditor'));

const TasksPage = ({ view }) => {
  const { taskId } = useParams();
  const [selectedTask, setSelectedTask] = useState(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const taskListRef = useRef(null);
  
  // 新規タスク作成の場合は自動的にフォームを開く
  useEffect(() => {
    if (taskId === 'new') {
      setSelectedTask(null);
      setIsNewTask(true);
      setSlideOverOpen(true);
      return; // API呼び出しをスキップ
    }
    
    // タスクIDが指定されている場合（新規以外）、そのタスクを取得して表示
    if (taskId && !view && taskId !== 'new') {
      const fetchTask = async () => {
        try {
          setIsLoading(true);
          const task = await tasksApi.getTask(taskId);
          setSelectedTask(task);
          setSlideOverOpen(true);
        } catch (error) {
          console.error('Error fetching task:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchTask();
    }
  }, [taskId, view]);
  
  // タスクを選択して右からスライドするパネルを開く
  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setSlideOverOpen(true);
    
    // URLをタスクIDに更新
    navigate(`/tasks/${task.id}`, { replace: true });
  };
  
  // スライドオーバーを閉じる
  const handleCloseSlideOver = () => {
    setSlideOverOpen(false);
    setSelectedTask(null);
    setIsNewTask(false);
    
    // URLをタスク一覧に戻す
    navigate('/tasks', { replace: true });
  };
  
  // 新規タスク作成用のスライドオーバーを開く
  const handleNewTask = () => {
    // 新しいタスク作成モードにリセット
    setSelectedTask(null);
    setIsNewTask(true);
    setSlideOverOpen(true);
    
    // URLを新規タスク作成に更新
    navigate('/tasks/new', { replace: true });
  };
  
  // タスク更新後の処理
  const handleTaskUpdated = (updatedTask) => {
    if (!updatedTask) {
      return;
    }
    
    // 重要: 更新されたタスクのディープコピーを作成して状態を正しく更新
    const taskCopy = JSON.parse(JSON.stringify(updatedTask));
    
    // 更新されたタスクを選択状態にセット（スライドオーバーの表示を更新）
    setSelectedTask(taskCopy);
    
    // リスト更新を直接データで更新
    if (isNewTask && taskCopy) {
      if (taskListRef.current && typeof taskListRef.current.refreshTasksWithData === 'function') {
        taskListRef.current.refreshTasksWithData(taskCopy, true); // 第2引数にisNewTask=trueを渡す
      } else {
        window.dispatchEvent(new CustomEvent('task-updated', { 
          detail: { task: taskCopy, isNew: true }
        }));
      }
    } else {
      // 既存タスクの更新の場合
      if (taskListRef.current && typeof taskListRef.current.refreshTasksWithData === 'function') {
        taskListRef.current.refreshTasksWithData(taskCopy, false); // isNewTask=falseを明示的に渡す
      } else {
        window.dispatchEvent(new CustomEvent('task-updated', { 
          detail: { task: taskCopy, isNew: false }
        }));
      }
    }
  };
  
  // view="detail"パラメータは使わない（全てスライドパネルで表示）
  
  // 一覧表示の場合（デフォルト）
  return (
    <div className="relative">
      <TaskList 
        ref={taskListRef}
        onTaskSelect={handleTaskSelect}
        onNewTask={handleNewTask} 
        forceRefresh={slideOverOpen} // スライドオーバーの状態をpropsとして渡す
      />
      
      {/* Asana風タスク編集コンポーネント - レイジーロードで必要なときだけ読み込む */}
      {slideOverOpen && (
        <Suspense fallback={<div className="fixed inset-0 overflow-hidden z-50 bg-gray-500 bg-opacity-75">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        </div>}>
          <TaskEditor 
            task={selectedTask}
            isNewTask={isNewTask}
            onClose={handleCloseSlideOver}
            onTaskUpdated={handleTaskUpdated}
            isOpen={slideOverOpen}
          />
        </Suspense>
      )}
    </div>
  );
};

export default TasksPage;