import React from 'react';
import { useParams } from 'react-router-dom';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';

const TasksPage = ({ view }) => {
  const { taskId } = useParams();
  
  // 詳細表示の場合
  if (view === 'detail' && taskId) {
    return <TaskDetail />;
  }
  
  // 一覧表示の場合（デフォルト）
  return <TaskList />;
};

export default TasksPage;