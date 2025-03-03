import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  HiOutlineArrowLeft, 
  HiOutlineClock, 
  HiOutlineCalendar, 
  HiOutlineUserCircle,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePlay,
  HiOutlineStop,
  HiOutlineClipboardCheck,
  HiOutlineDocumentText,
  HiOutlinePaperClip
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { tasksApi } from '../../api';
import TaskComments from './TaskComments';
import TaskHistory from './TaskHistory';

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const data = await tasksApi.getTask(taskId);
      setTask(data);
      
      // タイマーの状態を確認
      const isRunning = !!data.active_timer;
      setIsTimerRunning(isRunning);
      
      setError(null);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setError('タスクの詳細を取得できませんでした');
      toast.error('タスクの詳細を取得できませんでした');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // タスク編集画面への遷移またはモーダル表示などを実装
    navigate(`/tasks/${taskId}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`タスク「${task.title}」を削除してもよろしいですか？`)) {
      return;
    }
    
    try {
      await tasksApi.deleteTask(taskId);
      toast.success('タスクが削除されました');
      navigate('/tasks');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('タスクの削除に失敗しました');
    }
  };

  const handleTimerToggle = async () => {
    try {
      if (isTimerRunning) {
        // タイマーを停止
        await tasksApi.stopTimer(taskId);
        toast.success('タイマーを停止しました');
        setIsTimerRunning(false);
      } else {
        // タイマーを開始
        await tasksApi.startTimer(taskId);
        toast.success('タイマーを開始しました');
        setIsTimerRunning(true);
      }
      // タスク情報を更新
      fetchTask();
    } catch (error) {
      console.error('Error toggling timer:', error);
      toast.error('タイマーの操作中にエラーが発生しました');
    }
  };

  const handleMarkComplete = async () => {
    try {
      await tasksApi.markComplete(taskId);
      toast.success('タスクを完了としてマークしました');
      fetchTask();
    } catch (error) {
      console.error('Error marking task as complete:', error);
      toast.error('タスクの完了操作中にエラーが発生しました');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error || 'タスクが見つかりませんでした'}
      </div>
    );
  }

  const getStatusBadgeClass = () => {
    if (!task.status) return 'bg-gray-100 text-gray-800';
    
    const statusName = task.status_name?.toLowerCase() || '';
    if (statusName.includes('complete') || statusName.includes('完了')) {
      return 'bg-green-100 text-green-800';
    } else if (statusName.includes('progress') || statusName.includes('進行中')) {
      return 'bg-blue-100 text-blue-800';
    } else if (statusName.includes('review') || statusName.includes('レビュー')) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeClass = () => {
    if (!task.priority) return 'bg-gray-100 text-gray-800';
    
    const priorityName = task.priority_name?.toLowerCase() || '';
    if (priorityName.includes('high') || priorityName.includes('高')) {
      return 'bg-red-100 text-red-800';
    } else if (priorityName.includes('medium') || priorityName.includes('中')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (priorityName.includes('low') || priorityName.includes('低')) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* ヘッダー部分 */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/tasks')} 
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <HiOutlineArrowLeft className="w-5 h-5 mr-1" />
            <span>タスク一覧へ戻る</span>
          </button>
          
          <div className="flex space-x-2">
            {!task.completed_at && (
              <>
                <button 
                  onClick={handleTimerToggle} 
                  className={`px-3 py-1 rounded-md text-white ${
                    isTimerRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isTimerRunning ? (
                    <><HiOutlineStop className="inline mr-1" /> タイマー停止</>
                  ) : (
                    <><HiOutlinePlay className="inline mr-1" /> タイマー開始</>
                  )}
                </button>
                
                <button 
                  onClick={handleMarkComplete} 
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md"
                >
                  <HiOutlineClipboardCheck className="inline mr-1" /> 完了
                </button>
              </>
            )}
            
            <button 
              onClick={handleEdit} 
              className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-md"
            >
              <HiOutlinePencil className="inline mr-1" /> 編集
            </button>
            
            <button 
              onClick={handleDelete} 
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md"
            >
              <HiOutlineTrash className="inline mr-1" /> 削除
            </button>
          </div>
        </div>
      </div>
      
      {/* タスク詳細コンテンツ */}
      <div className="p-6">
        <h1 className={`text-2xl font-bold ${task.completed_at ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
          {task.title}
        </h1>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {task.status && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass()}`}>
              {task.status_name}
            </span>
          )}
          
          {task.priority && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass()}`}>
              {task.priority_name}
            </span>
          )}
          
          {task.category && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {task.category_name}
            </span>
          )}
          
          {task.completed_at && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {formatDate(task.completed_at)} に完了
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-800">詳細情報</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-gray-500">作成者</div>
                <div className="text-sm font-medium">{task.creator_name || '未設定'}</div>
                
                <div className="text-sm text-gray-500">担当者</div>
                <div className="text-sm font-medium">{task.assignee_name || '未設定'}</div>
                
                <div className="text-sm text-gray-500">承認者</div>
                <div className="text-sm font-medium">{task.approver_name || '未設定'}</div>
                
                <div className="text-sm text-gray-500">作成日</div>
                <div className="text-sm font-medium">{formatDate(task.created_at)}</div>
                
                <div className="text-sm text-gray-500">期限日</div>
                <div className="text-sm font-medium">
                  {task.due_date ? formatDate(task.due_date) : '未設定'}
                </div>
                
                <div className="text-sm text-gray-500">見積時間</div>
                <div className="text-sm font-medium">
                  {task.estimated_hours ? `${task.estimated_hours}時間` : '未設定'}
                </div>
                
                {/* クライアント情報の表示 */}
                {(task.client || task.client_name) && (
                  <>
                    <div className="text-sm text-gray-500">クライアント</div>
                    <div className="text-sm font-medium">
                      {task.client ? task.client.name : task.client_name}
                    </div>
                  </>
                )}
                
                {/* 決算期関連タスクの場合、決算期情報を表示 */}
                {task.is_fiscal_task && (
                  <>
                    <div className="text-sm text-gray-500">決算期タスク</div>
                    <div className="text-sm font-medium">
                      {task.fiscal_year ? 
                        `第${task.fiscal_year.fiscal_period}期 (${formatDate(task.fiscal_year.start_date)} 〜 ${formatDate(task.fiscal_year.end_date)})` : 
                        task.fiscal_period ? 
                          `第${task.fiscal_period}期` : 
                          '決算期タスク'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-800">説明</h2>
            <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
              {task.description ? (
                <div className="prose max-w-none">
                  {task.description.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">説明はありません</p>
              )}
            </div>
          </div>
        </div>
        
        {/* タブ付きセクション（コメント、履歴、添付ファイル） */}
        <div className="mt-10">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'comments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('comments')}
              >
                コメント
              </button>
              <button
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('history')}
              >
                履歴
              </button>
              <button
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'attachments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('attachments')}
              >
                添付ファイル
              </button>
            </nav>
          </div>
          
          <div className="py-6">
            {activeTab === 'comments' && (
              <TaskComments taskId={taskId} onCommentAdded={fetchTask} />
            )}
            
            {activeTab === 'history' && (
              <TaskHistory taskId={taskId} />
            )}
            
            {activeTab === 'attachments' && (
              <div className="text-center py-10 text-gray-500">
                <HiOutlinePaperClip className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">添付ファイル機能は現在開発中です</h3>
                <p className="mt-1 text-sm">今後のアップデートをお待ちください</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;