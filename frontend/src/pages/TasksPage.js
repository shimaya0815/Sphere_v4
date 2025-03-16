import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TaskList from '../components/tasks/list/index';
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
  
  // 新規タスク作成の場合は自動的にフォームを開く
  useEffect(() => {
    if (taskId === 'new') {
      console.log('Opening new task form from URL');
      setSelectedTask(null);
      setIsNewTask(true);
      setSlideOverOpen(true);
      return; // API呼び出しをスキップ
    }
    
    // タスクIDが指定されている場合（新規以外）、そのタスクを取得して表示
    if (taskId && !view && taskId !== 'new') {
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
    console.log("Opening new task form");
    // 新しいタスク作成モードにリセット
    setSelectedTask(null);
    setIsNewTask(true);
    setSlideOverOpen(true);
    
    // URLを新規タスク作成に更新
    navigate('/tasks/new', { replace: true });
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
    
    // リスト更新を直接データで更新
    if (isNewTask && taskCopy) {
      console.log("New task created, directly updating task list with data");
      if (taskListRef.current && typeof taskListRef.current.refreshTasksWithData === 'function') {
        taskListRef.current.refreshTasksWithData(taskCopy, true); // 第2引数にisNewTask=trueを渡す
      } else {
        console.log("Could not update with new task data, using event fallback");
        window.dispatchEvent(new CustomEvent('task-updated', { 
          detail: { task: taskCopy, isNew: true }
        }));
      }
    } else {
      // 既存タスクの更新の場合
      console.log("Existing task updated, updating specific task in list");
      if (taskListRef.current && typeof taskListRef.current.refreshTasksWithData === 'function') {
        console.log("Updating specific task in list with data");
        taskListRef.current.refreshTasksWithData(taskCopy, false); // isNewTask=falseを明示的に渡す
      } else {
        console.log("Could not update with task data, using event fallback");
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