import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { timeManagementApi } from '../../../../api';

/**
 * タスクタイマー用カスタムフック
 * @param {number|null} taskId タスクID
 */
export const useTaskTimer = (taskId) => {
  const [isRecordingTime, setIsRecordingTime] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeEntry, setTimeEntry] = useState(null);
  const [cachedTimeEntries, setCachedTimeEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  
  // タイマーインターバルの参照
  const timerRef = useRef(null);
  // API呼び出し制御用のフラグ
  const isCheckingRef = useRef(false);
  // 最後のAPIチェック時間
  const lastCheckTimeRef = useRef(0);
  // API呼び出し回数制限
  const apiCallCountRef = useRef(0);
  // API呼び出し回数リセットタイマー
  const apiCallResetTimerRef = useRef(null);
  // 最大API呼び出し回数
  const MAX_API_CALLS = 20;
  // API呼び出し回数リセット間隔（ミリ秒）
  const API_CALL_RESET_INTERVAL = 60000; // 1分
  
  // 経過時間の計算
  const calculateElapsed = useCallback(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  }, [startTime]);

  // タイムエントリの一覧取得
  const fetchTimeEntries = useCallback(async () => {
    if (!taskId) return;
    
    try {
      // API呼び出し回数を増やす
      apiCallCountRef.current += 1;
      
      // API呼び出し回数制限を超えた場合はスキップ
      if (apiCallCountRef.current > MAX_API_CALLS) {
        console.warn('API call limit reached. Skipping time entries fetch.');
        return;
      }
      
      setIsLoadingEntries(true);
      const entries = await timeManagementApi.getTimeEntries({ task_id: taskId });
      setCachedTimeEntries(entries || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      // ユーザーエクスペリエンスを向上させるためトースト通知を表示しない
    } finally {
      setIsLoadingEntries(false);
    }
  }, [taskId]);
  
  // タイマー開始
  const startTimer = useCallback(async () => {
    if (!taskId) {
      toast.error('タスクIDが指定されていません');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 現在時刻を取得してタイムエントリ作成
      const newStartTime = new Date();
      
      // APIでタイムエントリを作成
      const response = await timeManagementApi.createTimeEntry({
        task: taskId,
        start_time: newStartTime.toISOString(),
        active: true
      });
      
      setTimeEntry(response);
      setStartTime(newStartTime);
      setIsRecordingTime(true);
      
      // タイマー開始
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setElapsedTime(calculateElapsed());
      }, 1000);
      
      toast.success('タイマーを開始しました');
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('タイマーの開始に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [taskId, calculateElapsed]);
  
  // タイマー停止
  const stopTimer = useCallback(async () => {
    if (!taskId || !timeEntry || !timeEntry.id) {
      toast.error('アクティブなタイマーがありません');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 現在時刻を取得して終了時間を設定
      const endTime = new Date();
      
      // APIでタイムエントリを更新
      await timeManagementApi.updateTimeEntry(timeEntry.id, {
        end_time: endTime.toISOString(),
        active: false
      });
      
      // タイマーをクリア
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecordingTime(false);
      setTimeEntry(null);
      setStartTime(null);
      setElapsedTime(0);
      
      // タイムエントリを再取得（直後に取得すると古いデータが返ってくる可能性があるため少し遅延）
      setTimeout(() => {
        fetchTimeEntries();
      }, 500);
      
      toast.success('タイマーを停止しました');
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('タイマーの停止に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [taskId, timeEntry, fetchTimeEntries]);
  
  // アクティブなタイムエントリがあるかチェック
  const checkActiveTimeEntry = useCallback(async () => {
    if (!taskId || isCheckingRef.current) return;
    
    // 前回のチェックから30秒以内の場合はスキップ (より長い間隔に変更)
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 30000) return;
    
    // API呼び出し回数制限を超えた場合はスキップ
    if (apiCallCountRef.current > MAX_API_CALLS) {
      console.warn('API call limit reached. Skipping active time entry check.');
      return;
    }
    
    lastCheckTimeRef.current = now;
    isCheckingRef.current = true;
    
    try {
      // API呼び出し回数を増やす
      apiCallCountRef.current += 1;
      
      const activeEntry = await timeManagementApi.getActiveTimeEntry(taskId);
      
      if (activeEntry) {
        // 既に同じエントリがセットされている場合は更新しない
        if (timeEntry && timeEntry.id === activeEntry.id) {
          isCheckingRef.current = false;
          return;
        }
        
        setTimeEntry(activeEntry);
        setStartTime(new Date(activeEntry.start_time));
        setIsRecordingTime(true);
        
        // タイマーが動いていなければ開始
        if (!timerRef.current) {
          timerRef.current = setInterval(() => {
            setElapsedTime(calculateElapsed());
          }, 1000);
        }
      } else if (isRecordingTime) {
        // アクティブなエントリがなくなった場合はタイマーをリセット
        setIsRecordingTime(false);
        setTimeEntry(null);
        setStartTime(null);
        setElapsedTime(0);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error checking active time entry:', error);
      // エラーはサイレント
    } finally {
      isCheckingRef.current = false;
    }
  }, [taskId, calculateElapsed, timeEntry, isRecordingTime]);
  
  // API呼び出し回数のリセット
  useEffect(() => {
    // リセットタイマーのセットアップ
    apiCallResetTimerRef.current = setInterval(() => {
      apiCallCountRef.current = 0;
    }, API_CALL_RESET_INTERVAL);
    
    return () => {
      if (apiCallResetTimerRef.current) {
        clearInterval(apiCallResetTimerRef.current);
      }
    };
  }, []);
  
  // コンポーネントのマウント/アンマウント時の処理
  useEffect(() => {
    // マウント時の初期化
    if (taskId) {
      checkActiveTimeEntry();
      fetchTimeEntries();
    }
    
    // クリーンアップ処理
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (apiCallResetTimerRef.current) {
        clearInterval(apiCallResetTimerRef.current);
        apiCallResetTimerRef.current = null;
      }
    };
  }, [taskId, checkActiveTimeEntry, fetchTimeEntries]);
  
  return {
    isRecordingTime,
    elapsedTime,
    startTime,
    timeEntry,
    cachedTimeEntries,
    isLoading,
    isLoadingEntries,
    startTimer,
    stopTimer,
    checkActiveTimeEntry,
    fetchTimeEntries
  };
};

export default useTaskTimer; 