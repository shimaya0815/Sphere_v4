import React, { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TaskList from '../components/tasks/list/index';
import { tasksApi } from '../api';
import { toast } from 'react-hot-toast';
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
  
  // タスク更新イベントの監視
  useEffect(() => {
    const timeKey = 'page-load-time';
    sessionStorage.setItem(timeKey, Date.now().toString());
  }, []);

  // このuseEffectは削除し、新しい実装に置き換える
  // TasksPageから渡されるforceRefreshプロップの変更を監視
  useEffect(() => {
    // props.forceRefreshが変更されても実行しない
    // マウント時に一度だけセットアップする
    const throttledRefresh = () => {
      const timeKey = 'last-refresh-time';
      const lastTime = parseInt(sessionStorage.getItem(timeKey) || '0');
      const now = Date.now();
      
      // 1秒以上経過していれば更新する
      if (now - lastTime > 1000) {
        sessionStorage.setItem(timeKey, now.toString());
        if (taskListRef.current && typeof taskListRef.current.refreshTasks === 'function') {
          console.log('Throttled refresh executed');
          taskListRef.current.refreshTasks();
        }
      }
    };
    
    // スライドオーバーの変更を直接監視する代わりに別の方法でリフレッシュを制御
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
  
  // グローバルイベントリスナーの設定
  useEffect(() => {
    // パネルを閉じるイベントリスナー
    const handleClosePanelEvent = () => {
      console.log('パネルを閉じるイベント受信');
      handleCloseSlideOver();
    };
    
    // 強制的にパネルを閉じるイベントリスナー（緊急用）
    const handleForceClosePanelEvent = (event) => {
      console.log('強制的にパネルを閉じるイベント受信:', event.detail);
      forceClosePanel();
    };
    
    // データ付きのタスク更新イベントリスナー（新規または既存タスク更新）
    const handleTaskRefreshWithData = (event) => {
      if (event.detail && event.detail.task) {
        console.log('データ付きリフレッシュイベント受信:', event.detail);
        const task = event.detail.task;
        const isNew = event.detail.isNew;
        
        // タスクリストに直接データを追加
        if (taskListRef.current && typeof taskListRef.current.refreshTasksWithData === 'function') {
          console.log('タスクリストにデータを直接追加:', task.title);
          taskListRef.current.refreshTasksWithData(task, isNew);
          
          // トースト通知も表示（確実に表示されるように）
          if (isNew) {
            // コメントアウト：これは重複トーストの原因
            /*
            toast.success(`タスク「${task.title}」を作成しました`, {
              id: `task-created-page-${Date.now()}`,
              duration: 5000
            });
            */
          }
        }
      }
    };
    
    // グローバルイベントを登録
    window.addEventListener('close-task-panel', handleClosePanelEvent);
    window.addEventListener('force-close-panel', handleForceClosePanelEvent);
    window.addEventListener('task-refresh-with-data', handleTaskRefreshWithData);
    
    return () => {
      window.removeEventListener('close-task-panel', handleClosePanelEvent);
      window.removeEventListener('force-close-panel', handleForceClosePanelEvent);
      window.removeEventListener('task-refresh-with-data', handleTaskRefreshWithData);
    };
  }, []);
  
  // スライドパネルを強制的に閉じる（緊急用）
  const forceClosePanel = useCallback(() => {
    console.log('スライドパネルを強制的に閉じる処理を実行');
    
    // 1. 即時に状態をリセット
    setSlideOverOpen(false);
    setSelectedTask(null);
    setIsNewTask(false);
    
    // 2. URLを強制的に変更
    navigate('/tasks', { replace: true });
    
    // 3. DOM操作でパネルを直接削除する試み
    try {
      const panels = document.querySelectorAll('.fixed.inset-0.overflow-hidden.z-50');
      if (panels.length > 0) {
        console.log('DOM経由でパネルを直接削除します');
        panels.forEach(panel => panel.remove());
      }
    } catch (error) {
      console.error('DOM操作によるパネル削除エラー:', error);
    }
    
    // 4. 最終手段：強制的にコンポーネントを再マウント
    setTimeout(() => {
      const stillOpen = document.querySelectorAll('.fixed.inset-0.overflow-hidden.z-50');
      if (stillOpen.length > 0) {
        console.log('強制的なDOMクリーンアップを実行');
        stillOpen.forEach(panel => panel.remove());
        
        // 少し遅延させてからリストを強制更新
        setTimeout(() => {
          if (taskListRef.current) {
            try {
              console.log('タスクリストを強制更新');
              if (typeof taskListRef.current.refreshTasks === 'function') {
                taskListRef.current.refreshTasks();
              }
            } catch (error) {
              console.error('リスト更新エラー:', error);
            }
          }
        }, 300);
      }
    }, 500);
  }, [navigate]);
  
  // スライドオーバーを閉じる（通常の閉じる処理）
  const handleCloseSlideOver = useCallback(() => {
    console.log('スライドオーバーを閉じる処理を実行');
    
    // パネル表示状態をすぐに解除
    setSlideOverOpen(false);
    
    // 少し遅延させてから他の状態をクリア（アニメーション完了後）
    setTimeout(() => {
      console.log('パネルを閉じた後の状態クリア');
      setSelectedTask(null);
      setIsNewTask(false);
      
      // URLをタスク一覧に戻す
      navigate('/tasks', { replace: true });
      
      // 別の遅延処理でリストを最終更新
      setTimeout(() => {
        console.log('遅延実行: タスクリストを最終更新');
        if (taskListRef.current && typeof taskListRef.current.refreshTasks === 'function') {
          taskListRef.current.refreshTasks();
        }
      }, 300);
    }, 100);
  }, [navigate]);
  
  // タスクを選択して右からスライドするパネルを開く
  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setSlideOverOpen(true);
    
    // URLをタスクIDに更新
    navigate(`/tasks/${task.id}`, { replace: true });
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
  const handleTaskUpdated = useCallback((updatedTask, isNew = false) => {
    console.log('タスク更新イベント受信:', updatedTask, '新規タスク:', isNew);
    
    if (!updatedTask) {
      console.log('更新されたタスクがありません');
      return;
    }
    
    try {
      // ディープコピーを作成して状態を正しく更新
      const taskCopy = JSON.parse(JSON.stringify(updatedTask));
      
      // リストの更新を先に行う
      if (taskListRef.current && typeof taskListRef.current.refreshTasksWithData === 'function') {
        console.log('タスクリストを即時更新します');
        taskListRef.current.refreshTasksWithData(taskCopy, isNew || isNewTask);
      }
      
      // 新規タスクの場合は特別な処理
      if (isNew || isNewTask) {
        console.log('新規タスク作成後の処理を実行 (TasksPage)');
        
        // トースト通知は削除（TaskEditor.jsでのみ表示）
        
        // 少し遅延させてからパネルを閉じる（イベント処理完了後）
        setTimeout(() => {
          console.log('タスク更新後: パネルを閉じます');
          handleCloseSlideOver();
        }, 200);
      } else {
        // 既存タスク更新の場合は選択状態を維持
        setSelectedTask(taskCopy);
      }
    } catch (error) {
      console.error('タスク更新処理中にエラーが発生しました:', error);
    }
  }, [isNewTask, handleCloseSlideOver]);
  
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
            isNew={isNewTask}
            initialData={selectedTask}
            onClose={handleCloseSlideOver}
            onTaskUpdated={handleTaskUpdated}
          />
        </Suspense>
      )}
    </div>
  );
};

export default TasksPage;