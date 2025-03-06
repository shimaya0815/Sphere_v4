import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { timeManagementApi, tasksApi, clientsApi, usersApi } from '../api';
import { useToast } from '../hooks/useToast';

// Components
import TimeTracker from '../components/TimeTracker';
import TimeFilters from '../components/TimeFilters';
import TimeCharts from '../components/TimeCharts';
import TimeSummaryCards from '../components/TimeSummaryCards';
import TimeEntriesTable from '../components/TimeEntriesTable';

const TimeManagementPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [selectedRange, setSelectedRange] = useState('week');
  const [userFilter, setUserFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');
  const [summaryData, setSummaryData] = useState(null);
  const [chartData, setChartData] = useState({
    timeChart: [],
    projectChart: []
  });
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', '#FF6B6B', '#4ECDC4', '#F7FFF7'];

  // Initial data loading
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  // Update filtered entries when filters change
  useEffect(() => {
    applyFilters();
  }, [timeEntries, userFilter, clientFilter, taskFilter, selectedRange, customDateRange]);
  
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch all needed data in parallel
      const [entriesResponse, summaryResponse, tasksResponse, clientsResponse, usersResponse] = await Promise.all([
        timeManagementApi.getTimeEntries().catch(err => []),
        timeManagementApi.getDashboardSummary().catch(err => ({
          today: { hours: 0, entry_count: 0 },
          this_week: { hours: 0, entry_count: 0 },
          this_month: { hours: 0, entry_count: 0 },
          has_active_timer: false
        })),
        tasksApi.getTasks().catch(err => []),
        clientsApi.getClients().catch(err => []),
        usersApi.getBusinessUsers().catch(err => [])
      ]);
      
      setTimeEntries(entriesResponse);
      setSummaryData(summaryResponse);
      
      // Format tasks data
      const formattedTasks = Array.isArray(tasksResponse) 
        ? tasksResponse 
        : (tasksResponse?.results || []);
      setAvailableTasks(formattedTasks);
      
      // Format clients data
      const formattedClients = Array.isArray(clientsResponse) 
        ? clientsResponse 
        : (clientsResponse?.results || []);
      setAvailableClients(formattedClients);
      
      // Format users data
      const formattedUsers = Array.isArray(usersResponse) 
        ? usersResponse 
        : (usersResponse?.results || []);
      setUsers(formattedUsers);
      
      // Check if there's an active timer
      const activeEntry = entriesResponse.find(entry => entry.is_running || !entry.end_time);
      setActiveTimer(activeEntry || null);
      
      // If there's an active timer, check if there's an active break
      if (activeEntry) {
        try {
          const breaksResponse = await timeManagementApi.getBreaks(activeEntry.id);
          const activeBreakEntry = Array.isArray(breaksResponse)
            ? breaksResponse.find(breakEntry => !breakEntry.end_time)
            : null;
          setActiveBreak(activeBreakEntry || null);
        } catch (error) {
          console.error('Error fetching breaks:', error);
        }
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
  
  const handleStartTimer = async (data) => {
    try {
      const response = await timeManagementApi.startTimeEntry(data);
      setActiveTimer(response);
      
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
      <TimeSummaryCards summaryData={summaryData} />
      
      {/* Timer Widget */}
      <TimeTracker
        activeTimer={activeTimer}
        activeBreak={activeBreak}
        onStartTimer={handleStartTimer}
        onStopTimer={handleStopTimer}
        onStartBreak={handleStartBreak}
        onStopBreak={handleStopBreak}
        availableTasks={availableTasks}
        availableClients={availableClients}
        loading={loading}
      />
      
      {/* Filters */}
      <TimeFilters
        selectedRange={selectedRange}
        userFilter={userFilter}
        clientFilter={clientFilter}
        taskFilter={taskFilter}
        customDateRange={customDateRange}
        onRangeChange={setSelectedRange}
        onUserFilterChange={setUserFilter}
        onClientFilterChange={setClientFilter}
        onTaskFilterChange={setTaskFilter}
        onCustomDateChange={setCustomDateRange}
        users={users}
        availableClients={availableClients}
        availableTasks={availableTasks}
      />
      
      {/* Charts */}
      <TimeCharts
        timeChartData={chartData.timeChart}
        projectChartData={chartData.projectChart}
        COLORS={COLORS}
      />
      
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
        
        <TimeEntriesTable 
          entries={filteredEntries} 
          onDelete={handleDeleteTimeEntry}
          loading={loading} 
        />
      </div>
    </div>
  );
};

export default TimeManagementPage;