import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import { tasksApi } from '../../api';
import toast from 'react-hot-toast';
import { 
  HiOutlineFilter, 
  HiOutlinePlus, 
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineExclamationCircle,
  HiOutlineDocumentText
} from 'react-icons/hi';
// import { Dialog, Transition } from '@headlessui/react';

// forwardRefを使用してコンポーネントから参照できるようにする
const TaskList = React.forwardRef((props, ref) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    searchTerm: '',
    is_fiscal_task: '',
    client: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const getPriorityName = (priority) => {
    if (!priority) return '未設定';
    
    // priority_dataが設定されている場合（APIからのレスポンス）
    if (typeof priority === 'object' && priority.priority_data && priority.priority_data.priority_value !== undefined) {
      return String(priority.priority_data.priority_value);
    }
    
    // オブジェクトで直接priority_valueがある場合
    if (typeof priority === 'object' && priority.priority_value !== undefined) {
      return String(priority.priority_value);
    }
    
    // IDではなく実際の優先度値を表示する
    // ここをコメントすると、IDが表示される
    // console.log('Priority object ID (not value):', priority);
    
    // その他の場合は値をそのまま返す
    return String(priority);
  };
  
  const getStatusName = (status) => {
    if (!status) return '未設定';
    
    // status_dataが設定されている場合（APIからのレスポンス）
    if (typeof status === 'object' && status.status_data && status.status_data.name) {
      return status.status_data.name;
    }
    
    // オブジェクトの場合はnameプロパティを使用
    if (typeof status === 'object' && status.name) {
      return status.name;
    }
    
    // 数値の場合は、ステータスIDが直接使われている可能性あり
    // ここでは適切なマッピングを行わず、そのまま値を返す
    if (typeof status === 'number' || !isNaN(Number(status))) {
      // ステータスIDはフロントエンドで解決しない
      return `ステータスID: ${status}`;
    }
    
    // その他の場合は値をそのまま返す
    return String(status);
  };

  // タスク一覧を取得
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
      
      try {
        // APIリクエスト
        const response = await tasksApi.getTasks(cleanFilters);
        console.log('API Response full:', response);
        console.log('API Response type:', typeof response);
        console.log('API Response keys:', response ? Object.keys(response) : 'null');
        
        // Response構造を詳細にログ
        if (response && typeof response === 'object') {
          console.log('Response has results property:', 'results' in response);
          if ('results' in response) {
            console.log('Results is array:', Array.isArray(response.results));
            console.log('Results length:', Array.isArray(response.results) ? response.results.length : 'N/A');
          }
        }
        
        // API応答チェック - 改良版で詳細なログを出力
        if (response && Array.isArray(response.results)) {
          console.log('Using API response results array:', response.results.length);
          setTasks(response.results);
          setError(null);
        } else if (Array.isArray(response)) {
          console.log('Using raw API response array:', response.length);
          setTasks(response);
          setError(null);
        } else if (response && typeof response === 'object' && Object.keys(response).length > 0) {
          console.warn('API response format unexpected:', response);
          if (response.results && response.results.length === 0) {
            // 結果が空の場合は空のタスク配列を設定
            console.log('Empty results from API');
            setTasks([]);
            setError(null);
          } else {
            // 形式は想定外だが何かデータはある
            console.log('Using unexpected API response format as fallback');
            if (response.detail) {
              // エラーメッセージがある場合
              console.error('API returned error:', response.detail);
              setError(`APIエラー: ${response.detail}`);
              setTasks([]);
            } else {
              // それ以外の場合、オブジェクトをタスクとして扱う
              console.log('Treating response object as a task');
              setTasks([response]);
              setError(null);
            }
          }
        } else {
          // APIからのデータがない場合はエラー表示
          console.error('API returned no usable data');
          setError('タスク情報の読み込みに失敗しました。データ形式が不正です。');
          setTasks([]);
        }
      } finally {
        console.groupEnd();
      }
    } catch (error) {
      console.error('Error in fetchTasks:', error);
      setError('タスク一覧の取得に失敗しました');
      toast.error('タスク一覧の取得に失敗しました');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTasks = async () => {
      try {
        await fetchTasks();
        console.log('Initial tasks loaded successfully');
      } catch (err) {
        console.error('Failed to load initial tasks:', err);
      }
    };
    
    loadTasks();
    
    // デバッグ用にAPI応答をログ出力
    console.log('Initial fetchTasks called');
    
    // 冗長性のために第2の初期ロードを実施 (APIが安定するまでの一時的な対策)
    const retryTimeout = setTimeout(() => {
      console.log('Retry fetchTasks after timeout');
      loadTasks();
    }, 1500);
    
    return () => clearTimeout(retryTimeout);
  }, []);
  
  // 親コンポーネントからタスク更新通知を受け取るためのイベントハンドラ
  useEffect(() => {
    const handleTaskUpdate = (event) => {
      console.log("🔔 Task updated event received", event.detail);
      
      // イベント詳細とタスクデータの確認
      if (!event.detail || !event.detail.task) {
        console.warn("Invalid task update event with no task data");
        fetchTasks(); // 無効なイベントの場合は全体を再取得
        return;
      }
      
      const updatedTask = event.detail.task;
      console.log("Handling task update for task:", updatedTask);
      
      if (event.detail.isNew) {
        // 新規作成されたタスクの場合はリストの先頭に追加
        console.log("Adding new task to the list", updatedTask);
        setTasks(prevTasks => [updatedTask, ...prevTasks]);
      } else {
        // 既存タスクの更新の場合は、そのタスクだけを置き換える
        console.log("Updating existing task in the list", updatedTask);
        setTasks(prevTasks => {
          // 更新されたタスクが既存リストに含まれているか確認
          const taskIndex = prevTasks.findIndex(t => t.id === updatedTask.id);
          
          if (taskIndex >= 0) {
            // タスクが見つかった場合は置き換え
            console.log(`Task found at index ${taskIndex}, replacing with updated version`);
            const newTasks = [...prevTasks];
            newTasks[taskIndex] = updatedTask;
            return newTasks;
          } else {
            // 更新されたタスクがリストにない場合は追加（または完全再取得）
            console.log("Updated task not found in current list, fetching all tasks");
            // APIから再取得する前に一時的に表示するため、先頭に追加
            return [updatedTask, ...prevTasks];
          }
        });
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
      setTasks(prevTasks => prevTasks.filter(task => task.id !== deletedTaskId));
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
  }, []);
  
  // TasksPageから渡されるforceRefreshプロップの変更を監視
  useEffect(() => {
    if (props.forceRefresh) {
      console.log("Force refresh prop changed, refreshing tasks");
      fetchTasks();
    }
  }, [props.forceRefresh]);
  
  // 親コンポーネントに公開するメソッド
  React.useImperativeHandle(ref, () => ({
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
        // 新規タスクの場合はリストの先頭に追加
        console.log("Adding new task to list");
        setTasks(prevTasks => [newTask, ...prevTasks]);
      } else {
        // 既存タスクの更新の場合は、そのタスクだけを置き換える
        console.log("Updating existing task in list");
        setTasks(prevTasks => {
          // 更新されたタスクが既存リストに含まれているか確認
          const taskIndex = prevTasks.findIndex(t => t.id === newTask.id);
          
          if (taskIndex >= 0) {
            // タスクが見つかった場合は置き換え
            console.log(`Task found at index ${taskIndex}, replacing with updated version`);
            const newTasks = [...prevTasks];
            newTasks[taskIndex] = newTask;
            return newTasks;
          } else {
            // タスクが見つからない場合は先頭に追加
            console.log("Task not found in current list, adding to top");
            return [newTask, ...prevTasks];
          }
        });
      }
    }
  }));

  // フィルター変更時に再検索
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterApply = () => {
    fetchTasks();
  };

  const handleFilterReset = () => {
    setFilters({
      status: '',
      priority: '',
      searchTerm: '',
      is_fiscal_task: '',
      client: '',
    });
    fetchTasks();
  };

  // タスク編集
  const handleEditTask = (task) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  // タスク削除確認
  const handleDeleteConfirm = (task) => {
    setSelectedTask(task);
    setDeleteModalOpen(true);
  };

  // タスク削除実行
  const handleDeleteTask = async () => {
    try {
      const deletedTaskId = selectedTask.id;
      await tasksApi.deleteTask(deletedTaskId);
      
      // 先にモーダルを閉じる
      setDeleteModalOpen(false);
      
      // 削除の成功メッセージを表示
      toast.success('タスクを削除しました');
      
      // タスク削除のカスタムイベントをディスパッチ
      const taskDeletedEvent = new CustomEvent('task-deleted', {
        detail: {
          taskId: deletedTaskId,
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(taskDeletedEvent);
      console.log('📣 Dispatched task-deleted event', { taskId: deletedTaskId });
      
      // バックグラウンドでデータを更新
      fetchTasks();
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('タスクの削除に失敗しました');
      return false;
    }
  };

  return (
    <div>
      {/* ヘッダー部分 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">タスク管理</h1>
        
        <div className="flex items-center space-x-2">
          <button
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors flex items-center"
            onClick={() => setShowFilters(!showFilters)}
          >
            <HiOutlineFilter className="mr-2" />
            フィルター
          </button>
          
          <Link
            to="/tasks/templates"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors flex items-center"
          >
            <HiOutlineDocumentText className="mr-2" />
            テンプレート
          </Link>
          
          <button
            className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center"
            onClick={() => {
              if (props.onNewTask) {
                props.onNewTask();
              } else {
                setSelectedTask(null);
                setModalOpen(true);
              }
            }}
          >
            <HiOutlinePlus className="mr-2" />
            新規タスク
          </button>
        </div>
      </div>
      
      {/* フィルター部分 */}
      {showFilters && (
        <div className="bg-white shadow-card rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-700">検索条件</h2>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setShowFilters(false)}
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タスク名検索</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="pl-10 appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="タスク名を入力..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">すべて</option>
                <option value="not_started">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="in_review">レビュー中</option>
                <option value="completed">完了</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
              <select
                className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">すべて</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            
            {/* 決算期タスクフィルター追加 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タスク種別</label>
              <select
                className="appearance-none relative block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={filters.is_fiscal_task}
                onChange={(e) => handleFilterChange('is_fiscal_task', e.target.value)}
              >
                <option value="">すべて</option>
                <option value="true">決算期関連タスク</option>
                <option value="false">通常タスク</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors text-sm"
                onClick={handleFilterApply}
              >
                検索
              </button>
              <button
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm"
                onClick={handleFilterReset}
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* タスク一覧 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
          <HiOutlineExclamationCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white shadow-card rounded-lg p-12 text-center">
          <p className="text-lg text-gray-600 mb-6">タスクがまだありません</p>
          <button
            className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors inline-flex items-center"
            onClick={() => {
              if (props.onNewTask) {
                props.onNewTask();
              } else {
                setSelectedTask(null);
                setModalOpen(true);
              }
            }}
          >
            <HiOutlinePlus className="mr-2" />
            最初のタスクを作成
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>ステータス</th>
                <th>タイトル</th>
                <th>担当者</th>
                <th>期限日</th>
                <th>優先度</th>
                <th>クライアント</th>
                <th>カテゴリー</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr 
                  key={task.id} 
                  className="hover cursor-pointer" 
                  onClick={(e) => {
                    // クリックが「編集」や「削除」ボタンでなければ、行全体のクリックとして扱う
                    if (!e.target.closest('button')) {
                      if (props.onTaskSelect) props.onTaskSelect(task);
                    }
                  }}
                >
                  <td>
                    {task.status && (
                      <span className={`badge ${
                        // ステータス名に基づくスタイルの適用
                        (task.status_data?.name || '').includes('完了') ? 'badge-success' :
                        (task.status_data?.name || '').includes('作業中') || 
                        (task.status_data?.name || '').includes('進行中') ? 'badge-info' :
                        (task.status_data?.name || '').includes('レビュー') ? 'badge-warning' :
                        'badge-ghost'
                      }`}>
                        {/* 優先度と同様にAPIからの最新データを優先して表示 */}
                        {task.status_data ? task.status_data.name : getStatusName(task.status)}
                      </span>
                    )}
                  </td>
                  <td className="font-medium">
                    {task.title}
                  </td>
                  <td>
                    {task.assignee_data?.name || task.assignee_name || (task.assignee?.name || '')}
                  </td>
                  <td>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    {task.priority && (
                      <span className="badge">
                        {task.priority_data ? 
                          task.priority_data.priority_value : 
                          getPriorityName(task.priority)}
                      </span>
                    )}
                  </td>
                  <td>
                    {task.client_data?.name || task.client_name || (task.client?.name || '')}
                    {task.is_fiscal_task && <span className="ml-1 badge badge-xs badge-accent">決算</span>}
                  </td>
                  <td>
                    {task.category && (
                      <span className="badge badge-outline badge-primary">
                        {task.category_data?.name || task.category_name || (typeof task.category === 'object' ? task.category.name : task.category)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* タスク追加・編集モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div className="fixed inset-0 bg-black opacity-30"></div>
            
            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block w-full max-w-3xl my-8 text-left align-middle bg-white rounded-lg shadow-xl overflow-hidden transform transition-all">
              <TaskForm 
                task={selectedTask}
                onClose={() => setModalOpen(false)}
                onTaskSaved={() => {
                  fetchTasks();
                  setModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* タスク削除確認モーダル */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div className="fixed inset-0 bg-black opacity-30"></div>
            
            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle bg-white rounded-lg shadow-xl transform transition-all">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                タスクの削除
              </h3>
              
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  「{selectedTask?.title}」を削除してもよろしいですか？この操作は元に戻せません。
                </p>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  onClick={handleDeleteTask}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default TaskList;