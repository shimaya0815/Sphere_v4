import React, { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { HiOutlineRefresh } from 'react-icons/hi';

const TaskRecurrenceSection = ({ 
  control, 
  handleFieldChange, 
  watch 
}) => {
  const isRecurring = watch('is_recurring');
  const recurrencePattern = watch('recurrence_pattern');
  const weekday = watch('weekday');
  const weekdays = watch('weekdays');

  // 選択された曜日を管理する内部状態
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);

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

  // weekdaysが変更されたときに選択された曜日を更新
  useEffect(() => {
    if (weekdays) {
      try {
        const weekdayArray = weekdays.split(',').map(day => parseInt(day.trim(), 10));
        setSelectedWeekdays(weekdayArray.filter(day => !isNaN(day) && day >= 0 && day <= 6));
      } catch (e) {
        console.error('weekdays解析エラー:', e);
        setSelectedWeekdays([]);
      }
    } else {
      setSelectedWeekdays([]);
    }
  }, [weekdays]);

  // weekdayが設定されているときに、selectedWeekdaysに追加
  useEffect(() => {
    if (weekday !== null && weekday !== undefined && weekday !== '' && !selectedWeekdays.includes(parseInt(weekday, 10))) {
      const weekdayNum = parseInt(weekday, 10);
      if (!isNaN(weekdayNum) && weekdayNum >= 0 && weekdayNum <= 6) {
        const newSelectedWeekdays = [...selectedWeekdays, weekdayNum];
        setSelectedWeekdays(newSelectedWeekdays);
        
        // weekdaysフィールドを更新
        const weekdaysString = newSelectedWeekdays.join(',');
        handleFieldChange('weekdays', weekdaysString);
      }
    }
  }, [weekday, selectedWeekdays, handleFieldChange]);

  // 曜日のチェック状態を切り替える
  const toggleWeekday = (weekdayValue) => {
    let newSelectedWeekdays;
    
    if (selectedWeekdays.includes(weekdayValue)) {
      // 選択済みの場合は削除
      newSelectedWeekdays = selectedWeekdays.filter(day => day !== weekdayValue);
    } else {
      // 未選択の場合は追加
      newSelectedWeekdays = [...selectedWeekdays, weekdayValue].sort();
    }
    
    setSelectedWeekdays(newSelectedWeekdays);
    
    // weekdaysフィールドを更新
    const weekdaysString = newSelectedWeekdays.join(',');
    handleFieldChange('weekdays', weekdaysString);
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
                <Controller
                  name="weekdays"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="hidden"
                      {...field}
                      value={selectedWeekdays.join(',')}
                    />
                  )}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {selectedWeekdays.length > 0
                    ? '選択した曜日に繰り返されます'
                    : '少なくとも1つの曜日を選択してください'}
                </p>
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