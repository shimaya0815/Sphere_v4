import React, { useState, useEffect } from 'react';
import { HiOutlineCollection, HiOutlineRefresh } from 'react-icons/hi';
import { tasksApi } from '../../api';
import toast from 'react-hot-toast';

const TaskHistory = ({ taskId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [taskId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await tasksApi.getHistory(taskId);
      setHistory(data.results || data);
      setError(null);
    } catch (error) {
      console.error('Error fetching task history:', error);
      setError('タスク履歴の取得に失敗しました');
      toast.error('タスク履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
      return dateString;
    }
  };

  const getFieldDisplayName = (fieldName) => {
    const fieldMap = {
      'title': 'タイトル',
      'description': '説明',
      'status': 'ステータス',
      'priority': '優先度',
      'category': 'カテゴリー',
      'assignee': '担当者',
      'approver': '承認者',
      'due_date': '期限日',
      'estimated_hours': '見積時間',
      'completed_at': '完了日時',
    };
    return fieldMap[fieldName] || fieldName;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <div className="mr-3">{error}</div>
        <button 
          onClick={fetchHistory}
          className="text-sm bg-red-100 hover:bg-red-200 px-2 py-1 rounded flex items-center"
        >
          <HiOutlineRefresh className="mr-1" /> 再読み込み
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <HiOutlineCollection className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium">履歴はありません</h3>
        <p className="mt-1 text-sm">このタスクにはまだ変更履歴がありません</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((item, index) => (
          <li key={item.id}>
            <div className="relative pb-8">
              {index !== history.length - 1 ? (
                <span 
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" 
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ring-8 ring-white">
                    <span className="text-xs font-medium text-gray-500">
                      {item.user?.first_name?.[0] || 'U'}
                    </span>
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">
                        {item.user?.get_full_name || 'ユーザー'}
                      </span>{' '}
                      が
                      <span className="font-medium text-gray-900">
                        {getFieldDisplayName(item.field_name)}
                      </span>
                      を
                      <span className="line-through text-red-500">
                        {item.old_value || '未設定'}
                      </span>
                      から
                      <span className="text-green-500">
                        {item.new_value || '未設定'}
                      </span>
                      に変更しました
                    </p>
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-gray-500">
                    <time dateTime={item.timestamp}>{formatDate(item.timestamp)}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskHistory;