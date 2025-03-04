import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import timeManagementApi from '../../api/timeManagement';

const TaskTimerWidget = () => {
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchActiveTimer = async () => {
      try {
        setLoading(true);
        const summaryData = await timeManagementApi.getDashboardSummary();
        
        if (summaryData.has_active_timer && summaryData.active_timer) {
          setActiveTimer(summaryData.active_timer);
        }
      } catch (error) {
        console.error('Error fetching active timer:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActiveTimer();
  }, []);
  
  useEffect(() => {
    let interval = null;
    
    if (activeTimer) {
      const updateElapsedTime = () => {
        const startTime = new Date(activeTimer.start_time);
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);
        
        const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const seconds = Math.floor(diff % 60).toString().padStart(2, '0');
        
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      };
      
      updateElapsedTime();
      interval = setInterval(updateElapsedTime, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);
  
  const formatTime = (isoTime) => {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  const handleStopTimer = async () => {
    try {
      setLoading(true);
      await timeManagementApi.stopTimeEntry(activeTimer.id);
      setActiveTimer(null);
      setElapsedTime('00:00:00');
    } catch (error) {
      console.error('Error stopping timer:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium text-gray-700">タイムトラッカー</h3>
        <div className="mt-2 text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }
  
  if (!activeTimer) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium text-gray-700">タイムトラッカー</h3>
        <div className="mt-2 text-sm text-gray-500">
          <p>アクティブなタイマーがありません</p>
          <Link to="/time-management" className="mt-2 inline-block text-blue-500 hover:underline">
            タイムトラッカーを開く
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-medium text-gray-700">アクティブタイマー</h3>
      <div className="mt-2">
        <div className="font-mono text-2xl mb-2">{elapsedTime}</div>
        <div className="text-sm mb-1">
          <span className="font-medium">開始:</span> {formatTime(activeTimer.start_time)}
        </div>
        <div className="text-sm mb-2">
          <span className="font-medium">内容:</span> {activeTimer.description || '作業中'}
        </div>
        
        {activeTimer.task && (
          <div className="text-sm mb-2">
            <span className="font-medium">タスク:</span>{' '}
            <Link to={`/tasks/${activeTimer.task.id}`} className="text-blue-500 hover:underline">
              {activeTimer.task.title}
            </Link>
          </div>
        )}
        
        <div className="flex space-x-2 mt-3">
          <button
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            onClick={handleStopTimer}
            disabled={loading}
          >
            タイマー停止
          </button>
          <Link 
            to="/time-management" 
            className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            詳細へ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TaskTimerWidget;