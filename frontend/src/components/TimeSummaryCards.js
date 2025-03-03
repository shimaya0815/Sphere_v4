import React from 'react';

const TimeSummaryCards = ({ summaryData }) => {
  if (!summaryData) return null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">今日の作業時間</h3>
        <div className="flex items-end">
          <p className="text-3xl font-bold text-primary-600">{summaryData.today.hours.toFixed(1)}h</p>
          <p className="text-sm text-gray-500 ml-2">{summaryData.today.entry_count} エントリ</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">今週の作業時間</h3>
        <div className="flex items-end">
          <p className="text-3xl font-bold text-primary-600">{summaryData.this_week.hours.toFixed(1)}h</p>
          <p className="text-sm text-gray-500 ml-2">{summaryData.this_week.entry_count} エントリ</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">今月の作業時間</h3>
        <div className="flex items-end">
          <p className="text-3xl font-bold text-primary-600">{summaryData.this_month.hours.toFixed(1)}h</p>
          <p className="text-sm text-gray-500 ml-2">{summaryData.this_month.entry_count} エントリ</p>
        </div>
      </div>
    </div>
  );
};

export default TimeSummaryCards;