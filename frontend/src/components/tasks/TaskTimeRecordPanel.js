import React, { useState, useEffect } from 'react';
import { format as formatDate, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import timeManagementApi from '../../api/timeManagement';
import { toast } from 'react-hot-toast';

const TaskTimeRecordPanel = ({ isOpen, onClose, taskId, entries }) => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeEntry, setActiveEntry] = useState(null);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [newEntry, setNewEntry] = useState({
    description: '',
    start_time: formatDate(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_time: '',
    is_billable: true
  });
  
  useEffect(() => {
    if (isOpen && taskId) {
      console.log('Fetching time entries for task ID:', taskId);
      fetchTimeEntries();
    }
  }, [isOpen, taskId]);
  
  // activeEntryが変更されたら、データを再取得
  useEffect(() => {
    if (isOpen && activeEntry === null) {
      // アクティブなエントリが停止または削除された場合、データを更新
      console.log('Active entry changed, refreshing data');
      fetchTimeEntries();
    }
  }, [isOpen, activeEntry]);
  
  useEffect(() => {
    if (entries && entries.length > 0) {
      setTimeEntries(entries);
      // アクティブなエントリーがあれば設定
      const activeOne = entries.find(entry => !entry.end_time);
      if (activeOne) {
        setActiveEntry(activeOne);
      }
    }
  }, [entries]);
  
  const fetchTimeEntries = async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      // 最新順に取得するためにordering指定
      const data = await timeManagementApi.getTimeEntries({ 
        task_id: taskId,
        ordering: '-start_time' // 最新の記録を最初に取得
      });
      
      console.log('Fetched time entries:', data);
      setTimeEntries(data);
      
      // アクティブなタイマーを確認（終了時間がnullのエントリ）
      const activeOne = data.find(entry => !entry.end_time);
      console.log('Active entry detected:', activeOne || 'None');
      setActiveEntry(activeOne || null);
    } catch (error) {
      console.error('時間記録の取得に失敗しました:', error);
      toast.error('時間記録の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartTimer = async () => {
    try {
      // task_idが文字列の場合は数値に変換
      const taskIdNum = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
      
      const response = await timeManagementApi.startTimeEntry({
        task_id: taskIdNum,
        description: `タスク作業: ${new Date().toLocaleString('ja-JP')}`
      });
      
      setActiveEntry(response);
      await fetchTimeEntries();
      toast.success('タイマーを開始しました');
    } catch (error) {
      console.error('タイマーの開始に失敗しました:', error);
      toast.error('タイマーの開始に失敗しました');
    }
  };
  
  const handleStopTimer = async () => {
    if (!activeEntry) return;
    
    try {
      console.log('Stopping timer with entry ID:', activeEntry.id);
      const response = await timeManagementApi.stopTimeEntry(activeEntry.id);
      console.log('Timer stop response:', response);
      
      setActiveEntry(null);
      await fetchTimeEntries();
      toast.success('タイマーを停止しました');
    } catch (error) {
      console.error('タイマーの停止に失敗しました:', error);
      
      // エラーが発生してもUIを更新するため、強制的に再取得
      await fetchTimeEntries();
      toast.error('タイマーの停止に失敗しました - データを再取得しました');
    }
  };
  
  const handleDeleteEntry = async (entryId) => {
    // window.confirmを使用して、ESLintエラーを回避
    if (!window.confirm('この時間記録を削除してもよろしいですか？')) return;
    
    try {
      await timeManagementApi.deleteTimeEntry(entryId);
      setTimeEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
      toast.success('時間記録を削除しました');
    } catch (error) {
      console.error('時間記録の削除に失敗しました:', error);
      toast.error('時間記録の削除に失敗しました');
    }
  };
  
  const handleEditEntry = (entry) => {
    setEditingEntryId(entry.id);
    setNewEntry({
      description: entry.description || '',
      start_time: entry.start_time ? formatDate(parseISO(entry.start_time), "yyyy-MM-dd'T'HH:mm") : '',
      end_time: entry.end_time ? formatDate(parseISO(entry.end_time), "yyyy-MM-dd'T'HH:mm") : '',
      is_billable: entry.is_billable
    });
    setShowNewEntryForm(true);
  };
  
  const handleUpdateEntry = async () => {
    try {
      const entryData = {
        ...newEntry,
        task_id: taskId
      };
      
      if (editingEntryId) {
        await timeManagementApi.updateTimeEntry(editingEntryId, entryData);
        toast.success('時間記録を更新しました');
      } else {
        await timeManagementApi.createTimeEntry(entryData);
        toast.success('新しい時間記録を作成しました');
      }
      
      resetForm();
      await fetchTimeEntries();
    } catch (error) {
      console.error('時間記録の保存に失敗しました:', error);
      toast.error('時間記録の保存に失敗しました');
    }
  };
  
  const resetForm = () => {
    setNewEntry({
      description: '',
      start_time: formatDate(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_time: '',
      is_billable: true
    });
    setEditingEntryId(null);
    setShowNewEntryForm(false);
  };
  
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '未設定';
    try {
      return formatDate(parseISO(dateTimeString), 'yyyy年MM月dd日 HH:mm', { locale: ja });
    } catch (error) {
      return '無効な日時';
    }
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  };
  
  // スライドパネルのスタイル
  const panelClasses = `fixed inset-y-0 right-0 z-30 w-full sm:w-96 bg-white shadow-lg transform ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  } transition-transform duration-300 ease-in-out overflow-y-auto`;
  
  // オーバーレイのスタイル
  const overlayClasses = `fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity ${
    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
  }`;
  
  return (
    <>
      {/* オーバーレイ */}
      <div className={overlayClasses} onClick={onClose}></div>
      
      {/* スライドパネル */}
      <div className={panelClasses}>
        <div className="px-4 py-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">時間記録</h2>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <span className="sr-only">閉じる</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="mb-6 flex justify-between items-center">
            {!activeEntry ? (
              <button
                onClick={handleStartTimer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                タイマー開始
              </button>
            ) : (
              <button
                onClick={handleStopTimer}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                タイマー停止
              </button>
            )}
            
            <button
              onClick={() => {
                resetForm();
                setShowNewEntryForm(!showNewEntryForm);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {showNewEntryForm ? '新規作成を閉じる' : '手動で追加'}
            </button>
          </div>
          
          {/* 新規作成/編集フォーム */}
          {showNewEntryForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-md font-medium mb-3">
                {editingEntryId ? '時間記録を編集' : '新しい時間記録を追加'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                    placeholder="時間記録の説明"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={newEntry.start_time}
                      onChange={(e) => setNewEntry({...newEntry, start_time: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={newEntry.end_time}
                      onChange={(e) => setNewEntry({...newEntry, end_time: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_billable"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={newEntry.is_billable}
                    onChange={(e) => setNewEntry({...newEntry, is_billable: e.target.checked})}
                  />
                  <label htmlFor="is_billable" className="ml-2 block text-sm text-gray-700">
                    請求対象
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={resetForm}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleUpdateEntry}
                  >
                    {editingEntryId ? '更新' : '追加'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 時間記録リスト */}
          <div>
            <h3 className="text-lg font-medium mb-3">時間記録履歴</h3>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">読み込み中...</p>
              </div>
            ) : timeEntries.length === 0 ? (
              <p className="text-gray-500 text-center py-6">記録がありません</p>
            ) : (
              <div className="space-y-3">
                {timeEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className={`p-3 rounded-md border ${!entry.end_time ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-grow">
                        <div className="font-medium text-gray-800">
                          {entry.description || '説明なし'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDateTime(entry.start_time)} - {entry.end_time ? formatDateTime(entry.end_time) : '実行中'}
                        </div>
                        <div className="text-sm mt-1">
                          <span className={`font-medium ${entry.end_time ? 'text-blue-600' : 'text-green-600'}`}>
                            {entry.duration_seconds ? formatDuration(entry.duration_seconds) : '計測中'}
                          </span>
                          {entry.is_billable && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              請求対象
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* 時間情報バッジ - スライドパネルの右側に表示 */}
                      <div className="flex flex-col items-end mx-2 text-xs">
                        <div className="bg-blue-50 px-2 py-1 rounded-md mb-1 w-20 text-center">
                          <div className="text-gray-500">開始</div>
                          <div className="font-semibold">
                            {entry.start_time ? formatDate(parseISO(entry.start_time), 'HH:mm') : '--:--'}
                          </div>
                        </div>
                        <div className="bg-blue-50 px-2 py-1 rounded-md mb-1 w-20 text-center">
                          <div className="text-gray-500">終了</div>
                          <div className="font-semibold">
                            {entry.end_time ? formatDate(parseISO(entry.end_time), 'HH:mm') : '--:--'}
                          </div>
                        </div>
                        <div className="bg-blue-50 px-2 py-1 rounded-md w-20 text-center">
                          <div className="text-gray-500">時間</div>
                          <div className="font-semibold">
                            {entry.duration_seconds 
                              ? `${Math.floor(entry.duration_seconds / 3600)}:${String(Math.floor((entry.duration_seconds % 3600) / 60)).padStart(2, '0')}`
                              : '--:--'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="text-gray-400 hover:text-blue-500"
                          disabled={loading || !entry.end_time}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-gray-400 hover:text-red-500"
                          disabled={loading || !entry.end_time}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskTimeRecordPanel;