import React, { useState, useEffect, useRef } from 'react';
import timeManagementApi from '../../api/timeManagement';
import TaskTimeRecordPanel from './TaskTimeRecordPanel';
import { format as formatDate, parseISO, differenceInSeconds } from 'date-fns';

const TaskTimeTracker = ({ taskId }) => {
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [latestEntry, setLatestEntry] = useState(null);
  const [isRecordPanelOpen, setIsRecordPanelOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  
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
        
        // アクティブタイマーがあればその経過時間を計算して設定
        const activeEntry = entriesData.find(entry => !entry.end_time);
        if (activeEntry && activeEntry.start_time) {
          const startTime = new Date(activeEntry.start_time);
          const elapsedSeconds = differenceInSeconds(new Date(), startTime);
          setElapsedTime(elapsedSeconds);
          
          // タイマーを開始
          startElapsedTimeTimer();
        } else {
          // アクティブタイマーがなければカウントをリセット
          setElapsedTime(0);
          stopElapsedTimeTimer();
        }
      }
    } catch (error) {
      console.error('Error fetching time data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 経過時間を計算するタイマーを開始
  const startElapsedTimeTimer = () => {
    // 既存のタイマーがあれば停止
    stopElapsedTimeTimer();
    
    // 新しいタイマーを開始
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };
  
  // タイマーを停止
  const stopElapsedTimeTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // タスクIDが変更されたら時間データを再取得
  useEffect(() => {
    if (taskId) {
      fetchTimeData();
    }
    
    // コンポーネントのアンマウント時にタイマーをクリア
    return () => {
      stopElapsedTimeTimer();
    };
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
  
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${String(minutes).padStart(2, '0')}`;
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
  
  // アクティブなタイマーを取得
  const activeEntry = latestEntry && !latestEntry.end_time ? latestEntry : null;
  
  return (
    <div className="mt-2">
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">合計作業時間:</div>
            <div className="text-lg font-semibold">{formatTime(totalTime)}</div>
          </div>
          <div className="flex items-center">
            {/* アクティブなタイマーがある場合は開始時間と経過時間を表示 */}
            {activeEntry && (
              <div className="mr-3 flex flex-col items-end">
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 mr-1">開始:</span>
                  <span className="font-medium text-gray-800">{formatTimeHHMM(activeEntry.start_time)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 mr-1">経過:</span>
                  <span className="font-medium text-green-600">{formatDuration(elapsedTime)}</span>
                </div>
              </div>
            )}
            <button
              onClick={handleOpenRecordPanel}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              時間記録を管理
            </button>
          </div>
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
                  {latestEntry.end_time 
                    ? formatDuration(latestEntry.duration_seconds)
                    : formatDuration(elapsedTime)}
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