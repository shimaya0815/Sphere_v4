import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO, intervalToDuration } from 'date-fns';

const TimeTracker = ({ 
  activeTimer, 
  activeBreak, 
  onStartTimer, 
  onStopTimer, 
  onStartBreak, 
  onStopBreak,
  availableTasks,
  availableClients,
  loading
}) => {
  const [description, setDescription] = useState('');
  const [taskId, setTaskId] = useState('');
  const [clientId, setClientId] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  const timerInterval = useRef(null);
  const elapsedInterval = useRef(null);

  // Format ISO time to readable format
  const formatTime = (isoDateTime) => {
    if (!isoDateTime) return '';
    return format(parseISO(isoDateTime), 'HH:mm');
  };

  // Set up timer interval to update elapsed time
  useEffect(() => {
    if (activeTimer) {
      updateElapsedTime();
      elapsedInterval.current = setInterval(updateElapsedTime, 1000);
    } else {
      clearInterval(elapsedInterval.current);
      setElapsedTime('00:00:00');
    }
    
    return () => {
      clearInterval(elapsedInterval.current);
    };
  }, [activeTimer, activeBreak]);

  const updateElapsedTime = () => {
    if (!activeTimer) return;
    
    const startTime = new Date(activeTimer.start_time);
    const now = new Date();
    
    // If on break, don't update the timer
    if (activeBreak) return;
    
    let duration = intervalToDuration({ start: startTime, end: now });
    
    // Format as HH:MM:SS
    const formatted = [
      String(duration.hours).padStart(2, '0'),
      String(duration.minutes).padStart(2, '0'),
      String(duration.seconds).padStart(2, '0')
    ].join(':');
    
    setElapsedTime(formatted);
  };

  const handleStartTimer = () => {
    onStartTimer({
      description,
      task_id: taskId || null,
      client_id: clientId || null
    });
    setDescription('');
    setTaskId('');
    setClientId('');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <h2 className="text-lg font-semibold mb-2">タイムトラッカー</h2>
          {!activeTimer ? (
            <div className="flex flex-col md:flex-row gap-3">
              <select 
                className="select select-bordered max-w-xs"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={activeTimer !== null || loading}
              >
                <option value="">クライアントを選択</option>
                {availableClients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              
              <select 
                className="select select-bordered max-w-xs"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={activeTimer !== null || loading}
              >
                <option value="">タスクを選択</option>
                {availableTasks.map(task => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
              
              <input 
                type="text" 
                placeholder="作業内容" 
                className="input input-bordered w-full max-w-xs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={activeTimer !== null || loading}
              />
            </div>
          ) : (
            <div className="mb-2">
              <p className="text-lg font-medium">{activeTimer.description || '作業中'}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {activeTimer.client && (
                  <span className="badge badge-primary">{activeTimer.client.name}</span>
                )}
                {activeTimer.task && (
                  <span className="badge badge-secondary">{activeTimer.task.title}</span>
                )}
                <span className="badge">開始: {formatTime(activeTimer.start_time)}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`text-3xl font-mono ${activeBreak ? 'text-gray-400' : 'text-gray-800'}`}>
            {elapsedTime}
          </div>
          
          {!activeTimer ? (
            <button 
              className="btn btn-primary" 
              onClick={handleStartTimer}
              disabled={loading}
            >
              タイマー開始
            </button>
          ) : (
            <div className="flex gap-2">
              {!activeBreak ? (
                <button 
                  className="btn btn-warning" 
                  onClick={onStartBreak}
                  disabled={loading}
                >
                  休憩
                </button>
              ) : (
                <button 
                  className="btn btn-success" 
                  onClick={onStopBreak}
                  disabled={loading}
                >
                  休憩終了
                </button>
              )}
              
              <button 
                className="btn btn-error" 
                onClick={onStopTimer}
                disabled={loading}
              >
                停止
              </button>
            </div>
          )}
        </div>
      </div>
      
      {activeBreak && (
        <div className="mt-4 p-3 bg-yellow-100 rounded-md flex justify-between items-center">
          <div>
            <p className="font-medium text-yellow-800">休憩中 - {activeBreak.reason || '休憩'}</p>
            <p className="text-sm text-yellow-700">開始: {formatTime(activeBreak.start_time)}</p>
          </div>
          <button 
            className="btn btn-sm btn-success" 
            onClick={onStopBreak}
            disabled={loading}
          >
            休憩終了
          </button>
        </div>
      )}
    </div>
  );
};

export default TimeTracker;