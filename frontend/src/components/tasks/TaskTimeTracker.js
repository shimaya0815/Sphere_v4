import React, { useState, useEffect } from 'react';
import timeManagementApi from '../../api/timeManagement';

const TaskTimeTracker = ({ taskId }) => {
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTimeData = async () => {
      try {
        setLoading(true);
        const entries = await timeManagementApi.getTimeEntries({ task_id: taskId });
        
        // Calculate total time from all entries
        let totalSeconds = 0;
        entries.forEach(entry => {
          if (entry.duration_seconds) {
            totalSeconds += entry.duration_seconds;
          }
        });
        
        setTotalTime(totalSeconds);
      } catch (error) {
        console.error('Error fetching time data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (taskId) {
      fetchTimeData();
    }
  }, [taskId]);
  
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間 ${minutes}分`;
  };
  
  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }
  
  return (
    <div className="mt-2">
      <div className="text-sm font-medium">合計作業時間:</div>
      <div className="text-lg font-semibold">{formatTime(totalTime)}</div>
    </div>
  );
};

export default TaskTimeTracker;