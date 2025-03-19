import { useState, useEffect, useRef } from 'react';
import { timeManagementApi } from '../../../../api';
import toast from 'react-hot-toast';

/**
 * タスクのタイマー機能を管理するカスタムフック
 * @param {number} taskId - タスクID
 * @returns {Object} タイマー関連の状態と関数
 */
export const useTaskTimer = (taskId) => {
  // 時間記録の状態管理
  const [isRecordingTime, setIsRecordingTime] = useState(false);
  const [timeEntry, setTimeEntry] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timerIntervalId, setTimerIntervalId] = useState(null);
  const [cachedTimeEntries, setCachedTimeEntries] = useState([]);
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState(null);
  const [timeEntryForm, setTimeEntryForm] = useState({
    start_time: '',
    end_time: '',
    description: '',
    duration_seconds: 0
  });

  /**
   * アクティブなタイマーがあるか確認
   */
  const checkActiveTimeEntry = async (id) => {
    if (!id) return;
    
    try {
      const response = await timeManagementApi.getActiveTimeEntry(id);
      if (response.data && response.data.id) {
        setTimeEntry(response.data);
        setIsRecordingTime(true);
        
        // 経過時間を計算
        const startTimeDate = new Date(response.data.start_time);
        setStartTime(startTimeDate);
        const now = new Date();
        const elapsedTimeMs = now - startTimeDate;
        setElapsedTime(Math.floor(elapsedTimeMs / 1000));
        
        // タイマーを開始
        const intervalId = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
        setTimerIntervalId(intervalId);
      }
    } catch (error) {
      console.error('Error checking active time entry:', error);
    }
  };

  /**
   * タイマーを開始
   */
  const startTimer = async () => {
    if (!taskId) return;
    
    try {
      const response = await timeManagementApi.startTimeEntry({
        task: taskId,
        description: ''
      });
      
      if (response.data && response.data.id) {
        setTimeEntry(response.data);
        setIsRecordingTime(true);
        setStartTime(new Date(response.data.start_time));
        setElapsedTime(0);
        
        // タイマーを開始
        const intervalId = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
        setTimerIntervalId(intervalId);
        
        toast.success('タイマーを開始しました');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('タイマーの開始に失敗しました');
    }
  };

  /**
   * タイマーを停止
   */
  const stopTimer = async () => {
    if (!timeEntry || !timeEntry.id) return;
    
    try {
      await timeManagementApi.stopTimeEntry(timeEntry.id);
      
      // タイマーをクリア
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
      
      setIsRecordingTime(false);
      setTimeEntry(null);
      setElapsedTime(0);
      
      // 時間エントリを再取得
      fetchTimeEntries();
      
      toast.success('タイマーを停止しました');
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('タイマーの停止に失敗しました');
    }
  };

  /**
   * 時間エントリを取得
   */
  const fetchTimeEntries = async () => {
    if (!taskId) return;
    
    setIsLoadingTimeEntries(true);
    
    try {
      const response = await timeManagementApi.getTimeEntriesByTask(taskId);
      if (response.data) {
        setCachedTimeEntries(response.data);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setIsLoadingTimeEntries(false);
    }
  };

  /**
   * 時間エントリを削除
   */
  const deleteTimeEntry = async (entryId) => {
    try {
      await timeManagementApi.deleteTimeEntry(entryId);
      toast.success('時間記録を削除しました');
      
      // リストから削除したエントリを除外
      setCachedTimeEntries(prev => 
        prev.filter(entry => entry.id !== entryId)
      );
    } catch (error) {
      console.error('Error deleting time entry:', error);
      toast.error('時間記録の削除に失敗しました');
    }
  };

  /**
   * アンマウント時にタイマーをクリア
   */
  useEffect(() => {
    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    };
  }, [timerIntervalId]);

  return {
    isRecordingTime,
    timeEntry,
    elapsedTime,
    startTime,
    cachedTimeEntries,
    isLoadingTimeEntries,
    editingTimeEntry,
    setEditingTimeEntry,
    timeEntryForm,
    setTimeEntryForm,
    checkActiveTimeEntry,
    startTimer,
    stopTimer,
    fetchTimeEntries,
    deleteTimeEntry
  };
}; 