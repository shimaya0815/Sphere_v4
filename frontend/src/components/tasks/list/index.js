import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  HiOutlinePlus, 
  HiOutlineFilter, 
  HiOutlineDocumentText,
  HiOutlineExclamationCircle, 
  HiCheck 
} from 'react-icons/hi';
import { useAuth } from '../../../context/AuthContext';
import { tasksApi } from '../../../api';

// 分割したコンポーネントのインポート
import TaskFilters from './TaskFilters';
import TaskTable from './TaskTable';
import TaskBulkEditModal, { TaskBulkEditBar } from './TaskBulkEdit';
import DeleteConfirmModal from './DeleteConfirmModal';
import useTaskSorting from './useTaskSorting';

const TaskList = forwardRef((props, ref) => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const { currentUser } = useAuth();
  
  // 一括編集関連の状態
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    status: '',
    priority: '',
    assignee: '',
    due_date: ''
  });

  // デフォルトのフィルターを設定（自分担当のみ）
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    searchTerm: '',
    is_fiscal_task: '',
    client: '',
    assignee: currentUser?.id || '',  // 自分の担当タスクのみをデフォルト表示
  });
  
  // URLクエリパラメータからフィルターを取得
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const assigneeParam = query.get('assignee');
    
    // URLにassigneeパラメータがなければ、現在のユーザーをフィルタリング条件に設定
    if (!assigneeParam && currentUser?.id) {
      setFilters(prev => ({
        ...prev,
        assignee: currentUser.id
      }));
    } else if (assigneeParam) {
      setFilters(prev => ({
        ...prev,
        assignee: assigneeParam
      }));
    }
  }, [location.search, currentUser?.id]);
  
  // ソート機能のカスタムフック
  const { 
    tasks, 
    sortConfig, 
    handleSortChange, 
    updateTasks, 
    sortTasks 
  } = useTaskSorting([]);

  // タスク一覧取得
  const fetchTasks = async () => {
    setLoading(true);
    try {
      // フィルターのクリーンアップ（空の値は送信しない）
      const cleanFilters = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '') {
          cleanFilters[key] = value;
        }
      });
      
      console.log('⭐⭐⭐ Fetching tasks with filters:', cleanFilters);
      console.log('⭐⭐⭐ Using API endpoint: /api/tasks/');
      console.group('Task API Request Debugging');
      
      let fetchedTasks = [];
      
      try {
        // APIリクエスト
        const response = await tasksApi.getTasks(cleanFilters);
        console.log('API Response full:', response);
        
        // API応答チェック
        if (response && Array.isArray(response.results)) {
          console.log('Using API response results array:', response.results.length);
          fetchedTasks = response.results;
          setError(null);
        } else if (Array.isArray(response)) {
          console.log('Using raw API response array:', response.length);
          fetchedTasks = response;
          setError(null);
        } else if (response && typeof response === 'object' && Object.keys(response).length > 0) {
          console.warn('API response format unexpected:', response);
          if (response.results && response.results.length === 0) {
            // 結果が空の場合は空のタスク配列を設定
            console.log('Empty results from API');
            fetchedTasks = [];
            setError(null);
          } else {
            // 形式は想定外だが何かデータはある
            console.log('Using unexpected API response format as fallback');
            if (response.detail) {
              // エラーメッセージがある場合
              console.error('API returned error:', response.detail);
              setError(`APIエラー: ${response.detail}`);
              fetchedTasks = [];
            } else {
              // それ以外の場合、オブジェクトをタスクとして扱う
              console.log('Treating response object as a task');
              fetchedTasks = [response];
              setError(null);
            }
          }
        } else {
          // APIからのデータがない場合はエラー表示
          console.error('API returned no usable data');
          setError('タスク情報の読み込みに失敗しました。データ形式が不正です。');
          fetchedTasks = [];
        }
      } finally {
        console.groupEnd();
      }
      
      // カスタムフックを使ってソート処理を適用
      updateTasks(fetchedTasks);
    } catch (error) {
      console.error('Error in fetchTasks:', error);
      setError('タスク一覧の取得に失敗しました');
      toast.error('タスク一覧の取得に失敗しました');
      updateTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // 初期読み込み時
  useEffect(() => {
    fetchTasks();
    
    // 冗長性のために第2の初期ロードを実施 (APIが安定するまでの一時的な対策)
    const retryTimeout = setTimeout(() => {
      console.log('Retry fetchTasks after timeout');
      fetchTasks();
    }, 1500);
    
    return () => clearTimeout(retryTimeout);
  }, []);
  
  // フィルターが変更されたときにタスクを再取得
  useEffect(() => {
    console.log('Filters changed, fetching tasks with:', filters);
    fetchTasks();
  }, [filters]);

  // タスク更新イベントの監視
  useEffect(() => {
    const handleTaskUpdate = (event) => {
      console.log("🔔 Task updated event received", event.detail);
      
      if (!event.detail || !event.detail.task) {
        console.warn("Invalid task update event with no task data");
        fetchTasks(); // 無効なイベントの場合は全体を再取得
        return;
      }
      
      const updatedTask = event.detail.task;
      console.log("Handling task update for task:", updatedTask);
      
      if (event.detail.isNew) {
        // 新規作成されたタスクの場合はリストに追加してソート
        console.log("Adding new task to the list", updatedTask);
        updateTasks([updatedTask, ...tasks]);
      } else {
        // 既存タスクの更新の場合は、そのタスクだけを置き換える
        console.log("Updating existing task in the list", updatedTask);
        const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);
        
        if (taskIndex >= 0) {
          // タスクが見つかった場合は置き換えてソート
          console.log(`Task found at index ${taskIndex}, replacing with updated version`);
          const newTasks = [...tasks];
          newTasks[taskIndex] = updatedTask;
          updateTasks(newTasks);
        } else {
          // 更新されたタスクがリストにない場合は追加
          console.log("Updated task not found in current list, adding to top");
          updateTasks([updatedTask, ...tasks]);
        }
      }
    };
    
    const handleTaskDeleted = (event) => {
      console.log("🔔 Task deleted event received", event.detail);
      
      if (!event.detail || !event.detail.taskId) {
        console.warn("Invalid task delete event with no task ID");
        fetchTasks(); // 無効なイベントの場合は全体を再取得
        return;
      }
      
      const deletedTaskId = event.detail.taskId;
      console.log("Removing deleted task from list, ID:", deletedTaskId);
      
      // 削除されたタスクをリストから除外
      updateTasks(tasks.filter(task => task.id !== deletedTaskId));
    };
    
    const handleForceRefresh = () => {
      console.log("🔔 Force refresh event received");
      fetchTasks();
    };
    
    // カスタムイベントのリスナーを追加
    window.addEventListener('task-updated', handleTaskUpdate);
    window.addEventListener('task-deleted', handleTaskDeleted);
    window.addEventListener('task-update-force-refresh', handleForceRefresh);
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('task-updated', handleTaskUpdate);
      window.removeEventListener('task-deleted', handleTaskDeleted);
      window.removeEventListener('task-update-force-refresh', handleForceRefresh);
    };
  }, [tasks]);
  
  // TasksPageから渡されるforceRefreshプロップの変更を監視
  useEffect(() => {
    if (props.forceRefresh) {
      console.log("Force refresh prop changed, refreshing tasks");
      fetchTasks();
    }
  }, [props.forceRefresh]);
  
  // 親コンポーネントに公開するメソッド
  useImperativeHandle(ref, () => ({
    refreshTasks: () => {
      console.log("Refresh tasks method called");
      fetchTasks();
    },
    refreshTasksWithData: (newTask, isNewTask = false) => {
      console.log("Refresh with task data", newTask, "isNew:", isNewTask);
      
      if (!newTask) {
        console.warn("No task data provided for refresh");
        fetchTasks();
        return;
      }
      
      if (isNewTask) {
        console.log("Adding new task to the list");
        updateTasks([newTask, ...tasks]);
      } else {
        console.log("Updating existing task");
        const taskIndex = tasks.findIndex(t => t.id === newTask.id);
        
        if (taskIndex >= 0) {
          const newTasks = [...tasks];
          newTasks[taskIndex] = newTask;
          updateTasks(newTasks);
        } else {
          updateTasks([newTask, ...tasks]);
        }
      }
    }
  }));
  
  // ----- イベントハンドラー -----
  
  // フィルター変更
  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };
  
  // フィルター適用
  const handleFilterApply = () => {
    fetchTasks();
  };
  
  // フィルターリセット
  const handleFilterReset = () => {
    // リセット時には自分が担当者のタスクのみに戻す（デフォルト状態）
    setFilters({
      status: '',
      priority: '',
      searchTerm: '',
      is_fiscal_task: '',
      client: '',
      assignee: currentUser?.id || '',
    });
  };
  
  // 一括編集モード切り替え
  const toggleBulkEditMode = () => {
    const newMode = !bulkEditMode;
    setBulkEditMode(newMode);
    
    if (!newMode) {
      // モードを終了する時に選択をクリア
      setSelectedTasks([]);
    }
  };
  
  // タスク選択切り替え
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };
  
  // 全選択/全解除切り替え
  const toggleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(task => task.id));
    }
  };
  
  // 一括編集実行
  const handleBulkEdit = async () => {
    if (selectedTasks.length === 0) {
      toast.error('タスクが選択されていません');
      return;
    }
    
    setLoading(true);
    try {
      // 空のフィールドをフィルタリング
      const editData = {};
      for (const [key, value] of Object.entries(bulkEditData)) {
        if (value !== '') {
          editData[key] = value;
        }
      }
      
      if (Object.keys(editData).length === 0) {
        toast.error('変更する項目が選択されていません');
        setLoading(false);
        return;
      }
      
      console.log('Bulk editing tasks:', selectedTasks, 'with data:', editData);
      
      // 選択されたタスクごとに更新を実行
      const promises = selectedTasks.map(taskId => 
        tasksApi.updateTask(taskId, editData)
      );
      
      await Promise.all(promises);
      
      toast.success('タスクを一括更新しました');
      setBulkEditModalOpen(false);
      setBulkEditData({
        status: '',
        priority: '',
        assignee: '',
        due_date: ''
      });
      fetchTasks();
    } catch (error) {
      console.error('Error in bulk edit:', error);
      toast.error('一括編集に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // タスク削除
  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    setLoading(true);
    try {
      await tasksApi.deleteTask(selectedTask.id);
      
      toast.success('タスクを削除しました');
      setDeleteModalOpen(false);
      setSelectedTask(null);
      
      // タスク削除後のリスト更新
      updateTasks(tasks.filter(task => task.id !== selectedTask.id));
      
      // 削除イベントを発火
      window.dispatchEvent(new CustomEvent('task-deleted', {
        detail: {
          taskId: selectedTask.id
        }
      }));
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('タスクの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // タスク選択（詳細表示へ遷移）
  const handleTaskSelect = (task) => {
    console.log('Task selected:', task);
    props.onTaskSelect && props.onTaskSelect(task);
  };
  
  // ----- レンダリング -----
  return (
    <div className="mb-6 space-y-6">
      {/* ツールバー */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">タスク一覧</h1>
        
        <div className="flex space-x-2 items-center">
          {/* フィルターボタン */}
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <HiOutlineFilter className="mr-2 h-5 w-5" />
            フィルター
          </button>
          
          {/* 一括編集モードボタン */}
          <button
            className={`inline-flex items-center px-4 py-2 rounded-lg shadow-sm border ${
              bulkEditMode 
                ? 'text-white bg-primary-600 hover:bg-primary-700 border-primary-600' 
                : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'
            }`}
            onClick={toggleBulkEditMode}
          >
            <HiCheck className="mr-2 h-5 w-5" />
            一括編集モード {bulkEditMode ? 'ON' : 'OFF'}
          </button>
          
          {/* 新規タスク作成ボタン */}
          <Link
            to="/tasks/new"
            className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-sm"
          >
            <HiOutlinePlus className="mr-2 h-5 w-5" />
            新規タスク
          </Link>
        </div>
      </div>
      
      {/* フィルターコンポーネント */}
      {showFilters && (
        <TaskFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleFilterApply}
          onResetFilters={handleFilterReset}
          onClose={() => setShowFilters(false)}
          currentUser={currentUser}
        />
      )}
      
      {/* 一括編集バー */}
      {bulkEditMode && selectedTasks.length > 0 && (
        <TaskBulkEditBar
          selectedCount={selectedTasks.length}
          onEdit={() => setBulkEditModalOpen(true)}
        />
      )}
      
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <HiOutlineExclamationCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* タスク一覧 */}
      {loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-500">タスクを読み込み中...</p>
        </div>
      ) : tasks.length > 0 ? (
        <TaskTable 
          tasks={tasks}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          bulkEditMode={bulkEditMode}
          selectedTasks={selectedTasks}
          onSelectTask={toggleTaskSelection}
          onSelectAll={toggleSelectAll}
          onTaskSelect={handleTaskSelect}
        />
      ) : (
        <div className="bg-white shadow-card rounded-lg p-8 text-center">
          <HiOutlineDocumentText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">タスクがありません</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.assignee ? '条件に一致するタスクはありません。' : 'まだタスクが登録されていません。「新規タスク」から追加してください。'}
          </p>
        </div>
      )}
      
      {/* 一括編集モーダル */}
      <TaskBulkEditModal
        isOpen={bulkEditModalOpen}
        onClose={() => setBulkEditModalOpen(false)}
        selectedCount={selectedTasks.length}
        editData={bulkEditData}
        onEditDataChange={(field, value) => setBulkEditData(prev => ({ ...prev, [field]: value }))}
        onSave={handleBulkEdit}
        loading={loading}
      />
      
      {/* 削除確認モーダル */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteTask}
        loading={loading}
        targetName={selectedTask?.title || 'このタスク'}
      />
    </div>
  );
});

export default TaskList; 