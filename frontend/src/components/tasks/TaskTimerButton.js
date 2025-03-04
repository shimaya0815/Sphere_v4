import React, { useState, useEffect } from 'react';
import timeManagementApi from '../../api/timeManagement';
import { toast } from 'react-hot-toast';

const TaskTimerButton = ({ task }) => {
  const [activeTimer, setActiveTimer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  // Check for existing timer on component mount
  useEffect(() => {
    const checkForActiveTimer = async () => {
      try {
        const entries = await timeManagementApi.getTimeEntries({ 
          task_id: task.id,
          active: true
        });
        
        if (entries && entries.length > 0) {
          setActiveTimer(entries[0]);
        }
      } catch (error) {
        console.error('Error checking for active timer:', error);
      }
    };
    
    checkForActiveTimer();
  }, [task.id]);
  
  // Update elapsed time
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
  
  const startTimer = async () => {
    setLoading(true);
    try {
      const response = await timeManagementApi.startTimeEntry({
        task_id: task.id,
        description: `Working on: ${task.title}`
      });
      
      setActiveTimer(response);
      toast.success('タイマーを開始しました');
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('タイマーの開始に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const stopTimer = async () => {
    setLoading(true);
    try {
      await timeManagementApi.stopTimeEntry(activeTimer.id);
      setActiveTimer(null);
      setElapsedTime('00:00:00');
      toast.success('タイマーを停止しました');
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('タイマーの停止に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  if (!activeTimer) {
    return (
      <button 
        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center"
        onClick={startTimer}
        disabled={loading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        タイマー開始
      </button>
    );
  }
  
  return (
    <div className="flex items-center">
      <div className="font-mono mr-2 text-sm">{elapsedTime}</div>
      <button 
        className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors flex items-center"
        onClick={stopTimer}
        disabled={loading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
        停止
      </button>
    </div>
  );
};

export default TaskTimerButton;