import React, { useState } from 'react';

const TimeFilters = ({ 
  selectedRange, 
  userFilter, 
  clientFilter, 
  taskFilter, 
  customDateRange,
  onRangeChange,
  onUserFilterChange,
  onClientFilterChange,
  onTaskFilterChange,
  onCustomDateChange,
  users,
  availableClients,
  availableTasks,
  compact = false // コンパクトモード（テーブル上部用）
}) => {
  const [showDatePicker, setShowDatePicker] = useState(selectedRange === 'custom');
  
  const handleRangeChange = (e) => {
    const value = e.target.value;
    onRangeChange(value);
    
    if (value === 'custom') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
    }
  };

  // コンパクトモード用のクラス
  const containerClass = compact 
    ? "p-0 mb-0" 
    : "bg-white rounded-lg shadow-md p-6 mb-8";
  
  const gridClass = compact
    ? "grid grid-cols-1 md:grid-cols-5 lg:grid-cols-6 gap-2"
    : "grid grid-cols-1 md:grid-cols-4 gap-4";
    
  const inputClass = compact
    ? "select select-bordered select-sm w-full"
    : "select select-bordered w-full";
    
  const labelClass = compact
    ? "block text-xs font-medium text-gray-700 mb-1"
    : "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className={containerClass}>
      <div className={gridClass}>
        {/* ユーザー */}
        <div>
          <label className={labelClass}>ユーザー</label>
          <select 
            className={inputClass}
            value={userFilter}
            onChange={(e) => onUserFilterChange(e.target.value)}
          >
            <option value="all">全てのユーザー</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.get_full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
              </option>
            ))}
          </select>
        </div>
        
        {/* 期間 */}
        <div>
          <label className={labelClass}>期間</label>
          <select 
            className={inputClass}
            value={selectedRange}
            onChange={handleRangeChange}
          >
            <option value="today">今日</option>
            <option value="week">今週</option>
            <option value="month">今月</option>
            <option value="custom">カスタム期間</option>
          </select>
        </div>
        
        {/* カスタム日付 */}
        {showDatePicker && (
          <>
            <div>
              <label className={labelClass}>開始日</label>
              <input 
                type="date" 
                className={inputClass.replace('select', 'input')}
                value={customDateRange.startDate}
                onChange={(e) => onCustomDateChange({
                  ...customDateRange,
                  startDate: e.target.value
                })}
              />
            </div>
            <div>
              <label className={labelClass}>終了日</label>
              <input 
                type="date" 
                className={inputClass.replace('select', 'input')}
                value={customDateRange.endDate}
                onChange={(e) => onCustomDateChange({
                  ...customDateRange,
                  endDate: e.target.value
                })}
              />
            </div>
          </>
        )}
        
        {/* クライアント */}
        <div>
          <label className={labelClass}>クライアント</label>
          <select 
            className={inputClass}
            value={clientFilter}
            onChange={(e) => onClientFilterChange(e.target.value)}
          >
            <option value="all">全てのクライアント</option>
            {availableClients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
        
        {/* タスク */}
        <div>
          <label className={labelClass}>タスク</label>
          <select 
            className={inputClass}
            value={taskFilter}
            onChange={(e) => onTaskFilterChange(e.target.value)}
          >
            <option value="all">全てのタスク</option>
            {availableTasks.map(task => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default TimeFilters;