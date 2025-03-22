import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { HiOutlineClock, HiOutlinePlay, HiOutlineStop, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { formatDuration } from '../../utils';

/**
 * タスクの時間記録機能コンポーネント
 * 作業時間の記録・編集・削除機能を提供
 */
const TimeTracking = ({
  taskId,
  isRecordingTime,
  elapsedTime,
  timeEntries = [],
  isLoading = false,
  onToggleTimer,
  onRefresh
}) => {
  const [editMode, setEditMode] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  
  // 記録された合計時間の計算（キャッシュされたエントリと現在記録中の時間を合わせる）
  useEffect(() => {
    let total = 0;
    
    // 完了したエントリの時間を合計
    if (Array.isArray(timeEntries)) {
      timeEntries.forEach(entry => {
        if (entry.start_time && entry.end_time) {
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time);
          const duration = (end - start) / 1000; // 秒単位
          total += duration;
        }
      });
    }
    
    // 現在記録中の時間を追加
    if (isRecordingTime && elapsedTime > 0) {
      total += elapsedTime;
    }
    
    setTotalTime(total);
  }, [timeEntries, isRecordingTime, elapsedTime]);
  
  // ページ可視性に基づいてタイマーチェックを最適化
  useEffect(() => {
    // ページがバックグラウンドの場合、タイマーチェックの頻度を下げる
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (onRefresh && !isLoading) {
          onRefresh();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onRefresh, isLoading]);
  
  // タイマートグルコールバックのメモ化
  const handleToggleTimer = useCallback(() => {
    if (onToggleTimer) {
      onToggleTimer();
    }
  }, [onToggleTimer]);
  
  // リフレッシュコールバックのメモ化
  const handleRefresh = useCallback(() => {
    if (onRefresh && !isLoading) {
      onRefresh();
    }
  }, [onRefresh, isLoading]);
  
  // 時間エントリのリストをメモ化して不要な再計算を防止
  const sortedTimeEntries = useMemo(() => {
    if (!Array.isArray(timeEntries)) return [];
    
    return [...timeEntries]
      .filter(entry => entry && entry.start_time)
      .sort((a, b) => {
        const dateA = new Date(a.start_time);
        const dateB = new Date(b.start_time);
        return dateB - dateA; // 新しい順
      });
  }, [timeEntries]);
  
  return (
    <div className="time-tracking">
      <div className="time-tracking-header">
        <div className="total-time">
          <HiOutlineClock className="icon" />
          <span>合計時間: {formatDuration(totalTime)}</span>
        </div>
        
        <div className="actions">
          <button
            className="refresh-button"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="更新"
          >
            <HiOutlineRefresh className={isLoading ? 'spinning' : ''} />
          </button>
          
          <button
            className={`timer-toggle ${isRecordingTime ? 'recording' : ''}`}
            onClick={handleToggleTimer}
            disabled={isLoading}
            aria-label={isRecordingTime ? 'タイマー停止' : 'タイマー開始'}
          >
            {isRecordingTime ? (
              <>
                <HiOutlineStop />
                <span>停止</span>
                <span className="elapsed-time">{formatDuration(elapsedTime)}</span>
              </>
            ) : (
              <>
                <HiOutlinePlay />
                <span>開始</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="time-entries-list">
        {isLoading && sortedTimeEntries.length === 0 ? (
          <div className="loading-message">時間記録を読み込み中...</div>
        ) : sortedTimeEntries.length === 0 ? (
          <div className="empty-message">
            時間記録はまだありません。「開始」ボタンをクリックして記録を開始しましょう。
          </div>
        ) : (
          <ul>
            {sortedTimeEntries.map((entry) => {
              if (!entry || !entry.start_time) return null;
              
              const startTime = new Date(entry.start_time);
              const endTime = entry.end_time ? new Date(entry.end_time) : null;
              const duration = endTime 
                ? (endTime - startTime) / 1000 
                : (isRecordingTime && entry.active) ? elapsedTime : 0;
              
              return (
                <li key={entry.id} className={entry.active ? 'active' : ''}>
                  <div className="entry-date">
                    {format(startTime, 'yyyy/MM/dd HH:mm', { locale: ja })}
                    {endTime && ` - ${format(endTime, 'HH:mm', { locale: ja })}`}
                  </div>
                  
                  <div className="entry-duration">
                    {formatDuration(duration)}
                  </div>
                  
                  {entry.description && (
                    <div className="entry-description">{entry.description}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default React.memo(TimeTracking);