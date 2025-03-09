import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import TaskEditor from '../components/tasks/asana-style/TaskEditor';
import { tasksApi } from '../api';

const TasksPage = ({ view }) => {
  const { taskId } = useParams();
  const [selectedTask, setSelectedTask] = useState(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const taskListRef = useRef(null);
  
  // タスクIDが指定されている場合、そのタスクを取得して表示
  useEffect(() => {
    if (taskId && !view) {
      const fetchTask = async () => {
        try {
          const task = await tasksApi.getTask(taskId);
          setSelectedTask(task);
          setSlideOverOpen(true);
        } catch (error) {
          console.error('Error fetching task:', error);
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
    setSelectedTask(null);
    setIsNewTask(true);
    setSlideOverOpen(true);
  };
  
  // タスク更新後の処理
  const handleTaskUpdated = (updatedTask) => {
    console.log("Task updated in parent:", updatedTask);
    
    if (!updatedTask) {
      console.warn("Received empty updatedTask in handleTaskUpdated");
      return;
    }
    
    // 現在のタスクと更新タスクを比較（デバッグ用）
    if (selectedTask) {
      console.log("Previous task state:", selectedTask);
      console.log("Updated task state:", updatedTask);
      
      // 重要なフィールドの変更を確認
      const keysToCheck = ['status', 'priority', 'category'];
      keysToCheck.forEach(key => {
        const oldValue = selectedTask[key];
        const newValue = updatedTask[key];
        console.log(`Field ${key}: ${JSON.stringify(oldValue)} -> ${JSON.stringify(newValue)}`);
      });
    }
    
    // 重要: 更新されたタスクのディープコピーを作成して状態を正しく更新
    const taskCopy = JSON.parse(JSON.stringify(updatedTask));
    console.log("Setting selected task with deep copy:", taskCopy);
    
    // 更新されたタスクを選択状態にセット（スライドオーバーの表示を更新）
    setSelectedTask(taskCopy);
    
    // リスト更新を即時実行して状態を同期
    console.log("Immediately refreshing task list");
    if (taskListRef.current && typeof taskListRef.current.refreshTasks === 'function') {
      console.log("Refreshing task list via ref - immediate");
      taskListRef.current.refreshTasks();
    }
    
    // 念のため、少し遅延させた再読み込みも行う（UI更新を確実にするため）
    setTimeout(() => {
      console.log("Refreshing task list again after delay");
      if (taskListRef.current && typeof taskListRef.current.refreshTasks === 'function') {
        console.log("Refreshing task list via ref - delayed");
        taskListRef.current.refreshTasks();
      } else {
        console.log("Could not refresh tasks via ref - using event fallback");
        // フォールバック: カスタムイベントを発火
        window.dispatchEvent(new Event('task-update-force-refresh'));
      }
    }, 500); // さらに長めの遅延で確実にUIを更新
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
      
      {/* Asana風タスク編集コンポーネント - 常に存在しておき、表示/非表示を制御 */}
      <TaskEditor 
        task={selectedTask}
        isNewTask={isNewTask}
        onClose={handleCloseSlideOver}
        onTaskUpdated={handleTaskUpdated}
        isOpen={slideOverOpen}
      />
    </div>
  );
};

export default TasksPage;