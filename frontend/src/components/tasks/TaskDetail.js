import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TaskComments from './TaskComments';
import { tasksApi, timeManagementApi } from '../../api';
import { toast } from 'react-hot-toast';
import { HiOutlineClock, HiCheck } from 'react-icons/hi';

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 時間記録関連のstate
  const [isRecordingTime, setIsRecordingTime] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);
  const [showTimeEntries, setShowTimeEntries] = useState(false);
  
  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        // 実際のAPIを使用
        const data = await tasksApi.getTask(taskId);
        setTask(data);
        setError(null);
        
        // タスクが取得できたら時間記録関連の情報も取得
        if (data && data.id) {
          fetchTimeData(data.id);
        }
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
  
  // 時間記録データを取得する関数
  const fetchTimeData = async (id) => {
    if (!id) return;
    
    setIsLoadingTimeEntries(true);
    try {
      // アクティブなタイマーを確認
      const activeTimers = await timeManagementApi.getTimeEntries({ 
        task_id: id,
        active: 'true'
      });
      
      if (activeTimers && activeTimers.length > 0) {
        setActiveTimer(activeTimers[0]);
        setIsRecordingTime(true);
      } else {
        setActiveTimer(null);
        setIsRecordingTime(false);
      }
      
      // 時間記録一覧を取得
      const allEntries = await timeManagementApi.getTimeEntries({ 
        task_id: id,
        ordering: '-start_time' 
      });
      
      setTimeEntries(allEntries || []);
    } catch (error) {
      console.error('Error fetching time data:', error);
    } finally {
      setIsLoadingTimeEntries(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  
  // 日時を整形
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 時間を読みやすい形式に整形
  const formatDuration = (seconds) => {
    if (!seconds) return '0時間';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours === 0) {
      return `${minutes}分`;
    } else if (minutes === 0) {
      return `${hours}時間`;
    } else {
      return `${hours}時間${minutes}分`;
    }
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
          {/* タイマー機能はセクション内で直接実装するので削除 */}
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
              {/* 時間記録セクション */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex flex-wrap items-center justify-between">
                  <h3 className="text-md font-medium text-gray-700 flex items-center">
                    <HiOutlineClock className="mr-2 text-gray-500" />
                    時間記録
                  </h3>
                  
                  {/* 時間記録アクション */}
                  <div className="flex space-x-2">
                    {isRecordingTime ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await timeManagementApi.stopTimeEntry(activeTimer.id);
                            setIsRecordingTime(false);
                            setActiveTimer(null);
                            fetchTimeData(task.id);
                            toast.success('タイマーを停止しました');
                          } catch (error) {
                            console.error('Error stopping timer:', error);
                            toast.error('タイマーの停止に失敗しました');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <HiCheck className="mr-1" />
                        記録を終了
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await timeManagementApi.startTimeEntry({
                              task_id: task.id,
                              description: `作業: ${task.title}`
                            });
                            setActiveTimer(response);
                            setIsRecordingTime(true);
                            fetchTimeData(task.id);
                            toast.success('タイマーを開始しました');
                          } catch (error) {
                            console.error('Error starting timer:', error);
                            toast.error('タイマーの開始に失敗しました');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <HiOutlineClock className="mr-1" />
                        作業開始
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-3">
                  <div 
                    className="flex items-center justify-between text-sm font-medium text-gray-600 mb-2 cursor-pointer hover:text-gray-800"
                    onClick={() => setShowTimeEntries(!showTimeEntries)}
                  >
                    <span>
                      {showTimeEntries ? '▼ 記録履歴を隠す' : '▶ 記録履歴を表示する'} 
                    </span>
                    <span className="text-xs text-gray-500">
                      {timeEntries.length}件の記録
                    </span>
                  </div>
                  
                  {showTimeEntries && (
                    <>
                      {isLoadingTimeEntries ? (
                        <div className="py-3 text-center text-sm text-gray-500">
                          <span className="inline-block animate-spin mr-1">⏳</span> 
                          読み込み中...
                        </div>
                      ) : timeEntries.length === 0 ? (
                        <div className="py-3 text-center text-sm text-gray-500">
                          記録がありません
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {timeEntries.map(entry => (
                            <div key={entry.id} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                              <div className="flex justify-between">
                                <div className="text-sm text-gray-800 font-medium">
                                  {entry.duration_seconds ? formatDuration(entry.duration_seconds) : '計測中'}
                                </div>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {formatDateTime(entry.start_time)} {entry.end_time ? `〜 ${formatDateTime(entry.end_time)}` : '〜 実行中'}
                              </div>
                              {entry.description && (
                                <div className="mt-1 text-sm">
                                  {entry.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
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
                      dangerouslySetInnerHTML={{ __html: task.description }}
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