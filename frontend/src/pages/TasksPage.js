import React, { useState } from 'react';
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
  const handleTaskUpdated = () => {
    // タスク一覧を再読み込みする必要がある場合は、ここでリロードのロジックを追加
  };
  
  // 詳細表示の場合 (URL経由での表示)
  if (view === 'detail' && taskId) {
    return <TaskDetail taskId={taskId} />;
  }
  
  // 一覧表示の場合（デフォルト）
  return (
    <div className="relative">
      <TaskList onTaskSelect={handleTaskSelect} />
      
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