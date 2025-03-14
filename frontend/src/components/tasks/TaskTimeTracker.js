import React, { useState, useEffect } from 'react';
import timeManagementApi from '../../api/timeManagement';
import TaskTimeRecordPanel from './TaskTimeRecordPanel';
import { format as formatDate, parseISO } from 'date-fns';

const TaskTimeTracker = ({ taskId }) => {
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [latestEntry, setLatestEntry] = useState(null);
  const [isRecordPanelOpen, setIsRecordPanelOpen] = useState(false);
  
  const fetchTimeData = async () => {
    try {
      console.log('Fetching time data for taskId:', taskId);
      setLoading(true);
      const entriesData = await timeManagementApi.getTimeEntries({ 
        task_id: taskId,
        ordering: '-start_time' // 最新の記録を最初に取得
      });
      
      console.log('Time entries received:', entriesData);
      
      // Calculate total time from all entries
      let totalSeconds = 0;
      entriesData.forEach(entry => {
        if (entry.duration_seconds) {
          totalSeconds += entry.duration_seconds;
        }
      });
      
      setEntries(entriesData);
      setTotalTime(totalSeconds);
      
      // 最新のエントリを設定
      if (entriesData.length > 0) {
        setLatestEntry(entriesData[0]);
      }
    } catch (error) {
      console.error('Error fetching time data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // タスクIDが変更されたら時間データを再取得
  useEffect(() => {
    if (taskId) {
      fetchTimeData();
    }
  }, [taskId]);
  
  // custom eventでパネル表示リクエストを監視
  useEffect(() => {
    const handleTimeTrackerOpen = (event) => {
      if (event.detail?.taskId === taskId) {
        setIsRecordPanelOpen(true);
      }
    };
    
    window.addEventListener('open-time-tracker', handleTimeTrackerOpen);
    
    return () => {
      window.removeEventListener('open-time-tracker', handleTimeTrackerOpen);
    };
  }, [taskId]);
  
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間 ${minutes}分`;
  };
  
  const formatTimeHHMM = (dateString) => {
    if (!dateString) return '--:--';
    try {
      return formatDate(parseISO(dateString), 'HH:mm');
    } catch (e) {
      return '--:--';
    }
  };
  
  const handleOpenRecordPanel = () => {
    setIsRecordPanelOpen(true);
  };
  
  const handleCloseRecordPanel = () => {
    setIsRecordPanelOpen(false);
    // パネルを閉じた後にデータを再取得
    fetchTimeData();
  };
  
  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }
  
  return (
    <div className="mt-2">
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">合計作業時間:</div>
            <div className="text-lg font-semibold">{formatTime(totalTime)}</div>
          </div>
          <button
            onClick={handleOpenRecordPanel}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            時間記録を管理
          </button>
        </div>
        
        {latestEntry && (
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
            <div className="text-sm font-medium mb-1">最新の時間記録:</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500">開始時間</span>
                <span className="font-medium">{formatTimeHHMM(latestEntry.start_time)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">終了時間</span>
                <span className="font-medium">
                  {latestEntry.end_time ? formatTimeHHMM(latestEntry.end_time) : '進行中'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">作業時間</span>
                <span className="font-medium">
                  {latestEntry.duration_seconds 
                    ? `${Math.floor(latestEntry.duration_seconds / 3600)}:${String(Math.floor((latestEntry.duration_seconds % 3600) / 60)).padStart(2, '0')}`
                    : '計測中'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">状態</span>
                <span className={`font-medium ${latestEntry.end_time ? 'text-blue-600' : 'text-green-600'}`}>
                  {latestEntry.end_time ? '完了' : '記録中'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 時間記録スライドパネル */}
      <TaskTimeRecordPanel 
        isOpen={isRecordPanelOpen} 
        onClose={handleCloseRecordPanel}
        taskId={taskId}
        entries={entries}
      />
    </div>
  );
};

export default TaskTimeTracker;