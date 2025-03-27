import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineClock, 
  HiOutlineDotsVertical, 
  HiOutlinePencil, 
  HiOutlineTrash, 
  HiOutlinePlay,
  HiOutlineStop,
  HiOutlineClipboardCheck,
  HiOutlineCalendar,
  HiOutlineUserCircle,
  HiOutlineEye,
  HiOutlineOfficeBuilding,
  HiOutlineDocumentDuplicate
} from 'react-icons/hi';
// import { format } from 'date-fns';
// import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { tasksApi } from '../../api';

const TaskItem = ({ task, onEdit, onDelete, onTaskUpdated }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(!!task.active_timer);
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // 簡易的な日付フォーマット（date-fnsがないため）
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } catch (error) {
      console.error('Invalid date format:', error);
      return dateString;
    }
  };

  const handleTimerToggle = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (isTimerRunning) {
        // タイマーを停止
        await tasksApi.stopTimer(task.id);
        toast.success('タイマーを停止しました');
        setIsTimerRunning(false);
        onTaskUpdated && onTaskUpdated();
      } else {
        // タイマーを開始
        await tasksApi.startTimer(task.id);
        toast.success('タイマーを開始しました');
        setIsTimerRunning(true);
        onTaskUpdated && onTaskUpdated();
      }
    } catch (error) {
      console.error('Error toggling timer:', error);
      toast.error('タイマーの操作中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await tasksApi.markComplete(task.id);
      toast.success('タスクを完了としてマークしました');
      
      // タスクリストを強制的に更新するイベントを発火
      window.dispatchEvent(new CustomEvent('task-update-force-refresh'));
      
      // 親コンポーネントの更新関数を呼び出し
      onTaskUpdated && onTaskUpdated();
    } catch (error) {
      console.error('Error marking task as complete:', error);
      toast.error('タスクの完了操作中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (statusId) => {
    if (loading) return;
    
    setLoading(true);
    try {
      await tasksApi.changeStatus(task.id, { status_id: statusId });
      toast.success('タスクのステータスを変更しました');
      
      // タスクリストを強制的に更新するイベントを発火
      window.dispatchEvent(new CustomEvent('task-update-force-refresh'));
      
      // 親コンポーネントの更新関数を呼び出し
      onTaskUpdated && onTaskUpdated();
    } catch (error) {
      console.error('Error changing task status:', error);
      toast.error('ステータス変更中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    if (!priority) return 'bg-gray-100 text-gray-800';
    
    // APIレスポンスが数値かオブジェクトかなどの形式を判定
    const priorityName = typeof priority === 'object' && priority.name 
      ? priority.name.toLowerCase()
      : typeof priority === 'string' 
        ? priority.toLowerCase()
        : priority;
    
    // 数値の場合は優先度レベルで判定（1:低, 2:中, 3:高）
    if (typeof priority === 'number' || !isNaN(Number(priority))) {
      const level = Number(priority);
      if (level === 3) return 'bg-red-100 text-red-800'; // 高
      if (level === 2) return 'bg-yellow-100 text-yellow-800'; // 中
      if (level === 1) return 'bg-green-100 text-green-800'; // 低
      return 'bg-gray-100 text-gray-800';
    }
    
    // 名前で判定
    switch (priorityName) {
      case 'high':
      case '高':
        return 'bg-red-100 text-red-800';
      case 'medium':
      case '中':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
      case '低':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    // APIレスポンスが数値かオブジェクトかなどの形式を判定
    const statusName = typeof status === 'object' && status.name 
      ? status.name.toLowerCase()
      : typeof status === 'string' 
        ? status.toLowerCase()
        : status;
    
    // status_nameがある場合はそれを使用
    if (task.status_name) {
      const name = task.status_name.toLowerCase();
      if (name.includes('完了')) return 'bg-green-100 text-green-800';
      if (name.includes('進行') || name.includes('作業中')) return 'bg-blue-100 text-blue-800';
      if (name.includes('レビュー')) return 'bg-yellow-100 text-yellow-800';
      if (name.includes('未着手')) return 'bg-gray-100 text-gray-800';
    }
    
    // 数値の場合はステータスコードで判定（仮定）
    if (typeof status === 'number' || !isNaN(Number(status))) {
      const code = Number(status);
      if (code === 4) return 'bg-green-100 text-green-800'; // 完了
      if (code === 2) return 'bg-blue-100 text-blue-800'; // 進行中
      if (code === 3) return 'bg-yellow-100 text-yellow-800'; // レビュー中
      if (code === 1) return 'bg-gray-100 text-gray-800'; // 未着手
      return 'bg-gray-100 text-gray-800';
    }
    
    // 名前で判定
    switch (statusName) {
      case 'completed':
      case '完了':
        return 'bg-green-100 text-green-800';
      case 'in progress':
      case '進行中':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'in review':
      case 'レビュー中':
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'not started':
      case '未着手':
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = () => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && !task.completed_at;
  };

  const getStatusName = (status) => {
    if (!status) return '未設定';
    
    // status_nameがある場合はそれを使用
    if (task.status_name) return task.status_name;
    
    // オブジェクトの場合はnameプロパティを使用
    if (typeof status === 'object' && status.name) return status.name;
    
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
  
  const getPriorityName = (priority) => {
    if (!priority) return '未設定';
    
    // priority_valueがある場合はそれを使用
    if (priority.priority_value) return String(priority.priority_value);
    
    // priority_nameがある場合はそれを使用
    if (task.priority_name) return task.priority_name;
    
    // オブジェクトの場合はnameプロパティを使用
    if (typeof priority === 'object' && priority.name) return priority.name;
    
    // その他の場合は値をそのまま返す
    return String(priority);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-card overflow-hidden transition-all hover:shadow-card-hover cursor-pointer ${
        task.completed_at ? 'border-l-4 border-green-500' : 
        isOverdue() ? 'border-l-4 border-red-500' : ''
      }`}
      onClick={() => onEdit(task)} // カード全体をクリック可能に
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-2 ${task.completed_at ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
              {task.title}
            </h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {task.description || '説明なし'}
            </p>
          </div>
          
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation(); // カード全体のクリックイベントを防止
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              aria-label="タスクメニュー"
            >
              <HiOutlineDotsVertical className="w-5 h-5" />
            </button>
            
            {isMenuOpen && (
              <div 
                className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 py-1 text-sm"
                onClick={(e) => e.stopPropagation()} // カード全体のクリックイベント防止
              >
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(task);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center text-gray-700"
                >
                  <HiOutlinePencil className="mr-2" />
                  編集
                </button>
                
                {/* 完了マークボタン */}
                {!task.completed_at && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkComplete();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center text-gray-700"
                  >
                    <HiOutlineClipboardCheck className="mr-2" />
                    完了としてマーク
                  </button>
                )}
                
                {/* タイマーボタン */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTimerToggle();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center text-gray-700"
                >
                  {isTimerRunning ? (
                    <>
                      <HiOutlineStop className="mr-2" />
                      タイマー停止
                    </>
                  ) : (
                    <>
                      <HiOutlinePlay className="mr-2" />
                      タイマー開始
                    </>
                  )}
                </button>
                
                {/* 削除ボタン */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onDelete(task);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center text-red-600"
                >
                  <HiOutlineTrash className="mr-2" />
                  削除
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center flex-wrap gap-2 mt-4">
          {/* ステータス - 最初に表示 */}
          {task.status && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {getStatusName(task.status)}
            </span>
          )}
          
          {/* クライアント名の表示 */}
          {(task.client_name || (task.client && task.client.name)) && (
            <div className="flex items-center text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              <HiOutlineOfficeBuilding className="mr-1" />
              <span className="truncate max-w-[150px]">
                {task.client_name || (task.client && task.client.name)}
              </span>
            </div>
          )}
          
          {/* カテゴリー */}
          {task.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {typeof task.category === 'object' && task.category.name ? task.category.name : String(task.category)}
            </span>
          )}
          
          {/* 決算期関連タスクバッジ */}
          {task.is_fiscal_task && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              <HiOutlineDocumentDuplicate className="mr-1" />
              {task.fiscal_year ? 
                `第${task.fiscal_year.fiscal_period}期` : 
                task.fiscal_period ? 
                  `第${task.fiscal_period}期` : 
                  '決算'}
            </span>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {/* 担当者 */}
          {task.assignee && (
            <div className="flex items-center">
              <HiOutlineUserCircle className="mr-1" />
              <span>{task.assignee.get_full_name || task.assignee}</span>
            </div>
          )}
          
          {/* 期限日 */}
          {task.due_date && (
            <div className={`flex items-center ${isOverdue() ? 'text-red-600' : ''}`}>
              <HiOutlineCalendar className="mr-1" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
          
          {/* 優先度 */}
          {task.priority && (
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}>
                優先度: {getPriorityName(task.priority)}
              </span>
            </div>
          )}
          
          {/* 見積時間 */}
          {task.estimated_hours && (
            <div className="flex items-center">
              <HiOutlineClock className="mr-1" />
              <span>{task.estimated_hours}時間</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;