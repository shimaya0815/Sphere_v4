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
      onTaskUpdated && onTaskUpdated();
    } catch (error) {
      console.error('Error marking task as complete:', error);
      toast.error('タスクの完了操作中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    if (!priority) return 'bg-gray-100 text-gray-800';
    
    switch (priority.name?.toLowerCase() || priority.toLowerCase()) {
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
    
    switch (status.name?.toLowerCase() || status.toLowerCase()) {
      case 'completed':
      case '完了':
        return 'bg-green-100 text-green-800';
      case 'in progress':
      case '進行中':
        return 'bg-blue-100 text-blue-800';
      case 'in review':
      case 'レビュー中':
        return 'bg-yellow-100 text-yellow-800';
      case 'not started':
      case '未着手':
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
    return status?.name || status || '未設定';
  };

  return (
    <div className={`bg-white rounded-lg shadow-card overflow-hidden transition-all hover:shadow-card-hover ${
      task.completed_at ? 'border-l-4 border-green-500' : 
      isOverdue() ? 'border-l-4 border-red-500' : ''
    }`}>
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
          
          <div className="relative">
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <HiOutlineDotsVertical />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <ul className="py-1">
                  <li>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={() => {
                        onEdit(task);
                        setIsMenuOpen(false);
                      }}
                    >
                      <HiOutlinePencil className="mr-2" />
                      編集
                    </button>
                  </li>
                  <li>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={() => {
                        navigate(`/tasks/${task.id}`);
                        setIsMenuOpen(false);
                      }}
                    >
                      <HiOutlineEye className="mr-2" />
                      詳細を表示
                    </button>
                  </li>
                  <li>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={handleTimerToggle}
                    >
                      {isTimerRunning ? 
                        <><HiOutlineStop className="mr-2" />タイマー停止</> : 
                        <><HiOutlinePlay className="mr-2" />タイマー開始</>
                      }
                    </button>
                  </li>
                  {!task.completed_at && (
                    <li>
                      <button 
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        onClick={handleMarkComplete}
                      >
                        <HiOutlineClipboardCheck className="mr-2" />
                        完了としてマーク
                      </button>
                    </li>
                  )}
                  <li>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      onClick={() => {
                        onDelete(task);
                        setIsMenuOpen(false);
                      }}
                    >
                      <HiOutlineTrash className="mr-2" />
                      削除
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center flex-wrap gap-2 mt-4">
          {task.status && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {getStatusName(task.status)}
            </span>
          )}
          
          {task.priority && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority.name || task.priority}
            </span>
          )}
          
          {task.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {task.category.name || task.category}
            </span>
          )}
          
          {/* 決算期関連タスクバッジ */}
          {task.is_fiscal_task && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              <HiOutlineDocumentDuplicate className="mr-1" />
              {task.fiscal_period ? `第${task.fiscal_period}期` : '決算'}
            </span>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {task.assignee && (
            <div className="flex items-center">
              <HiOutlineUserCircle className="mr-1" />
              <span>{task.assignee.get_full_name || task.assignee}</span>
            </div>
          )}
          
          {task.due_date && (
            <div className={`flex items-center ${isOverdue() ? 'text-red-600' : ''}`}>
              <HiOutlineCalendar className="mr-1" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
          
          {task.estimated_hours && (
            <div className="flex items-center">
              <HiOutlineClock className="mr-1" />
              <span>{task.estimated_hours}時間</span>
            </div>
          )}
          
          {/* クライアント名の表示 */}
          {task.client_name && (
            <div className="flex items-center">
              <HiOutlineOfficeBuilding className="mr-1" />
              <span className="truncate max-w-[150px]">{task.client_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;