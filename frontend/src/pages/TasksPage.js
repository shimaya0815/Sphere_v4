import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import TaskSlideOver from '../components/tasks/TaskSlideOver';

const TasksPage = ({ view }) => {
  const { taskId } = useParams();
  const [selectedTask, setSelectedTask] = useState(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const taskListRef = useRef(null);
  
  // タスクを選択して右からスライドするパネルを開く
  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setSlideOverOpen(true);
    
    // URLにtaskIdを追加せず、同じページにとどまる
    // これにより、右から表示されてもブラウザの戻るボタンを押したときに前のページに戻るのではなく
    // スライドオーバーを閉じるだけになります
  };
  
  // スライドオーバーを閉じる
  const handleCloseSlideOver = () => {
    setSlideOverOpen(false);
    setSelectedTask(null);
  };
  
  // タスク更新後の処理
  const handleTaskUpdated = (updatedTask) => {
    console.log("Task updated in parent:", updatedTask);
    
    // 更新されたタスクを選択状態にセット（スライドオーバーの表示を更新）
    setSelectedTask(updatedTask);
    
    // 強制的にタスク一覧を再読み込み
    if (taskListRef.current && typeof taskListRef.current.refreshTasks === 'function') {
      console.log("Refreshing task list");
      setTimeout(() => {
        taskListRef.current.refreshTasks();
      }, 100);
    } else {
      console.log("Could not refresh tasks - ref or method not available");
      // フォールバック: カスタムイベントを発火
      setTimeout(() => {
        window.dispatchEvent(new Event('task-update-force-refresh'));
      }, 100);
    }
  };
  
  // 詳細表示の場合 (URL経由での表示)
  if (view === 'detail' && taskId) {
    return <TaskDetail taskId={taskId} />;
  }
  
  // 一覧表示の場合（デフォルト）
  return (
    <div className="relative">
      <TaskList 
        ref={taskListRef}
        onTaskSelect={handleTaskSelect} 
        forceRefresh={slideOverOpen} // スライドオーバーの状態をpropsとして渡す
      />
      
      {/* スライドオーバー */}
      <TaskSlideOver 
        isOpen={slideOverOpen}
        task={selectedTask}
        onClose={handleCloseSlideOver}
        onTaskUpdated={handleTaskUpdated}
      />
    </div>
  );
};

export default TasksPage;