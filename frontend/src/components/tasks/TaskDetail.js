import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TaskTimerButton from './TaskTimerButton';
import TaskTimeTracker from './TaskTimeTracker';
import { toast } from 'react-hot-toast';

// Mock API for demonstration
const mockTaskApi = {
  getTask: (id) => Promise.resolve({
    id,
    title: "年度決算書類の作成",
    description: "クライアントの年度決算処理を行い、必要な書類を全て作成する。\n\n- 貸借対照表\n- 損益計算書\n- キャッシュフロー計算書\n- 勘定科目内訳書",
    status: "in_progress",
    status_name: "進行中",
    priority: "high",
    priority_name: "高",
    due_date: "2025-03-31",
    assignee_name: "山田太郎",
    reviewer_name: "佐藤次郎",
    client_name: "株式会社ABC商事",
    is_fiscal_task: true,
    fiscal_period: "15",
    estimated_hours: 12,
    created_at: "2025-01-15T09:00:00Z"
  })
};

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
        // 実際の実装ではtasksApiを使用
        const data = await mockTaskApi.getTask(taskId);
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {task.status_name}
          </span>
          
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {task.priority_name}
          </span>
          
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
                
                {task.is_fiscal_task && (
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
                <div className="whitespace-pre-wrap text-sm">
                  {task.description}
                </div>
              ) : (
                <p className="text-gray-500 italic">説明はありません</p>
              )}
            </div>
          </div>
        </div>
        
        {/* コメントセクション（モックアップ） */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">コメント</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="border-b pb-4 mb-4">
              <div className="flex">
                <div className="rounded-full bg-blue-100 h-10 w-10 flex items-center justify-center text-blue-700 font-bold">
                  YT
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">山田太郎</div>
                    <div className="text-xs text-gray-500">2025年1月20日 14:32</div>
                  </div>
                  <div className="mt-1 text-sm">
                    初期データの収集が完了しました。現在勘定科目の整理をしています。
                  </div>
                </div>
              </div>
            </div>
            
            {/* コメント入力フォーム */}
            <div className="mt-4">
              <textarea
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                rows="3"
                placeholder="コメントを入力..."
              ></textarea>
              <div className="mt-2 flex justify-end">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                  コメントを追加
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;