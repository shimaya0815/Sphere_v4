import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TaskList from '../components/tasks/list/index';
import TaskEditor from '../components/tasks/asana-style/TaskEditor';
import { tasksApi } from '../api';
import { toast } from 'react-hot-toast';

const TasksPage = () => {
  const { taskId } = useParams();
  const [selectedTask, setSelectedTask] = useState(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const taskListRef = useRef(null);
  
  // タスク更新イベントの監視
  useEffect(() => {
    const timeKey = 'page-load-time';
    sessionStorage.setItem(timeKey, Date.now().toString());
  }, []);

  // タスクリストの更新を制御
  useEffect(() => {
    // マウント時に一度だけセットアップする
    const throttledRefresh = () => {
      const timeKey = 'last-refresh-time';
      const lastTime = parseInt(sessionStorage.getItem(timeKey) || '0');
      const now = Date.now();
      
      // 1秒以上経過していれば更新する
      if (now - lastTime > 1000) {
        sessionStorage.setItem(timeKey, now.toString());
        if (taskListRef.current && typeof taskListRef.current.refreshTasks === 'function') {
          console.log('タスクリストを更新しました');
          taskListRef.current.refreshTasks();
        }
      }
    };
    
    // タブが表示されたときにリフレッシュ
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        throttledRefresh();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // 新規タスク作成の場合は自動的にフォームを開く
  useEffect(() => {
    if (taskId === 'new') {
      setSelectedTask(null);
      setIsNewTask(true);
      setSlideOverOpen(true);
      return; // API呼び出しをスキップ
    }
    
    // タスクIDが指定されている場合（新規以外）、そのタスクを取得して表示
    if (taskId && taskId !== 'new') {
      const fetchTask = async () => {
        try {
          setIsLoading(true);
          const task = await tasksApi.getTask(taskId);
          setSelectedTask(task);
          setIsNewTask(false);
          setSlideOverOpen(true);
        } catch (error) {
          console.error('タスクの取得中にエラーが発生しました:', error);
          toast.error('タスクの取得に失敗しました');
          navigate('/tasks', { replace: true });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchTask();
    }
  }, [taskId, navigate]);
  
  // スライドオーバーを閉じる
  const handleCloseSlideOver = useCallback(() => {
    setSlideOverOpen(false);
    setSelectedTask(null);
    setIsNewTask(false);
    
    // URLをタスク一覧に戻す
    navigate('/tasks', { replace: true });
    
    // タスクリストを更新（遅延を短くして即時性を向上）
    setTimeout(() => {
      if (taskListRef.current && typeof taskListRef.current.refreshTasks === 'function') {
        taskListRef.current.refreshTasks();
      }
    }, 50);
  }, [navigate]);
  
  // タスクを選択して右からスライドするパネルを開く
  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setIsNewTask(false);
    setSlideOverOpen(true);
    
    // URLをタスクIDに更新
    navigate(`/tasks/${task.id}`, { replace: true });
  };
  
  // 新規タスク作成用のスライドオーバーを開く
  const handleNewTask = () => {
    setSelectedTask(null);
    setIsNewTask(true);
    setSlideOverOpen(true);
    
    // URLを新規タスク作成に更新
    navigate('/tasks/new', { replace: true });
  };
  
  // タスク更新後の処理
  const handleTaskUpdated = useCallback((updatedTask, isNew = false) => {
    console.log('タスク更新イベント:', updatedTask, '新規:', isNew);
    
    if (!updatedTask) return;
    
    // 常にタスクリストを即時更新
    if (taskListRef.current && typeof taskListRef.current.refreshTasks === 'function') {
      taskListRef.current.refreshTasks();
    }
    
    // 新規タスクの場合はパネルを閉じる
    if (isNew) {
      handleCloseSlideOver();
    } else {
      // 既存タスクの場合は更新したタスクを表示
      setSelectedTask(updatedTask);
    }
  }, [handleCloseSlideOver]);
  
  return (
    <div className="relative">
      <TaskList 
        ref={taskListRef}
        onTaskSelect={handleTaskSelect}
        onNewTask={handleNewTask} 
      />
      
      <TaskEditor
        isOpen={slideOverOpen}
        isNewTask={isNewTask}
        task={selectedTask}
        onClose={handleCloseSlideOver}
        onTaskUpdated={handleTaskUpdated}
      />
    </div>
  );
};

export default TasksPage;