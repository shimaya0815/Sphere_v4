import React, { useState } from 'react';
import { HiOutlineClock, HiCheck, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';

/**
 * タスクの時間記録機能コンポーネント
 * 作業時間の記録・編集・削除機能を提供
 */
const TimeTracking = ({ 
  task, 
  isRecordingTime = false, 
  timeEntry = null, 
  elapsedTime = 0, 
  cachedTimeEntries = [], 
  isLoadingTimeEntries = false,
  editingTimeEntry = null,
  timeEntryForm = {},
  startTimeRecording = () => {},
  stopTimeRecording = () => {},
  startEditingTimeEntry = () => {},
  cancelEditingTimeEntry = () => {},
  saveTimeEntryEdit = () => {},
  deleteTimeEntry = () => {},
  setTimeEntryForm = () => {}
}) => {
  const [showTimeEntries, setShowTimeEntries] = useState(false);

  if (!task) return null;

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

  // 日付を整形
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
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
              onClick={stopTimeRecording}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <HiCheck className="mr-1" />
              記録を終了（{elapsedTime}）
            </button>
          ) : (
            <button
              type="button"
              onClick={startTimeRecording}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <HiOutlineClock className="mr-1" />
              作業開始
            </button>
          )}
        </div>
      </div>
      
      {/* 時間記録履歴 */}
      <div className="mt-3">
        <div 
          className="flex items-center justify-between text-sm font-medium text-gray-600 mb-2 cursor-pointer hover:text-gray-800"
          onClick={() => setShowTimeEntries(!showTimeEntries)}
        >
          <span>
            {showTimeEntries ? '▼ 記録履歴を隠す' : '▶ 記録履歴を表示する'} 
          </span>
          <span className="text-xs text-gray-500">
            {cachedTimeEntries.length}件の記録
          </span>
        </div>
        
        {showTimeEntries && (
          <>
            {isLoadingTimeEntries ? (
              <div className="py-3 text-center text-sm text-gray-500">
                <span className="inline-block animate-spin mr-1">⏳</span> 
                読み込み中...
              </div>
            ) : cachedTimeEntries.length === 0 ? (
              <div className="py-3 text-center text-sm text-gray-500">
                記録がありません
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {cachedTimeEntries.map(entry => (
                  <div key={entry.id} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                    {editingTimeEntry === entry.id ? (
                      // 編集フォーム
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              開始時間
                            </label>
                            <input
                              type="datetime-local"
                              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              value={timeEntryForm.start_time}
                              onChange={(e) => setTimeEntryForm({
                                ...timeEntryForm,
                                start_time: e.target.value
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              終了時間
                            </label>
                            <input
                              type="datetime-local"
                              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              value={timeEntryForm.end_time}
                              onChange={(e) => setTimeEntryForm({
                                ...timeEntryForm,
                                end_time: e.target.value
                              })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            説明
                          </label>
                          <input
                            type="text"
                            className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            value={timeEntryForm.description}
                            onChange={(e) => setTimeEntryForm({
                              ...timeEntryForm,
                              description: e.target.value
                            })}
                            placeholder="作業内容の説明"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={cancelEditingTimeEntry}
                            className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            キャンセル
                          </button>
                          <button
                            type="button"
                            onClick={saveTimeEntryEdit}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 時間記録表示
                      <>
                        <div className="flex justify-between">
                          <div className="text-sm text-gray-800 font-medium">
                            {formatDuration(entry.duration_seconds)}
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => startEditingTimeEntry(entry)}
                              className="text-gray-400 hover:text-gray-600"
                              title="編集"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteTimeEntry(entry.id)}
                              className="text-gray-400 hover:text-red-600"
                              title="削除"
                            >
                              <HiOutlineTrash size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatDate(entry.start_time)} 〜 {formatDate(entry.end_time)}
                        </div>
                        {entry.description && (
                          <div className="mt-1 text-sm">
                            {entry.description}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TimeTracking;