import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, formatDistance, formatDuration, intervalToDuration } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import timeManagementApi from '../api/timeManagement';
import { useToast } from '../hooks/useToast';

const TimeManagementPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [selectedRange, setSelectedRange] = useState('week');
  const [userFilter, setUserFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');
  const [description, setDescription] = useState('');
  const [taskId, setTaskId] = useState('');
  const [clientId, setClientId] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [chartData, setChartData] = useState({
    timeChart: [],
    projectChart: []
  });
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const timerInterval = useRef(null);
  const elapsedInterval = useRef(null);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', '#FF6B6B', '#4ECDC4', '#F7FFF7'];

  // Initial data loading
  useEffect(() => {
    fetchInitialData();
    
    // Cleanup intervals on unmount
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (elapsedInterval.current) clearInterval(elapsedInterval.current);
    };
  }, []);
  
  // Update filtered entries when filters change
  useEffect(() => {
    applyFilters();
  }, [timeEntries, userFilter, clientFilter, taskFilter, selectedRange, customDateRange]);
  
  // Set up timer interval to update current time
  useEffect(() => {
    if (activeTimer) {
      timerInterval.current = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      
      updateElapsedTime();
      elapsedInterval.current = setInterval(updateElapsedTime, 1000);
    } else {
      clearInterval(timerInterval.current);
      clearInterval(elapsedInterval.current);
      setElapsedTime('00:00:00');
    }
    
    return () => {
      clearInterval(timerInterval.current);
      clearInterval(elapsedInterval.current);
    };
  }, [activeTimer]);
  
  const updateElapsedTime = () => {
    if (!activeTimer) return;
    
    const startTime = new Date(activeTimer.start_time);
    const now = new Date();
    
    // If on break, don't update the timer
    if (activeBreak) return;
    
    let duration = intervalToDuration({ start: startTime, end: now });
    
    // Format as HH:MM:SS
    const formatted = [
      String(duration.hours).padStart(2, '0'),
      String(duration.minutes).padStart(2, '0'),
      String(duration.seconds).padStart(2, '0')
    ].join(':');
    
    setElapsedTime(formatted);
  };
  
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch all needed data in parallel
      const [entriesResponse, summaryResponse, tasksResponse, clientsResponse, usersResponse] = await Promise.all([
        timeManagementApi.getTimeEntries(),
        timeManagementApi.getDashboardSummary(),
        fetch('/api/tasks/').then(res => res.json()),
        fetch('/api/clients/').then(res => res.json()),
        fetch('/api/users/').then(res => res.json())
      ]);
      
      setTimeEntries(entriesResponse);
      setSummaryData(summaryResponse);
      setAvailableTasks(tasksResponse);
      setAvailableClients(clientsResponse);
      setUsers(usersResponse);
      
      // Check if there's an active timer
      const activeEntry = entriesResponse.find(entry => entry.is_running);
      setActiveTimer(activeEntry || null);
      
      // If there's an active timer, check if there's an active break
      if (activeEntry) {
        const breaksResponse = await timeManagementApi.getBreaks(activeEntry.id);
        const activeBreakEntry = breaksResponse.find(breakEntry => !breakEntry.end_time);
        setActiveBreak(activeBreakEntry || null);
      }
      
      // Fetch chart data
      await fetchChartData();
      
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showToast('データの取得中にエラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchChartData = async () => {
    try {
      // Get time chart data
      const timeChartResponse = await timeManagementApi.getChartData('time', selectedRange === 'custom' ? 'week' : selectedRange);
      
      // Transform data for time chart
      const timeChartData = timeChartResponse.labels.map((label, index) => {
        const dataObject = { name: label };
        timeChartResponse.datasets.forEach(dataset => {
          dataObject[dataset.label] = dataset.data[index];
        });
        return dataObject;
      });
      
      // Get data for project/client pie chart
      const projectData = [];
      
      if (timeEntries.length > 0) {
        // Group entries by client or task
        const groupedByClient = timeEntries.reduce((acc, entry) => {
          const clientName = entry.client ? entry.client.name : 'No Client';
          
          if (!acc[clientName]) {
            acc[clientName] = { total: 0, entries: [] };
          }
          
          // Only add entries with duration
          if (entry.duration_seconds) {
            acc[clientName].entries.push(entry);
            acc[clientName].total += entry.duration_seconds / 3600; // Convert to hours
          }
          
          return acc;
        }, {});
        
        // Convert to chart data format
        Object.entries(groupedByClient).forEach(([name, data]) => {
          if (data.total > 0) {
            projectData.push({ name, value: data.total });
          }
        });
      }
      
      setChartData({
        timeChart: timeChartData,
        projectChart: projectData
      });
      
    } catch (error) {
      console.error('Error fetching chart data:', error);
      showToast('チャートデータの取得中にエラーが発生しました', 'error');
    }
  };
  
  const applyFilters = () => {
    if (!timeEntries.length) {
      setFilteredEntries([]);
      return;
    }
    
    let filtered = [...timeEntries];
    
    // Apply user filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(entry => entry.user && entry.user.id.toString() === userFilter);
    }
    
    // Apply client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(entry => entry.client && entry.client.id.toString() === clientFilter);
    }
    
    // Apply task filter
    if (taskFilter !== 'all') {
      filtered = filtered.filter(entry => entry.task && entry.task.id.toString() === taskFilter);
    }
    
    // Apply date range filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedRange === 'today') {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate.toDateString() === today.toDateString();
      });
    } else if (selectedRange === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as the first day
      
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= startOfWeek;
      });
    } else if (selectedRange === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= startOfMonth;
      });
    } else if (selectedRange === 'custom' && customDateRange.startDate && customDateRange.endDate) {
      const startDate = new Date(customDateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(customDateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }
    
    // Sort by start time (newest first)
    filtered.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    
    setFilteredEntries(filtered);
  };
  
  const handleStartTimer = async () => {
    try {
      const data = {
        description,
        task_id: taskId || null,
        client_id: clientId || null
      };
      
      const response = await timeManagementApi.startTimeEntry(data);
      setActiveTimer(response);
      setDescription('');
      
      // Refresh entries
      const entriesResponse = await timeManagementApi.getTimeEntries();
      setTimeEntries(entriesResponse);
      
      showToast('タイマーを開始しました', 'success');
    } catch (error) {
      console.error('Error starting timer:', error);
      showToast('タイマーの開始中にエラーが発生しました', 'error');
    }
  };
  
  const handleStopTimer = async () => {
    if (!activeTimer) return;
    
    try {
      // If there's an active break, stop it first
      if (activeBreak) {
        await timeManagementApi.stopBreak(activeBreak.id);
        setActiveBreak(null);
      }
      
      await timeManagementApi.stopTimeEntry(activeTimer.id);
      setActiveTimer(null);
      
      // Refresh entries
      const entriesResponse = await timeManagementApi.getTimeEntries();
      setTimeEntries(entriesResponse);
      
      // Refresh dashboard data
      const summaryResponse = await timeManagementApi.getDashboardSummary();
      setSummaryData(summaryResponse);
      
      showToast('タイマーを停止しました', 'success');
      
      // Update chart data
      await fetchChartData();
    } catch (error) {
      console.error('Error stopping timer:', error);
      showToast('タイマーの停止中にエラーが発生しました', 'error');
    }
  };
  
  const handleStartBreak = async () => {
    if (!activeTimer) return;
    
    try {
      const response = await timeManagementApi.startBreak(activeTimer.id, { reason: '休憩' });
      setActiveBreak(response);
      showToast('休憩を開始しました', 'success');
    } catch (error) {
      console.error('Error starting break:', error);
      showToast('休憩の開始中にエラーが発生しました', 'error');
    }
  };
  
  const handleStopBreak = async () => {
    if (!activeBreak) return;
    
    try {
      await timeManagementApi.stopBreak(activeBreak.id);
      setActiveBreak(null);
      showToast('休憩を終了しました', 'success');
    } catch (error) {
      console.error('Error stopping break:', error);
      showToast('休憩の終了中にエラーが発生しました', 'error');
    }
  };
  
  const handleDeleteTimeEntry = async (entryId) => {
    if (!window.confirm('この時間エントリを削除してもよろしいですか？')) return;
    
    try {
      await timeManagementApi.deleteTimeEntry(entryId);
      
      // Refresh entries
      const entriesResponse = await timeManagementApi.getTimeEntries();
      setTimeEntries(entriesResponse);
      
      // Refresh dashboard data
      const summaryResponse = await timeManagementApi.getDashboardSummary();
      setSummaryData(summaryResponse);
      
      showToast('時間エントリを削除しました', 'success');
      
      // Update chart data
      await fetchChartData();
    } catch (error) {
      console.error('Error deleting time entry:', error);
      showToast('時間エントリの削除中にエラーが発生しました', 'error');
    }
  };
  
  const exportToCsv = async () => {
    try {
      // Create a new report with current filters
      const reportData = {
        name: `時間レポート ${new Date().toISOString().split('T')[0]}`,
        description: '自動生成レポート',
        start_date: selectedRange === 'custom' ? customDateRange.startDate : new Date().toISOString().split('T')[0],
        end_date: selectedRange === 'custom' ? customDateRange.endDate : new Date().toISOString().split('T')[0],
        filters: {
          user_id: userFilter !== 'all' ? userFilter : null,
          client_id: clientFilter !== 'all' ? clientFilter : null,
          task_id: taskFilter !== 'all' ? taskFilter : null
        },
        chart_type: 'bar',
        report_format: selectedRange
      };
      
      const report = await timeManagementApi.generateReport(reportData);
      await timeManagementApi.exportReportToCsv(report.id);
      
      showToast('CSVレポートをエクスポートしました', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast('CSVエクスポート中にエラーが発生しました', 'error');
    }
  };
  
  // Format duration in seconds to hours and minutes
  const formatDurationHM = (seconds) => {
    if (!seconds) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  };
  
  // Format ISO date to readable format
  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    return format(parseISO(isoDate), 'yyyy/MM/dd');
  };
  
  // Format ISO time to readable format
  const formatTime = (isoDateTime) => {
    if (!isoDateTime) return '';
    return format(parseISO(isoDateTime), 'HH:mm');
  };
  
  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-primary mb-4" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">作業時間管理</h1>
      
      {/* Summary Cards */}
      {summaryData && (
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
      )}
      
      {/* Timer Widget */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-lg font-semibold mb-2">タイムトラッカー</h2>
            {!activeTimer ? (
              <div className="flex flex-col md:flex-row gap-3">
                <select 
                  className="select select-bordered max-w-xs"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={activeTimer !== null}
                >
                  <option value="">クライアントを選択</option>
                  {availableClients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                
                <select 
                  className="select select-bordered max-w-xs"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  disabled={activeTimer !== null}
                >
                  <option value="">タスクを選択</option>
                  {availableTasks.map(task => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
                
                <input 
                  type="text" 
                  placeholder="作業内容" 
                  className="input input-bordered w-full max-w-xs"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={activeTimer !== null}
                />
              </div>
            ) : (
              <div className="mb-2">
                <p className="text-lg font-medium">{activeTimer.description || '作業中'}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {activeTimer.client && (
                    <span className="badge badge-primary">{activeTimer.client.name}</span>
                  )}
                  {activeTimer.task && (
                    <span className="badge badge-secondary">{activeTimer.task.title}</span>
                  )}
                  <span className="badge">開始: {formatTime(activeTimer.start_time)}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`text-3xl font-mono ${activeBreak ? 'text-gray-400' : 'text-gray-800'}`}>
              {elapsedTime}
            </div>
            
            {!activeTimer ? (
              <button 
                className="btn btn-primary" 
                onClick={handleStartTimer}
                disabled={loading}
              >
                タイマー開始
              </button>
            ) : (
              <div className="flex gap-2">
                {!activeBreak ? (
                  <button 
                    className="btn btn-warning" 
                    onClick={handleStartBreak}
                    disabled={loading}
                  >
                    休憩
                  </button>
                ) : (
                  <button 
                    className="btn btn-success" 
                    onClick={handleStopBreak}
                    disabled={loading}
                  >
                    休憩終了
                  </button>
                )}
                
                <button 
                  className="btn btn-error" 
                  onClick={handleStopTimer}
                  disabled={loading}
                >
                  停止
                </button>
              </div>
            )}
          </div>
        </div>
        
        {activeBreak && (
          <div className="mt-4 p-3 bg-yellow-100 rounded-md flex justify-between items-center">
            <div>
              <p className="font-medium text-yellow-800">休憩中 - {activeBreak.reason || '休憩'}</p>
              <p className="text-sm text-yellow-700">開始: {formatTime(activeBreak.start_time)}</p>
            </div>
            <button 
              className="btn btn-sm btn-success" 
              onClick={handleStopBreak}
              disabled={loading}
            >
              休憩終了
            </button>
          </div>
        )}
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期間</label>
            <select 
              className="select select-bordered w-full"
              value={selectedRange}
              onChange={(e) => {
                setSelectedRange(e.target.value);
                if (e.target.value === 'custom') {
                  setShowDatePicker(true);
                } else {
                  setShowDatePicker(false);
                }
              }}
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
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">終了日</label>
                  <input 
                    type="date" 
                    className="input input-bordered input-sm w-full" 
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
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
              onChange={(e) => setUserFilter(e.target.value)}
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
              onChange={(e) => setClientFilter(e.target.value)}
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
              onChange={(e) => setTaskFilter(e.target.value)}
            >
              <option value="all">全てのタスク</option>
              {availableTasks.map(task => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">日別作業時間</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.timeChart}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total Hours" fill="#3B82F6" />
                <Bar dataKey="Billable Hours" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">クライアント別作業時間</h2>
          <div className="h-64">
            {chartData.projectChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.projectChart}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.projectChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}h`} />
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
      
      {/* Time Entries Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <h2 className="text-lg font-semibold mb-2 md:mb-0">作業時間一覧</h2>
            <div className="flex space-x-2">
              <button 
                className="btn btn-sm btn-outline"
                onClick={exportToCsv}
                disabled={loading}
              >
                CSV出力
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">クライアント</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タスク</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作業時間</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(entry.start_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.client ? entry.client.name : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.task ? entry.task.title : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {entry.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(entry.start_time)} - {entry.end_time ? formatTime(entry.end_time) : '進行中'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.duration_seconds ? formatDurationHM(entry.duration_seconds) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!entry.is_running && (
                      <button 
                        className="text-red-600 hover:text-red-900 ml-3"
                        onClick={() => handleDeleteTimeEntry(entry.id)}
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredEntries.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              検索条件に一致する作業時間データがありません。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeManagementPage;