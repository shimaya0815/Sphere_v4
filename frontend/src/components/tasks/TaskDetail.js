import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TaskTimerButton from './TaskTimerButton';
import TaskTimeTracker from './TaskTimeTracker';
import TaskComments from './TaskComments';
import { tasksApi } from '../../api';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify';

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        // 実際のAPIを使用
        const data = await tasksApi.getTask(taskId);
        setTask(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching task details:', error);
        setError('タスクの詳細を取得できませんでした');
        toast.error('タスクの詳細を取得できませんでした');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [taskId]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* ヘッダー部分 */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/tasks')} 
            className="text-gray-600 hover:text-gray-900"
          >
            ← タスク一覧へ戻る
          </button>
          
          <div className="flex space-x-2">
            <button 
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
            >
              編集
            </button>
            
            <button 
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md"
            >
              削除
            </button>
          </div>
        </div>
      </div>
      
      {/* タスク詳細コンテンツ */}
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h1 className="text-2xl font-bold text-gray-800">
            {task.title}
          </h1>
          <TaskTimerButton task={task} />
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {task.status_data && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                style={{backgroundColor: `${task.status_data.color}30`, color: task.status_data.color}}>
              {task.status_data.name}
            </span>
          )}
          
          {task.priority_data && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                style={{backgroundColor: `${task.priority_data.color}30`, color: task.priority_data.color}}>
              {task.priority_data.priority_value}
            </span>
          )}
          
          {task.is_fiscal_task && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              決算タスク
            </span>
          )}
        </div>
        
        {/* Time tracking section */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-1">時間管理</h3>
              <div className="text-blue-700">
                見積時間: {task.estimated_hours}時間
              </div>
            </div>
            
            <div className="mt-2 md:mt-0">
              <TaskTimeTracker taskId={task.id} />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-800">詳細情報</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-sm text-gray-500">担当者</div>
                <div className="text-sm font-medium col-span-2">{task.assignee_name || '未設定'}</div>
                
                <div className="text-sm text-gray-500">レビュー担当者</div>
                <div className="text-sm font-medium col-span-2">{task.reviewer_name || '未設定'}</div>
                
                <div className="text-sm text-gray-500">期限日</div>
                <div className="text-sm font-medium col-span-2">
                  {task.due_date ? formatDate(task.due_date) : '未設定'}
                </div>
                
                <div className="text-sm text-gray-500">クライアント</div>
                <div className="text-sm font-medium col-span-2">{task.client_name || '未設定'}</div>
                
                {task.is_fiscal_task && task.fiscal_period && (
                  <>
                    <div className="text-sm text-gray-500">決算期タスク</div>
                    <div className="text-sm font-medium col-span-2">
                      第{task.fiscal_period}期
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
                <div className="task-description text-sm">
                  {task.description.startsWith('<') ? (
                    // HTML形式の場合はリッチテキストとして表示
                    <div 
                      className="rich-text-content"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.description) }}
                    />
                  ) : (
                    // プレーンテキストの場合は改行を維持
                    <div className="whitespace-pre-wrap">
                      {task.description}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">説明はありません</p>
              )}
            </div>
            <style>
              {`
                .rich-text-content p {
                  margin-bottom: 0.5rem;
                }
                .rich-text-content blockquote {
                  border-left: 3px solid #ccc;
                  padding-left: 0.75rem;
                  margin-left: 0;
                  color: #666;
                }
                .rich-text-content pre {
                  background-color: #f1f1f1;
                  border-radius: 3px;
                  padding: 0.5rem;
                  font-family: monospace;
                  white-space: pre-wrap;
                }
                .rich-text-content ul, .rich-text-content ol {
                  padding-left: 1.5rem;
                  margin-bottom: 0.5rem;
                }
                .rich-text-content ul {
                  list-style-type: disc;
                }
                .rich-text-content ol {
                  list-style-type: decimal;
                }
              `}
            </style>
          </div>
        </div>
        
        {/* コメントセクション - TaskCommentsコンポーネントを使用 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">コメント</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <TaskComments 
              taskId={task.id} 
              task={task}
              onCommentAdded={() => {
                toast.success('コメントが追加されました');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;