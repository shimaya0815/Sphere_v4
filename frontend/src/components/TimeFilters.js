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
  availableTasks
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">期間</label>
          <select 
            className="select select-bordered w-full"
            value={selectedRange}
            onChange={handleRangeChange}
          >
            <option value="today">今日</option>
            <option value="week">今週</option>
            <option value="month">今月</option>
            <option value="custom">カスタム期間</option>
          </select>
          
          {showDatePicker && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">開始日</label>
                <input 
                  type="date" 
                  className="input input-bordered input-sm w-full" 
                  value={customDateRange.startDate}
                  onChange={(e) => onCustomDateChange({
                    ...customDateRange,
                    startDate: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">終了日</label>
                <input 
                  type="date" 
                  className="input input-bordered input-sm w-full" 
                  value={customDateRange.endDate}
                  onChange={(e) => onCustomDateChange({
                    ...customDateRange,
                    endDate: e.target.value
                  })}
                />
              </div>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー</label>
          <select 
            className="select select-bordered w-full"
            value={userFilter}
            onChange={(e) => onUserFilterChange(e.target.value)}
          >
            <option value="all">全てのユーザー</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">クライアント</label>
          <select 
            className="select select-bordered w-full"
            value={clientFilter}
            onChange={(e) => onClientFilterChange(e.target.value)}
          >
            <option value="all">全てのクライアント</option>
            {availableClients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タスク</label>
          <select 
            className="select select-bordered w-full"
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