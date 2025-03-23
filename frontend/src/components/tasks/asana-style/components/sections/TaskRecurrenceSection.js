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
  const yearly_month = safeWatch('yearly_month');
  const yearly_day = safeWatch('yearly_day');

  // 選択された曜日を管理する内部状態
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  // 月次パターンのタイプ（日指定か営業日指定か）
  const [monthlyType, setMonthlyType] = useState('day'); // 'day' or 'business'
  // 内部状態でUI表示を制御（React Hook Formの状態と連動）
  const [internalIsRecurring, setInternalIsRecurring] = useState(false);
  const [internalPattern, setInternalPattern] = useState('daily');
  // 祝日考慮の内部状態
  const [internalConsiderHolidays, setInternalConsiderHolidays] = useState(true);
  
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

  // フォームの初期値を追加でセットする関数
  const initializeFormValues = () => {
    // 現在の日付から月と日を取得
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate(); // 1-31
    
    // 初期値設定
    if (typeof setValue === 'function') {
      // 日付関連のデフォルト値
      setValue('yearly_month', currentMonth);
      setValue('yearly_day', currentDay);
      setValue('monthday', currentDay);
      setValue('business_day', 1);
      setValue('recurrence_pattern', 'daily');
      setValue('is_recurring', false);
      setValue('consider_holidays', true);
      setValue('weekdays', '');
    }
  };

  // コンポーネントマウント時に一度だけ初期値を設定
  useEffect(() => {
    // 初期化済みでない場合のみ処理を実行
    if (!initializedRef.current) {
      try {
        // フォームの初期値を設定
        initializeFormValues();
      } catch (error) {
        console.error('初期化時にエラーが発生しました:', error);
      }
      
      // 内部状態を初期化
      setInternalIsRecurring(false);
      
      // 初期化済みフラグを設定
      initializedRef.current = true;
    }
  }, []);

  // 安全にsetValueを使用するためのヘルパー関数
  const safeSetValue = (name, value, options = {}) => {
    try {
      // setValueが関数の場合のみ実行
      if (typeof setValue === 'function') {
        setValue(name, value, options);
        return true;
      }
    } catch (error) {
      console.error(`setValue実行中にエラーが発生しました: ${name}=${value}`, error);
    }

    // setValueが関数でない場合やエラーの場合はhandleFieldChangeで代替
    try {
      if (typeof handleFieldChange === 'function') {
        handleFieldChange(name, value);
        return true;
      }
    } catch (error) {
      console.error(`handleFieldChange実行中にエラーが発生しました: ${name}=${value}`, error);
    }
    
    // どちらの方法でも更新できなかった場合
    console.warn(`値を設定できませんでした: ${name}=${value}`);
    return false;
  };

  // タスクデータが変更されたとき、または初期化が必要なときに実行
  useEffect(() => {
    // タスクがない場合はスキップ
    if (!task || !task.id) {
      return;
    }
    
    // タスクIDが変更されたかチェック
    const previousTaskId = previousTaskRef.current?.id;
    const currentTaskId = task.id;
    
    // IDが同じ場合は処理をスキップ（再レンダリング防止）
    if (previousTaskId === currentTaskId) {
      return;
    }
    
    // データの初期化
    if (task?.is_recurring === true) {
      safeSetValue('is_recurring', true, { shouldDirty: true });
      setInternalIsRecurring(true);
      
      // パターンがある場合は設定
      if (task.recurrence_pattern) {
        safeSetValue('recurrence_pattern', task.recurrence_pattern, { shouldDirty: true });
        setInternalPattern(task.recurrence_pattern);
        
        // パターンに応じた詳細設定
        if (task.recurrence_pattern === 'weekly') {
          // 週次設定の初期化
          initializeWeekly(task);
        } 
        else if (task.recurrence_pattern === 'monthly') {
          // 月次設定の初期化
          initializeMonthly(task);
        }
        else if (task.recurrence_pattern === 'yearly') {
          // 年次設定の初期化
          initializeYearly(task);
        }
      }
      
      // 祝日考慮設定
      if (task.consider_holidays !== undefined) {
        const holidaysValue = task.consider_holidays === true || task.consider_holidays === 'true' || task.consider_holidays === 1 || task.consider_holidays === '1';
        safeSetValue('consider_holidays', holidaysValue, { shouldDirty: true });
        setInternalConsiderHolidays(holidaysValue);
      } else {
        // デフォルトは営業日指定の場合のみtrue
        const isBusinessDayType = task.business_day !== undefined && task.business_day !== null && task.business_day > 0;
        safeSetValue('consider_holidays', isBusinessDayType, { shouldDirty: true });
        setInternalConsiderHolidays(isBusinessDayType);
      }
      
      // 終了日がある場合は設定
      if (task.recurrence_end_date) {
        safeSetValue('recurrence_end_date', task.recurrence_end_date, { shouldDirty: true });
      }
    } else {
      safeSetValue('is_recurring', false, { shouldDirty: true });
      setInternalIsRecurring(false);
      // 祝日考慮はデフォルトでfalse
      safeSetValue('consider_holidays', false, { shouldDirty: true });
      setInternalConsiderHolidays(false);
    }
    
    // 現在のタスクを記憶
    previousTaskRef.current = task;
  }, [task?.id]);

  // 曜日選択の状態が変わったときにフォーム値を更新
  useEffect(() => {
    try {
      if (initializedRef.current && selectedWeekdays.length >= 0) {
        const newWeekdaysValue = selectedWeekdays.length > 0 ? selectedWeekdays.join(',') : '';
        
        // フォーム値を更新（現在と異なる場合のみ）
        if (weekdays !== newWeekdaysValue) {
          if (typeof setValue === 'function') {
            setValue('weekdays', newWeekdaysValue, { shouldDirty: true });
          }
          if (typeof handleFieldChange === 'function') {
            handleFieldChange('weekdays', newWeekdaysValue);
          }
        }
      }
    } catch (error) {
      console.error('曜日設定更新時にエラーが発生しました:', error);
    }
  }, [selectedWeekdays]);

  // 初期化関数 - タスクデータから選択状態を設定
  const initializeFromTaskData = (taskData) => {
    if (!taskData) return;
    
    // 繰り返しパターンごとの初期化処理
    if (taskData.recurrence_pattern === 'weekly') {
      initializeWeekly(taskData);
    } else if (taskData.recurrence_pattern === 'monthly') {
      initializeMonthly(taskData);
    }
  };
  
  // 週次繰り返しの初期化
  const initializeWeekly = (taskData) => {
    // 繰り返しが有効で、週次パターンの場合のみ曜日選択を初期化
    const isRecurringTask = taskData.is_recurring === true || taskData.is_recurring === 'true';
    const isWeeklyPattern = taskData.recurrence_pattern === 'weekly';
    
    if (isRecurringTask && isWeeklyPattern) {
      let weekdaysToSelect = [];
      
      // 複数曜日指定を優先
      if (taskData.weekdays) {
        try {
          // 文字列を配列に変換
          weekdaysToSelect = taskData.weekdays.split(',')
            .map(day => {
              const parsed = parseInt(day.trim(), 10);
              return isNaN(parsed) ? null : parsed;
            })
            .filter(day => day !== null && day >= 0 && day <= 6);
        } catch (err) {
          weekdaysToSelect = [];
        }
      } 
      // weekdaysがない場合は単一weekdayフィールドを確認
      else if (taskData.weekday !== undefined && taskData.weekday !== null) {
        const weekdayValue = parseInt(taskData.weekday, 10);
        if (!isNaN(weekdayValue) && weekdayValue >= 0 && weekdayValue <= 6) {
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
  const initializeMonthly = (taskData) => {
    if (!taskData) return;
    
    // すでに選択されている月次タイプがある場合はそれを続行
    const currentMonthType = monthlyType || 'day';
    
    // タスクに設定されている値に基づいて初期化
    if (taskData.business_day !== undefined && taskData.business_day !== null && taskData.business_day > 0) {
      // 営業日指定が優先
      setMonthlyType('business');
      safeSetValue('business_day', String(taskData.business_day), { shouldDirty: true });
      safeSetValue('monthday', null, { shouldDirty: true });
      
      // 祝日考慮設定
      const shouldConsiderHolidays = taskData.consider_holidays !== false;
      safeSetValue('consider_holidays', shouldConsiderHolidays, { shouldDirty: true });
      setInternalConsiderHolidays(shouldConsiderHolidays);
    } 
    else if (taskData.monthday !== undefined && taskData.monthday !== null && taskData.monthday > 0) {
      // 日付指定
      setMonthlyType('day');
      safeSetValue('monthday', String(taskData.monthday), { shouldDirty: true });
      safeSetValue('business_day', null, { shouldDirty: true });
      safeSetValue('consider_holidays', false, { shouldDirty: true });
      setInternalConsiderHolidays(false);
    }
    else {
      // どちらも設定されていない場合はデフォルト値
      setMonthlyType(currentMonthType);
      
      if (currentMonthType === 'day') {
        safeSetValue('monthday', '1', { shouldDirty: true });
        safeSetValue('business_day', null, { shouldDirty: true });
        safeSetValue('consider_holidays', false, { shouldDirty: true });
        setInternalConsiderHolidays(false);
      } else {
        safeSetValue('business_day', '1', { shouldDirty: true });
        safeSetValue('monthday', null, { shouldDirty: true });
        safeSetValue('consider_holidays', true, { shouldDirty: true });
        setInternalConsiderHolidays(true);
      }
    }
  };

  // 年次繰り返しの初期化
  const initializeYearly = (taskData) => {
    if (!taskData) return;
    
    // 月と日の設定
    const currentMonth = taskData.yearly_month || new Date().getMonth() + 1; // 1-12
    const currentDay = taskData.yearly_day || 1; // 1-31
    
    safeSetValue('yearly_month', String(currentMonth), { shouldDirty: true });
    safeSetValue('yearly_day', String(currentDay), { shouldDirty: true });
  };

  // 曜日のチェック状態を切り替える
  const toggleWeekday = (weekdayValue) => {
    try {
      let newSelectedWeekdays;
      
      if (selectedWeekdays.includes(weekdayValue)) {
        // 選択済みの場合は削除
        newSelectedWeekdays = selectedWeekdays.filter(day => day !== weekdayValue);
      } else {
        // 未選択の場合は追加して昇順ソート
        newSelectedWeekdays = [...selectedWeekdays, weekdayValue].sort((a, b) => a - b);
      }
      
      setSelectedWeekdays(newSelectedWeekdays);
    } catch (error) {
      console.error('曜日切り替え時にエラーが発生しました:', error);
    }
  };
  
  // 月次パターンタイプの切り替え
  const handleMonthlyTypeChange = (type) => {
    if (type === monthlyType) return; // 同じ値なら何もしない
    
    setMonthlyType(type);
    
    // タイプに応じたフィールドをクリア
    if (type === 'day') {
      // 営業日指定をクリア
      safeSetValue('business_day', null, { shouldDirty: true });
      
      // 日付指定のデフォルト値を設定
      const currentMonthday = safeWatch('monthday');
      if (!currentMonthday) {
        safeSetValue('monthday', '1', { shouldDirty: true });
      }
      
      // 祝日考慮はデフォルトでfalse
      safeSetValue('consider_holidays', false, { shouldDirty: true });
      setInternalConsiderHolidays(false);
    } else if (type === 'business') {
      // 日指定をクリア
      safeSetValue('monthday', null, { shouldDirty: true });
      
      // 営業日指定のデフォルト値を設定
      const currentBusinessDay = safeWatch('business_day');
      if (!currentBusinessDay) {
        safeSetValue('business_day', '1', { shouldDirty: true });
      }
      
      // 祝日考慮はデフォルトでtrue
      safeSetValue('consider_holidays', true, { shouldDirty: true });
      setInternalConsiderHolidays(true);
    }
  };

  // 内部状態とフォーム状態を同期するための追加のuseEffect
  useEffect(() => {
    // isRecurringフィールドの変更を内部状態に反映
    const isRecurringValue = isRecurring === 'true' || isRecurring === true || isRecurring === 1 || isRecurring === '1';
    if (isRecurringValue !== internalIsRecurring) {
      setInternalIsRecurring(isRecurringValue);
    }
    
    // recurrencePatternフィールドの変更を内部状態に反映
    if (recurrencePattern && recurrencePattern !== internalPattern) {
      setInternalPattern(recurrencePattern);
    }

    // consider_holidaysフィールドの変更を内部状態に反映
    const holidaysValue = consider_holidays === 'true' || consider_holidays === true || consider_holidays === 1 || consider_holidays === '1';
    if (holidaysValue !== internalConsiderHolidays) {
      setInternalConsiderHolidays(holidaysValue);
    }
  }, [isRecurring, recurrencePattern, consider_holidays]);

  // 繰り返しパターンの変更を監視し、パターンが変わった場合も初期化
  useEffect(() => {
    // 繰り返しが有効な場合のみ実行
    const isRecurringValue = isRecurring === 'true' || isRecurring === true || isRecurring === 1 || isRecurring === '1';
    if (isRecurringValue && previousTaskRef.current) {
      if (recurrencePattern === 'monthly') {
        // フォーム値から現在の状態を構築
        const currentData = {
          is_recurring: isRecurringValue,
          recurrence_pattern: 'monthly',
          monthday: monthday || null,
          business_day: business_day || null,
          consider_holidays: consider_holidays
        };
        
        // 現在のフォーム値に基づいて初期化
        initializeMonthly(currentData);
      } else if (recurrencePattern === 'yearly') {
        // フォーム値から現在の状態を構築
        const currentData = {
          is_recurring: isRecurringValue,
          recurrence_pattern: 'yearly',
          yearly_month: yearly_month || new Date().getMonth() + 1,
          yearly_day: yearly_day || 1
        };
        
        // 現在のフォーム値に基づいて初期化
        initializeYearly(currentData);
      }
    }
  }, [recurrencePattern]);

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
                    try {
                      const value = e.target.checked;
                      field.onChange(value);
                      safeSetValue('is_recurring', value, { shouldDirty: true });
                      setInternalIsRecurring(value);
                      
                      // 初期パターン設定
                      if (value && !recurrencePattern) {
                        safeSetValue('recurrence_pattern', 'daily', { shouldDirty: true });
                        setInternalPattern('daily');
                      }
                    } catch (error) {
                      console.error('チェックボックス変更時にエラーが発生しました:', error);
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
                    value={field.value || "daily"}
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
                      value={field.value || ""}
                      id="weekdays-hidden-input"
                    />
                  )}
                />
                
                {/* 選択状態の表示 */}
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
                            value={field.value || ""}
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
                            value={field.value || ""}
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
                            checked={field.value === 'true' || field.value === true || field.value === 1 || field.value === '1' || internalConsiderHolidays}
                            onChange={(e) => {
                              try {
                                const value = e.target.checked;
                                field.onChange(value);
                                safeSetValue('consider_holidays', value, { shouldDirty: true });
                                setInternalConsiderHolidays(value);
                              } catch (error) {
                                console.error('祝日考慮設定変更時にエラーが発生しました:', error);
                              }
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
                  monthlyType !== 'day' ? <input type="hidden" {...field} value={field.value || ""} /> : null
                )} />
                <Controller name="business_day" control={control} render={({ field }) => (
                  monthlyType !== 'business' ? <input type="hidden" {...field} value={field.value || ""} /> : null
                )} />
              </div>
            )}

            {/* 毎年の場合は月日指定を表示 */}
            {(recurrencePattern === 'yearly' || internalPattern === 'yearly') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  繰り返しの設定
                </label>
                
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <span>毎年</span>
                    <Controller
                      name="yearly_month"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          value={field.value || "1"}
                          onChange={(e) => {
                            field.onChange(e);
                            const numValue = parseInt(e.target.value, 10);
                            handleFieldChange('yearly_month', isNaN(numValue) ? null : numValue);
                          }}
                          className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i+1} value={i+1}>{i+1}月</option>
                          ))}
                        </select>
                      )}
                    />
                    
                    <Controller
                      name="yearly_day"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="1"
                            max="31"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              field.onChange(e);
                              const numValue = parseInt(e.target.value, 10);
                              handleFieldChange('yearly_day', isNaN(numValue) ? null : numValue);
                            }}
                            className="w-16 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                          <span className="ml-2">日に繰り返す</span>
                        </div>
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    ※ 設定日が存在しない月の場合（例：2月30日）、その月の最終日に設定されます
                  </p>
                </div>
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
                    value={field.value || ""}
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