import React, { useState, useEffect, useRef } from 'react';
import { Controller } from 'react-hook-form';
import { HiOutlineRefresh } from 'react-icons/hi';

const TaskRecurrenceSection = ({ 
  control, 
  handleFieldChange, 
  watch,
  setValue,
  task  // タスクオブジェクト
}) => {
  const isRecurring = watch('is_recurring');
  const recurrencePattern = watch('recurrence_pattern');
  const weekday = watch('weekday');
  const weekdays = watch('weekdays');
  const monthday = watch('monthday');
  const business_day = watch('business_day');

  // 選択された曜日を管理する内部状態
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  // 月次パターンのタイプ（日指定か営業日指定か）
  const [monthlyType, setMonthlyType] = useState('day'); // 'day' or 'business'
  
  // 初期化フラグ
  const initializedRef = useRef(false);
  const previousTaskRef = useRef(null);
  const debugCounterRef = useRef(0);
  
  // 繰り返しパターンのオプション
  const recurrencePatterns = [
    { value: 'daily', label: '毎日' },
    { value: 'weekly', label: '毎週' },
    { value: 'monthly', label: '毎月' },
    { value: 'yearly', label: '毎年' }
  ];

  // 曜日のオプション
  const weekdayOptions = [
    { value: 0, label: '月曜日' },
    { value: 1, label: '火曜日' },
    { value: 2, label: '水曜日' },
    { value: 3, label: '木曜日' },
    { value: 4, label: '金曜日' },
    { value: 5, label: '土曜日' },
    { value: 6, label: '日曜日' }
  ];

  // タスクデータが変更されたとき、または初期化が必要なときに実行
  useEffect(() => {
    debugCounterRef.current++;
    const debugId = debugCounterRef.current;
    
    if (!task) {
      console.log(`[${debugId}] タスクデータがありません`);
      return;
    }
    
    // タスクIDが変更されたかチェック
    const previousTaskId = previousTaskRef.current?.id;
    const currentTaskId = task.id;
    
    console.log(`[${debugId}] タスク検証: 前回=${previousTaskId}, 現在=${currentTaskId}`);
    
    // タスクIDが変わった場合や初期化されていない場合は初期化を実行
    if (previousTaskId !== currentTaskId || !initializedRef.current) {
      console.log(`[${debugId}] タスク変更検出 - 初期化を実行します`, { task });
      
      // タスクの参照を保存
      previousTaskRef.current = { ...task };
      
      // 初期化処理
      initializeFromTaskData(task, debugId);
      
      // 初期化完了を記録
      initializedRef.current = true;
    }
  }, [
    task?.id, 
    task?.weekdays, 
    task?.weekday, 
    task?.monthday,
    task?.business_day,
    task?.is_recurring, 
    task?.recurrence_pattern
  ]);

  // 曜日選択の状態が変わったときにフォーム値を更新
  useEffect(() => {
    if (initializedRef.current && selectedWeekdays.length >= 0) {
      const newWeekdaysValue = selectedWeekdays.length > 0 ? selectedWeekdays.join(',') : '';
      
      console.log('選択された曜日が変更されました。フォーム値を更新:', {
        selectedWeekdays,
        currentFormValue: weekdays,
        newFormValue: newWeekdaysValue
      });
      
      // フォーム値を更新（現在と異なる場合のみ）
      if (weekdays !== newWeekdaysValue) {
        setValue('weekdays', newWeekdaysValue, { shouldDirty: true });
        handleFieldChange('weekdays', newWeekdaysValue);
      }
    }
  }, [selectedWeekdays]);

  // 初期化関数 - タスクデータから選択状態を設定
  const initializeFromTaskData = (taskData, debugId) => {
    if (!taskData) return;
    
    console.log(`[${debugId}] タスクデータから初期化開始:`, {
      id: taskData.id,
      is_recurring: taskData.is_recurring,
      recurrence_pattern: taskData.recurrence_pattern,
      weekday: taskData.weekday,
      weekdays: taskData.weekdays,
      monthday: taskData.monthday,
      business_day: taskData.business_day
    });
    
    // 繰り返しパターンごとの初期化処理
    if (taskData.recurrence_pattern === 'weekly') {
      initializeWeekly(taskData, debugId);
    } else if (taskData.recurrence_pattern === 'monthly') {
      initializeMonthly(taskData, debugId);
    }
  };
  
  // 週次繰り返しの初期化
  const initializeWeekly = (taskData, debugId) => {
    // 繰り返しが有効で、週次パターンの場合のみ曜日選択を初期化
    const isRecurringTask = taskData.is_recurring === true || taskData.is_recurring === 'true';
    const isWeeklyPattern = taskData.recurrence_pattern === 'weekly';
    
    if (isRecurringTask && isWeeklyPattern) {
      console.log(`[${debugId}] 週次繰り返しタスクを検出、曜日の初期化を行います`);
      
      let weekdaysToSelect = [];
      
      // 複数曜日指定を優先
      if (taskData.weekdays) {
        console.log(`[${debugId}] 複数曜日設定を検出:`, taskData.weekdays);
        try {
          // 文字列を配列に変換
          weekdaysToSelect = taskData.weekdays.split(',')
            .map(day => {
              const parsed = parseInt(day.trim(), 10);
              return isNaN(parsed) ? null : parsed;
            })
            .filter(day => day !== null && day >= 0 && day <= 6);
          
          console.log(`[${debugId}] 解析された曜日配列:`, weekdaysToSelect);
        } catch (err) {
          console.error(`[${debugId}] 複数曜日の解析エラー:`, err);
          weekdaysToSelect = [];
        }
      } 
      // weekdaysがない場合は単一weekdayフィールドを確認
      else if (taskData.weekday !== undefined && taskData.weekday !== null) {
        const weekdayValue = parseInt(taskData.weekday, 10);
        if (!isNaN(weekdayValue) && weekdayValue >= 0 && weekdayValue <= 6) {
          console.log(`[${debugId}] 単一曜日設定を検出:`, weekdayValue);
          weekdaysToSelect = [weekdayValue];
        }
      }
      
      // 選択状態を設定
      setSelectedWeekdays(weekdaysToSelect);
      
      // フォーム値も更新
      const weekdaysString = weekdaysToSelect.length > 0 ? weekdaysToSelect.join(',') : '';
      setValue('weekdays', weekdaysString, { shouldDirty: true });
    }
  };
  
  // 月次繰り返しの初期化
  const initializeMonthly = (taskData, debugId) => {
    const isRecurringTask = taskData.is_recurring === true || taskData.is_recurring === 'true';
    const isMonthlyPattern = taskData.recurrence_pattern === 'monthly';
    
    if (isRecurringTask && isMonthlyPattern) {
      console.log(`[${debugId}] 月次繰り返しタスクを検出、設定の初期化を行います`);
      
      // タスクに設定されている値に基づいて初期化
      if (taskData.monthday !== undefined && taskData.monthday !== null && taskData.monthday > 0) {
        console.log(`[${debugId}] 月次日付指定を検出:`, taskData.monthday);
        setMonthlyType('day');
        setValue('monthday', taskData.monthday.toString(), { shouldDirty: true });
        setValue('business_day', '', { shouldDirty: true });
      } 
      else if (taskData.business_day !== undefined && taskData.business_day !== null && taskData.business_day > 0) {
        console.log(`[${debugId}] 月次営業日指定を検出:`, taskData.business_day);
        setMonthlyType('business');
        setValue('business_day', taskData.business_day.toString(), { shouldDirty: true });
        setValue('monthday', '', { shouldDirty: true });
      }
      else {
        // どちらも設定されていない場合はデフォルト値
        console.log(`[${debugId}] 月次設定が未設定、デフォルト値を使用します`);
        setMonthlyType('day');
        setValue('monthday', '1', { shouldDirty: true });
        setValue('business_day', '', { shouldDirty: true });
        handleFieldChange('monthday', '1');
      }
    }
  };

  // 曜日のチェック状態を切り替える
  const toggleWeekday = (weekdayValue) => {
    console.log('曜日切り替え:', weekdayValue, '現在の選択:', selectedWeekdays);
    
    let newSelectedWeekdays;
    
    if (selectedWeekdays.includes(weekdayValue)) {
      // 選択済みの場合は削除
      newSelectedWeekdays = selectedWeekdays.filter(day => day !== weekdayValue);
    } else {
      // 未選択の場合は追加して昇順ソート
      newSelectedWeekdays = [...selectedWeekdays, weekdayValue].sort((a, b) => a - b);
    }
    
    console.log('新しい選択曜日:', newSelectedWeekdays);
    setSelectedWeekdays(newSelectedWeekdays);
  };
  
  // 月次パターンタイプの切り替え
  const handleMonthlyTypeChange = (type) => {
    setMonthlyType(type);
    
    // 切り替え時に他方の値をクリア
    if (type === 'day') {
      setValue('business_day', '', { shouldDirty: true });
      handleFieldChange('business_day', '');
      
      // 日指定が空の場合はデフォルト値を設定
      if (!monthday) {
        setValue('monthday', '1', { shouldDirty: true });
        handleFieldChange('monthday', '1');
      }
    } else {
      setValue('monthday', '', { shouldDirty: true });
      handleFieldChange('monthday', '');
      
      // 営業日指定が空の場合はデフォルト値を設定
      if (!business_day) {
        setValue('business_day', '1', { shouldDirty: true });
        handleFieldChange('business_day', '1');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-medium text-gray-700 flex items-center">
          <HiOutlineRefresh className="mr-2 text-gray-500" />
          繰り返し設定
        </h3>
      </div>

      <div className="space-y-4">
        {/* 繰り返しタスクの有効/無効 */}
        <div>
          <Controller
            name="is_recurring"
            control={control}
            render={({ field }) => (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={field.value === 'true'}
                  onChange={(e) => {
                    const value = e.target.checked ? 'true' : 'false';
                    field.onChange(value);
                    handleFieldChange('is_recurring', value);
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700">
                  このタスクを繰り返し設定する
                </label>
              </div>
            )}
          />
        </div>

        {/* 繰り返しが有効な場合の詳細設定 */}
        {isRecurring === 'true' && (
          <div className="pl-6 space-y-4">
            {/* 繰り返しパターン */}
            <div>
              <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-gray-700">
                繰り返しパターン
              </label>
              <Controller
                name="recurrence_pattern"
                control={control}
                render={({ field }) => (
                  <select
                    id="recurrence_pattern"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('recurrence_pattern', e.target.value);
                    }}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="">選択してください</option>
                    {recurrencePatterns.map((pattern) => (
                      <option key={pattern.value} value={pattern.value}>
                        {pattern.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* 毎週の場合は曜日選択を表示 */}
            {recurrencePattern === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  曜日を選択（複数可）
                </label>
                <div className="space-y-2">
                  {weekdayOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`weekday-${option.value}`}
                        checked={selectedWeekdays.includes(option.value)}
                        onChange={() => toggleWeekday(option.value)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`weekday-${option.value}`} className="ml-2 block text-sm text-gray-700">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
                
                {/* weekdaysのhidden input */}
                <Controller
                  name="weekdays"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="hidden"
                      {...field}
                      id="weekdays-hidden-input"
                    />
                  )}
                />
                
                {/* デバッグ用表示 */}
                <p className="mt-1 text-sm text-gray-500">
                  {selectedWeekdays.length > 0
                    ? `選択した曜日: ${selectedWeekdays.map(day => weekdayOptions.find(opt => opt.value === day)?.label).join(', ')}`
                    : '少なくとも1つの曜日を選択してください'}
                </p>
              </div>
            )}

            {/* 毎月の場合は日付指定を表示 */}
            {recurrencePattern === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  繰り返しの設定
                </label>
                
                {/* 毎月の設定タイプ選択 */}
                <div className="flex space-x-4 mb-3">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="monthly-type-day"
                      name="monthly-type"
                      checked={monthlyType === 'day'}
                      onChange={() => handleMonthlyTypeChange('day')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <label htmlFor="monthly-type-day" className="ml-2 block text-sm text-gray-700">
                      毎月X日
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="monthly-type-business"
                      name="monthly-type"
                      checked={monthlyType === 'business'}
                      onChange={() => handleMonthlyTypeChange('business')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <label htmlFor="monthly-type-business" className="ml-2 block text-sm text-gray-700">
                      毎月X営業日
                    </label>
                  </div>
                </div>
                
                {/* 毎月X日の設定 */}
                {monthlyType === 'day' && (
                  <div className="mt-2">
                    <Controller
                      name="monthday"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center">
                          <span className="mr-2">毎月</span>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('monthday', e.target.value);
                            }}
                            className="w-16 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                          <span className="ml-2">日に繰り返す</span>
                        </div>
                      )}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      ※ 設定日が存在しない月の場合、その月の最終日に設定されます（例：31日→2月28日）
                    </p>
                  </div>
                )}
                
                {/* 毎月X営業日の設定 */}
                {monthlyType === 'business' && (
                  <div className="mt-2">
                    <Controller
                      name="business_day"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center">
                          <span className="mr-2">毎月</span>
                          <input
                            type="number"
                            min="1"
                            max="23"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('business_day', e.target.value);
                            }}
                            className="w-16 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                          <span className="ml-2">営業日に繰り返す</span>
                        </div>
                      )}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      ※ 営業日は土日を除く平日です
                    </p>
                  </div>
                )}
                
                {/* hidden inputs */}
                <Controller name="monthday" control={control} render={({ field }) => (
                  monthlyType !== 'day' ? <input type="hidden" {...field} /> : null
                )} />
                <Controller name="business_day" control={control} render={({ field }) => (
                  monthlyType !== 'business' ? <input type="hidden" {...field} /> : null
                )} />
              </div>
            )}

            {/* 繰り返し終了日 */}
            <div>
              <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700">
                繰り返し終了日（オプション）
              </label>
              <Controller
                name="recurrence_end_date"
                control={control}
                render={({ field }) => (
                  <input
                    type="date"
                    id="recurrence_end_date"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('recurrence_end_date', e.target.value);
                    }}
                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                )}
              />
              <p className="mt-1 text-sm text-gray-500">
                設定しない場合、繰り返しは無期限に続きます
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskRecurrenceSection; 