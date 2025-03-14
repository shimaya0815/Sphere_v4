import React, { useState, useEffect } from 'react';
import timeManagementApi from '../../api/timeManagement';
import TaskTimeRecordPanel from './TaskTimeRecordPanel';

const TaskTimeTracker = ({ taskId }) => {
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [isRecordPanelOpen, setIsRecordPanelOpen] = useState(false);
  
  const fetchTimeData = async () => {
    try {
      setLoading(true);
      const entriesData = await timeManagementApi.getTimeEntries({ task_id: taskId });
      
      // Calculate total time from all entries
      let totalSeconds = 0;
      entriesData.forEach(entry => {
        if (entry.duration_seconds) {
          totalSeconds += entry.duration_seconds;
        }
      });
      
      setEntries(entriesData);
      setTotalTime(totalSeconds);
    } catch (error) {
      console.error('Error fetching time data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (taskId) {
      fetchTimeData();
    }
  }, [taskId]);
  
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間 ${minutes}分`;
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