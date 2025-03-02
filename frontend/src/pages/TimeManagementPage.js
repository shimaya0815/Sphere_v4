import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TimeManagementPage = () => {
  const [dateRange, setDateRange] = useState('week');
  const [userFilter, setUserFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  
  // Mock data for charts
  const weeklyData = [
    { name: 'Monday', hours: 7.5 },
    { name: 'Tuesday', hours: 8.2 },
    { name: 'Wednesday', hours: 6.8 },
    { name: 'Thursday', hours: 7.9 },
    { name: 'Friday', hours: 5.5 },
    { name: 'Saturday', hours: 2.0 },
    { name: 'Sunday', hours: 0 },
  ];
  
  const projectData = [
    { name: 'Project Alpha', value: 25 },
    { name: 'Project Beta', value: 15 },
    { name: 'Client Meetings', value: 10 },
    { name: 'Documentation', value: 8 },
    { name: 'Admin', value: 7 },
  ];
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF'];
  
  const timeEntries = [
    { id: 1, date: '2023-10-15', project: 'Project Alpha', task: 'Frontend Development', startTime: '09:00', endTime: '12:30', duration: '3h 30m', user: 'John Doe' },
    { id: 2, date: '2023-10-15', project: 'Project Beta', task: 'API Integration', startTime: '13:30', endTime: '17:00', duration: '3h 30m', user: 'John Doe' },
    { id: 3, date: '2023-10-14', project: 'Client Meetings', task: 'Weekly Status Call', startTime: '10:00', endTime: '11:00', duration: '1h 00m', user: 'Jane Smith' },
    { id: 4, date: '2023-10-14', project: 'Project Alpha', task: 'Code Review', startTime: '14:00', endTime: '16:00', duration: '2h 00m', user: 'Jane Smith' },
    { id: 5, date: '2023-10-13', project: 'Documentation', task: 'Update User Guide', startTime: '09:00', endTime: '11:30', duration: '2h 30m', user: 'John Doe' },
    { id: 6, date: '2023-10-13', project: 'Project Beta', task: 'Bug Fixes', startTime: '13:00', endTime: '17:00', duration: '4h 00m', user: 'Michael Johnson' },
    { id: 7, date: '2023-10-12', project: 'Admin', task: 'Team Meeting', startTime: '09:00', endTime: '10:00', duration: '1h 00m', user: 'All Team' },
  ];
  
  const users = ['John Doe', 'Jane Smith', 'Michael Johnson', 'Emily Wilson'];
  const projects = ['Project Alpha', 'Project Beta', 'Client Meetings', 'Documentation', 'Admin'];
  
  const filteredEntries = timeEntries.filter(entry => 
    (userFilter === 'all' || entry.user === userFilter) &&
    (projectFilter === 'all' || entry.project === projectFilter)
  );
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Time Management</h1>
      
      {/* Timer Widget */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-lg font-semibold mb-2">Time Tracker</h2>
            <div className="flex items-center space-x-2">
              <select className="select select-bordered max-w-xs">
                <option disabled>Select project</option>
                {projects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="What are you working on?" 
                className="input input-bordered w-full max-w-xs"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-3xl font-mono">00:00:00</div>
            <button className="btn btn-primary">Start Timer</button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select 
              className="select select-bordered w-full"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select 
              className="select select-bordered w-full"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select 
              className="select select-bordered w-full"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Time by Day</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Time by Project</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {projectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Time Entries Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Time Entries</h2>
            <div className="flex space-x-2">
              <button className="btn btn-sm btn-outline">Export CSV</button>
              <button className="btn btn-sm btn-outline">Print Report</button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.project}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.task}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.startTime} - {entry.endTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.duration}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.user}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredEntries.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No time entries found matching your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeManagementPage;