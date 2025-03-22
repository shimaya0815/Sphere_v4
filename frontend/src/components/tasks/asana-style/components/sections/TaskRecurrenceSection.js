import React, { useState, useEffect, useRef } from 'react';
import { Controller } from 'react-hook-form';
import { HiOutlineRefresh } from 'react-icons/hi';

const TaskRecurrenceSection = ({ 
  control, 
  handleFieldChange,
  inputClassName = "",
  selectClassName = "", 
  watch = () => null,
  setValue,
  formState = {},
  task  // タスクオブジェクト
}) => {
  // watchが関数でない場合のフォールバック
  const safeWatch = typeof watch === 'function' ? watch : () => null;
  
  const isRecurring = safeWatch('is_recurring');
  const recurrencePattern = safeWatch('recurrence_pattern');
  const weekday = safeWatch('weekday');
  const weekdays = safeWatch('weekdays');
  const monthday = safeWatch('monthday');
  const business_day = safeWatch('business_day');
  const consider_holidays = safeWatch('consider_holidays');

  // 選択された曜日を管理する内部状態
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  // 月次パターンのタイプ（日指定か営業日指定か）
  const [monthlyType, setMonthlyType] = useState('day'); // 'day' or 'business'
  // 内部状態でUI表示を制御（React Hook Formの状態と連動）
  const [internalIsRecurring, setInternalIsRecurring] = useState(false);
  const [internalPattern, setInternalPattern] = useState('daily');
  
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

  // コンポーネントマウント時に初期値を設定
  useEffect(() => {
    // is_recurringの初期値を設定（新規タスク作成時用）
    if (setValue && !isRecurring) {
      console.log('繰り返し設定の初期値を設定します: false');
      setValue('is_recurring', false);
      handleFieldChange('is_recurring', false);
    }
  }, []);

  // 安全にsetValueを使用するためのヘルパー関数
  const safeSetValue = (name, value, options = {}) => {
    if (typeof setValue === 'function') {
      setValue(name, value, options);
    } else {
      console.log(`setValue関数が利用できません。値を設定できません: ${name}=${value}`);
      // handleFieldChangeを使用して値を更新することを試みる
      handleFieldChange(name, value);
    }
  };

  // コンポーネントマウント時に初期値を設定
  useEffect(() => {
    // is_recurringの初期値を設定（新規タスク作成時用）
    if (!isRecurring) {
      console.log('繰り返し設定の初期値を設定します: false');
      safeSetValue('is_recurring', false);
      handleFieldChange('is_recurring', false);
    }
  }, []);

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
    
    console.log(`[${debugId}] タスク初期化処理: ${previousTaskId} -> ${currentTaskId}, is_template:${task.is_template}`);
    
    // データの初期化
    if (task?.is_recurring === true) {
      console.log(`[${debugId}] 繰り返しタスクを検出しました: パターン=${task.recurrence_pattern}`);
      safeSetValue('is_recurring', true, { shouldDirty: true });
      setInternalIsRecurring(true);
      
      // パターンがある場合は設定
      if (task.recurrence_pattern) {
        safeSetValue('recurrence_pattern', task.recurrence_pattern, { shouldDirty: true });
        setInternalPattern(task.recurrence_pattern);
        
        // パターンに応じた詳細設定
        if (task.recurrence_pattern === 'weekly') {
          // 週次設定の初期化
          initializeWeekly(task, debugId);
        } 
        else if (task.recurrence_pattern === 'monthly') {
          // 月次設定の初期化
          initializeMonthly(task, debugId);
        }
      }
      
      // 祝日考慮設定
      if (task.consider_holidays !== undefined) {
        safeSetValue('consider_holidays', task.consider_holidays, { shouldDirty: true });
      } else {
        // デフォルトは営業日指定の場合のみtrue
        const isBusinessDayType = task.business_day !== undefined && task.business_day !== null && task.business_day > 0;
        safeSetValue('consider_holidays', isBusinessDayType, { shouldDirty: true });
      }
      
      // 終了日がある場合は設定
      if (task.recurrence_end_date) {
        safeSetValue('recurrence_end_date', task.recurrence_end_date, { shouldDirty: true });
      }
    } else {
      console.log(`[${debugId}] 非繰り返しタスクです`);
      safeSetValue('is_recurring', 'false', { shouldDirty: true });
      // 祝日考慮はデフォルトでfalse
      safeSetValue('consider_holidays', false, { shouldDirty: true });
    }
    
    // 現在のタスクを記憶
    previousTaskRef.current = task;
  }, [task?.id]);

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
      safeSetValue('weekdays', weekdaysString, { shouldDirty: true });
    }
  };
  
  // 月次繰り返しの初期化
  const initializeMonthly = (taskData, debugId) => {
    if (!taskData) return;
    
    console.log(`[${debugId}] 月次設定の初期化を実行します:`, {
      monthday: taskData.monthday,
      business_day: taskData.business_day,
      consider_holidays: taskData.consider_holidays
    });
    
    // すでに選択されている月次タイプがある場合はそれを続行
    if (monthlyType) {
      console.log(`[${debugId}] 既存の月次タイプを検出: ${monthlyType}`);
      
      // 既存のタイプに基づいてフォームを設定
      if (monthlyType === 'day') {
        console.log(`[${debugId}] 日付タイプが選択されているため、日付設定を優先します`);
        safeSetValue('monthday', taskData.monthday?.toString() || '1', { shouldDirty: true });
        safeSetValue('business_day', '', { shouldDirty: true });
        handleFieldChange('monthday', parseInt(taskData.monthday?.toString() || '1', 10));
        handleFieldChange('business_day', null);
        // 祝日考慮は無効化
        safeSetValue('consider_holidays', false, { shouldDirty: true });
        handleFieldChange('consider_holidays', false);
        return;
      } else if (monthlyType === 'business') {
        console.log(`[${debugId}] 営業日タイプが選択されているため、営業日設定を優先します`);
        safeSetValue('business_day', taskData.business_day?.toString() || '1', { shouldDirty: true });
        safeSetValue('monthday', '', { shouldDirty: true });
        handleFieldChange('business_day', parseInt(taskData.business_day?.toString() || '1', 10));
        handleFieldChange('monthday', null);
        // 祝日考慮設定を設定
        const considerHolidays = taskData.consider_holidays !== undefined ? taskData.consider_holidays : true;
        safeSetValue('consider_holidays', considerHolidays, { shouldDirty: true });
        handleFieldChange('consider_holidays', considerHolidays);
        return;
      }
      // デフォルトはdayタイプを優先
    }
    
    // タスクに設定されている値に基づいて初期化
    if (taskData.monthday !== undefined && taskData.monthday !== null && taskData.monthday > 0) {
      console.log(`[${debugId}] 月次日付指定を検出:`, taskData.monthday);
      setMonthlyType('day');
      safeSetValue('monthday', taskData.monthday.toString(), { shouldDirty: true });
      // 営業日を空に設定
      safeSetValue('business_day', '', { shouldDirty: true });
      // 祝日考慮は無効化
      safeSetValue('consider_holidays', false, { shouldDirty: true });
      // APIに送信するデータも更新
      handleFieldChange('monthday', parseInt(taskData.monthday.toString(), 10));
      handleFieldChange('business_day', null);
      handleFieldChange('consider_holidays', false);
    } 
    else if (taskData.business_day !== undefined && taskData.business_day !== null && taskData.business_day > 0) {
      console.log(`[${debugId}] 月次営業日指定を検出:`, taskData.business_day);
      setMonthlyType('business');
      safeSetValue('business_day', taskData.business_day.toString(), { shouldDirty: true });
      // 日付指定を空に設定
      safeSetValue('monthday', '', { shouldDirty: true });
      // 祝日考慮設定を設定
      const considerHolidays = taskData.consider_holidays !== undefined ? taskData.consider_holidays : true;
      safeSetValue('consider_holidays', considerHolidays, { shouldDirty: true });
      // APIに送信するデータも更新
      handleFieldChange('business_day', parseInt(taskData.business_day.toString(), 10));
      handleFieldChange('monthday', null);
      handleFieldChange('consider_holidays', considerHolidays);
    }
    else {
      // どちらも設定されていない場合はデフォルト値
      console.log(`[${debugId}] 月次設定が未設定、デフォルト値を使用します`);
      setMonthlyType('day');
      safeSetValue('monthday', '1', { shouldDirty: true });
      safeSetValue('business_day', '', { shouldDirty: true });
      safeSetValue('consider_holidays', false, { shouldDirty: true });
      handleFieldChange('monthday', 1);
      handleFieldChange('business_day', null);
      handleFieldChange('consider_holidays', false);
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
    console.log(`月次タイプを変更: ${monthlyType} → ${type}`);
    setMonthlyType(type);
    
    // タイプに応じたフィールドをクリア
    if (type === 'day') {
      // 営業日指定をクリア
      safeSetValue('business_day', null, { shouldDirty: true });
      handleFieldChange('business_day', null);
      // 祝日考慮はデフォルトでfalse
      safeSetValue('consider_holidays', false, { shouldDirty: true });
      handleFieldChange('consider_holidays', false);
    } else if (type === 'business') {
      // 日指定をクリア
      safeSetValue('monthday', null, { shouldDirty: true });
      handleFieldChange('monthday', null);
      // 祝日考慮はデフォルトでtrue
      safeSetValue('consider_holidays', true, { shouldDirty: true });
      handleFieldChange('consider_holidays', true);
    }
  };

  // 内部状態とフォーム状態を同期するための追加のuseEffect
  useEffect(() => {
    // isRecurringフィールドの変更を内部状態に反映
    const isRecurringValue = isRecurring === 'true' || isRecurring === true || isRecurring === 1 || isRecurring === '1';
    if (isRecurringValue !== internalIsRecurring) {
      console.log('フォーム状態が変更されました、内部状態を同期します:', isRecurring, '→', isRecurringValue);
      setInternalIsRecurring(isRecurringValue);
    }
    
    // recurrencePatternフィールドの変更を内部状態に反映
    if (recurrencePattern && recurrencePattern !== internalPattern) {
      console.log('パターン状態が変更されました、内部状態を同期します:', recurrencePattern);
      setInternalPattern(recurrencePattern);
    }
  }, [isRecurring, recurrencePattern]);

  // タスクデータの変更を監視し、毎月の繰り返し設定を初期化
  useEffect(() => {
    if (task) {
      // デバッグID生成
      const debugId = `taskInit-${debugCounterRef.current++}`;
      console.log(`[${debugId}] タスクデータ変更を検出、月次設定を初期化します:`, {
        task_id: task.id,
        is_recurring: task.is_recurring,
        recurrence_pattern: task.recurrence_pattern,
        monthday: task.monthday,
        business_day: task.business_day
      });
      
      // タスクデータに基づいて月次設定を初期化
      initializeMonthly(task, debugId);
    }
  }, [task, setValue]);
  
  // タスクと繰り返しパターンの変更を監視し、パターンがmonthlyに変わった場合も初期化
  useEffect(() => {
    if (recurrencePattern === 'monthly' && isRecurring === true) {
      const debugId = `patternChange-${debugCounterRef.current++}`;
      console.log(`[${debugId}] 月次パターンへの変更を検出、初期化します`);
      
      // フォーム値から現在の状態を構築
      const currentData = {
        is_recurring: isRecurring,
        recurrence_pattern: recurrencePattern,
        monthday: monthday || null,
        business_day: business_day || null
      };
      
      // 現在のフォーム値に基づいて初期化
      initializeMonthly(currentData, debugId);
    }
  }, [recurrencePattern, isRecurring]);

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
                  checked={field.value === 'true' || field.value === true || field.value === 1 || field.value === '1' || internalIsRecurring}
                  onChange={(e) => {
                    const value = e.target.checked;
                    console.log('繰り返し設定チェックボックス変更:', value);
                    field.onChange(value);
                    safeSetValue('is_recurring', value, { shouldDirty: true });
                    setInternalIsRecurring(value);
                    handleFieldChange('is_recurring', value);
                    
                    // 初期パターン設定
                    if (value && !recurrencePattern) {
                      console.log('デフォルト繰り返しパターンを設定します: daily');
                      safeSetValue('recurrence_pattern', 'daily', { shouldDirty: true });
                      setInternalPattern('daily');
                      handleFieldChange('recurrence_pattern', 'daily');
                    }
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

        {console.log('繰り返し設定状態:', isRecurring, 'タイプ:', typeof isRecurring, '内部状態:', internalIsRecurring)}
        
        {/* 繰り返しが有効な場合の詳細設定 */}
        {(isRecurring === 'true' || isRecurring === true || isRecurring === 1 || isRecurring === '1' || internalIsRecurring) && (
          <div className="pl-6 space-y-4 border-l-2 border-gray-200 ml-1">
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
                    value={field.value || internalPattern}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setInternalPattern(e.target.value);
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
            {(recurrencePattern === 'weekly' || internalPattern === 'weekly') && (
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
            {(recurrencePattern === 'monthly' || internalPattern === 'monthly') && (
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
                              // 整数値として送信
                              const numValue = parseInt(e.target.value, 10);
                              handleFieldChange('monthday', isNaN(numValue) ? null : numValue);
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
                              // 整数値として送信
                              const numValue = parseInt(e.target.value, 10);
                              handleFieldChange('business_day', isNaN(numValue) ? null : numValue);
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
                
                {/* 祝日考慮設定（営業日指定の場合のみ表示） */}
                {monthlyType === 'business' && (
                  <div className="mt-2">
                    <Controller
                      name="consider_holidays"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="consider-holidays"
                            checked={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.checked);
                              handleFieldChange('consider_holidays', e.target.checked);
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label htmlFor="consider-holidays" className="ml-2 block text-sm text-gray-700">
                            日本の祝日も営業日から除外する
                          </label>
                        </div>
                      )}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      ※ チェックを入れると、土日に加えて日本の祝日も営業日としてカウントしません
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