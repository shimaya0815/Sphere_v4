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

const TaskList = (props) => {
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
    
    // priority_nameがある場合はそれを使用
    if (typeof priority === 'object' && priority.name) {
      return priority.name;
    }
    
    // 数値の場合は優先度レベルからマッピング
    if (typeof priority === 'number' || !isNaN(Number(priority))) {
      const level = Number(priority);
      if (level === 3) return '高';
      if (level === 2) return '中';
      if (level === 1) return '低';
    }
    
    // その他の場合は値をそのまま返す
    return String(priority);
  };
  
  const getStatusName = (status) => {
    if (!status) return '未設定';
    
    // オブジェクトの場合はnameプロパティを使用
    if (typeof status === 'object' && status.name) {
      return status.name;
    }
    
    // 数値の場合はステータスコードからマッピング
    if (typeof status === 'number' || !isNaN(Number(status))) {
      const code = Number(status);
      if (code === 4) return '完了';
      if (code === 2) return '進行中';
      if (code === 3) return 'レビュー中';
      if (code === 1) return '未着手';
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
      
      const response = await tasksApi.getTasks(cleanFilters);
      // レスポンスの形式をログ出力して確認
      console.log('API Response:', response);
      
      // レスポンスが配列かオブジェクトかを確認
      if (Array.isArray(response)) {
        setTasks(response);
      } else if (response && Array.isArray(response.results)) {
        setTasks(response.results);
      } else if (response && typeof response === 'object') {
        // 空の配列をデフォルトとして設定
        setTasks([]);
        console.warn('API response is not an array, received:', typeof response);
      } else {
        // それ以外の場合も空配列を設定
        setTasks([]);
        console.warn('Unexpected API response format:', response);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('タスク一覧の取得に失敗しました');
      toast.error('タスク一覧の取得に失敗しました');
      // エラー時は空の配列を設定
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);
  
  // 親コンポーネントからタスク更新通知を受け取るためのイベントハンドラ
  useEffect(() => {
    const handleTaskUpdate = () => {
      fetchTasks();
    };
    
    // カスタムイベントのリスナーを追加
    window.addEventListener('task-updated', handleTaskUpdate);
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('task-updated', handleTaskUpdate);
    };
  }, []);

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
      await tasksApi.deleteTask(selectedTask.id);
      toast.success('タスクを削除しました');
      fetchTasks();
      setDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('タスクの削除に失敗しました');
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
              setSelectedTask(null);
              setModalOpen(true);
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
              setSelectedTask(null);
              setModalOpen(true);
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
                <th>タイトル</th>
                <th>ステータス</th>
                <th>優先度</th>
                <th>カテゴリー</th>
                <th>担当者</th>
                <th>期限日</th>
                <th>クライアント</th>
                <th>操作</th>
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
                      props.onTaskSelect ? props.onTaskSelect(task) : null;
                    }
                  }}
                >
                  <td className="font-medium">
                    {task.title}
                  </td>
                  <td>
                    {task.status && (
                      <span className={`badge ${
                        task.status_name?.includes('完了') ? 'badge-success' :
                        task.status_name?.includes('進行中') ? 'badge-info' :
                        task.status_name?.includes('レビュー') ? 'badge-warning' :
                        'badge-ghost'
                      }`}>
                        {task.status_name || getStatusName(task.status)}
                      </span>
                    )}
                  </td>
                  <td>
                    {task.priority && (
                      <span className={`badge ${
                        task.priority_name?.includes('高') ? 'badge-error' :
                        task.priority_name?.includes('中') ? 'badge-warning' :
                        task.priority_name?.includes('低') ? 'badge-success' :
                        'badge-ghost'
                      }`}>
                        {task.priority_name || getPriorityName(task.priority)}
                      </span>
                    )}
                  </td>
                  <td>
                    {task.category && (
                      <span className="badge badge-outline badge-primary">
                        {task.category_name || (task.category.name || task.category)}
                      </span>
                    )}
                  </td>
                  <td>
                    {task.assignee_name || (task.assignee?.name || '')}
                  </td>
                  <td>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    {task.client_name || (task.client?.name || '')}
                    {task.is_fiscal_task && <span className="ml-1 badge badge-xs badge-accent">決算</span>}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex space-x-1">
                      <button 
                        className="btn btn-xs btn-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onTaskSelect ? props.onTaskSelect(task) : handleEditTask(task);
                        }}
                      >
                        編集
                      </button>
                      <button 
                        className="btn btn-xs btn-outline btn-error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfirm(task);
                        }}
                      >
                        削除
                      </button>
                    </div>
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
};

export default TaskList;