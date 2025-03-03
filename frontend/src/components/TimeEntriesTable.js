import React from 'react';
import { format, parseISO } from 'date-fns';

const TimeEntriesTable = ({ entries, onDelete, loading }) => {
  // Format duration in seconds to hours and minutes
  const formatDurationHM = (seconds) => {
    if (!seconds) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  };
  
  // Format ISO date to readable format
  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    return format(parseISO(isoDate), 'yyyy/MM/dd');
  };
  
  // Format ISO time to readable format
  const formatTime = (isoDateTime) => {
    if (!isoDateTime) return '';
    return format(parseISO(isoDateTime), 'HH:mm');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">クライアント</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タスク</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作業時間</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.length > 0 ? (
            entries.map(entry => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(entry.start_time)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.client ? entry.client.name : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.task ? entry.task.title : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {entry.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(entry.start_time)} - {entry.end_time ? formatTime(entry.end_time) : '進行中'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.duration_seconds ? formatDurationHM(entry.duration_seconds) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!entry.is_running && (
                    <button 
                      className="text-red-600 hover:text-red-900 ml-3"
                      onClick={() => onDelete(entry.id)}
                      disabled={loading}
                    >
                      削除
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                検索条件に一致する作業時間データがありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TimeEntriesTable;