import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

const TimeCharts = ({ timeChartData, projectChartData, COLORS }) => {
  const [activeTab, setActiveTab] = useState('charts');
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">作業時間分析</h2>
        <div className="tabs tabs-boxed">
          <a 
            className={`tab ${activeTab === 'charts' ? 'tab-active' : ''}`} 
            onClick={() => setActiveTab('charts')}
          >
            グラフ
          </a>
          <a 
            className={`tab ${activeTab === 'daily' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            日別サマリー
          </a>
        </div>
      </div>
      
      {activeTab === 'charts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">日別作業時間</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Total Hours" name="合計時間" fill="#3B82F6" />
                  <Bar dataKey="Billable Hours" name="請求可能時間" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">クライアント別作業時間</h2>
            <div className="h-64">
              {projectChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {projectChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}時間`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  データがありません
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <DailySummary timeChartData={timeChartData} />
      )}
    </div>
  );
};

// 日別サマリーコンポーネント
const DailySummary = ({ timeChartData }) => {
  // 日付でソート (timeChartData が配列の場合)
  const sortedData = Array.isArray(timeChartData) 
    ? [...timeChartData].sort((a, b) => {
        // name が日付の場合は日付としてソート、そうでなければそのまま比較
        if (a.name && b.name) {
          // 日付っぽい形式かどうかチェック
          const datePattern = /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/;
          if (datePattern.test(a.name) && datePattern.test(b.name)) {
            return new Date(a.name) - new Date(b.name);
          }
        }
        return 0;
      })
    : [];

  // 先週と今週のデータに分ける
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay()); // 週の初め（日曜日）に設定
  
  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7); // 先週の初め
  
  const thisWeekData = sortedData.filter(entry => {
    try {
      const entryDate = new Date(entry.name);
      return entryDate >= currentWeekStart && entryDate < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    } catch (e) {
      return false;
    }
  });
  
  const lastWeekData = sortedData.filter(entry => {
    try {
      const entryDate = new Date(entry.name);
      return entryDate >= lastWeekStart && entryDate < currentWeekStart;
    } catch (e) {
      return false;
    }
  });

  // データがない場合のサンプルデータ
  const sampleWeekData = [
    { name: "月", "Total Hours": 0, "Billable Hours": 0 },
    { name: "火", "Total Hours": 0, "Billable Hours": 0 },
    { name: "水", "Total Hours": 0, "Billable Hours": 0 },
    { name: "木", "Total Hours": 0, "Billable Hours": 0 },
    { name: "金", "Total Hours": 0, "Billable Hours": 0 },
    { name: "土", "Total Hours": 0, "Billable Hours": 0 },
    { name: "日", "Total Hours": 0, "Billable Hours": 0 }
  ];
  
  // 週ごとの合計時間を計算
  const calculateWeekTotal = (data) => {
    return data.reduce((total, day) => {
      return total + (day["Total Hours"] || 0);
    }, 0);
  };
  
  const thisWeekTotal = calculateWeekTotal(thisWeekData);
  const lastWeekTotal = calculateWeekTotal(lastWeekData);
  
  // 前週比の計算
  let weekOverWeekChange = 0;
  if (lastWeekTotal > 0) {
    weekOverWeekChange = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 今週の合計 */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <h3 className="text-md font-medium mb-2 text-blue-800">今週の合計作業時間</h3>
          <div className="flex justify-between items-end">
            <div className="text-3xl font-bold text-blue-700">{thisWeekTotal.toFixed(1)} <span className="text-sm font-normal">時間</span></div>
            <div className={`text-sm font-medium ${weekOverWeekChange > 0 ? 'text-green-600' : weekOverWeekChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {weekOverWeekChange !== 0 ? (
                <>
                  <span>{weekOverWeekChange > 0 ? '↑' : '↓'} {Math.abs(weekOverWeekChange).toFixed(1)}%</span>
                  <span className="text-gray-500 ml-1">先週比</span>
                </>
              ) : (
                <span className="text-gray-500">先週と同じ</span>
              )}
            </div>
          </div>
        </div>
        
        {/* 週間トレンド */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-md font-medium mb-2 text-gray-700">週間トレンド</h3>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={thisWeekData.length > 0 ? thisWeekData : sampleWeekData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <Area type="monotone" dataKey="Total Hours" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}時間`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* 日別サマリーテーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">曜日</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合計時間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">請求可能時間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生産性</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {thisWeekData.length > 0 ? thisWeekData.map((day, index) => {
              // 曜日の取得
              const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
              const date = new Date(day.name);
              const dayOfWeek = isNaN(date.getTime()) ? day.name : dayNames[date.getDay()];
              
              // 生産性の計算（請求可能時間 / 合計時間）
              const totalHours = day["Total Hours"] || 0;
              const billableHours = day["Billable Hours"] || 0;
              const productivity = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
              
              // 今日かどうかをチェック
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <tr key={index} className={`${isToday ? 'bg-blue-50' : ''} hover:bg-gray-50`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {isNaN(date.getTime()) ? day.name : date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dayOfWeek}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {totalHours.toFixed(1)}時間
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {billableHours.toFixed(1)}時間
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${productivity >= 80 ? 'bg-green-600' : productivity >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, productivity)}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-700">{productivity.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeCharts;