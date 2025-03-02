import React from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { currentUser } = useAuth();

  // Placeholder data for the dashboard
  const stats = [
    { id: 1, name: 'Active Tasks', value: '24', color: 'bg-blue-100 text-blue-800' },
    { id: 2, name: 'Completed Tasks', value: '18', color: 'bg-green-100 text-green-800' },
    { id: 3, name: 'Clients', value: '7', color: 'bg-purple-100 text-purple-800' },
    { id: 4, name: 'Hours Tracked', value: '42h', color: 'bg-red-100 text-red-800' },
  ];

  const recentTasks = [
    { id: 1, title: 'Update client documentation', dueDate: '2023-10-25', status: 'In Progress', priority: 'High' },
    { id: 2, title: 'Prepare quarterly report', dueDate: '2023-10-30', status: 'Not Started', priority: 'Medium' },
    { id: 3, title: 'Review website designs', dueDate: '2023-10-22', status: 'In Review', priority: 'Low' },
    { id: 4, title: 'Client meeting preparation', dueDate: '2023-10-21', status: 'Completed', priority: 'High' },
  ];

  const upcomingEvents = [
    { id: 1, title: 'Team Meeting', date: 'Today, 2:00 PM', type: 'meeting' },
    { id: 2, title: 'Project Deadline', date: 'Tomorrow', type: 'deadline' },
    { id: 3, title: 'Client Call', date: 'Oct 24, 10:00 AM', type: 'call' },
    { id: 4, title: 'Quarterly Review', date: 'Oct 31, 9:00 AM', type: 'meeting' },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Welcome Banner */}
      <div className="bg-blue-600 text-white rounded-lg p-6 mb-8 shadow-md">
        <h2 className="text-2xl font-semibold mb-2">Welcome back, {currentUser?.first_name || 'User'}!</h2>
        <p>Here's what's happening with your projects today.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map(stat => (
          <div key={stat.id} className={`rounded-lg shadow p-6 ${stat.color}`}>
            <p className="font-medium">{stat.name}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Recent Tasks</h3>
              <button className="text-blue-600 hover:text-blue-800">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Task</th>
                    <th className="px-6 py-3">Due Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{task.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {task.dueDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'In Review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.priority === 'High' ? 'bg-red-100 text-red-800' : 
                          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Upcoming Events */}
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Upcoming Events</h3>
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`rounded-full p-2 ${
                    event.type === 'meeting' ? 'bg-blue-100 text-blue-600' : 
                    event.type === 'deadline' ? 'bg-red-100 text-red-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {event.type === 'meeting' ? '👥' : 
                     event.type === 'deadline' ? '⏰' : '📞'}
                  </div>
                  <div>
                    <h4 className="font-medium">{event.title}</h4>
                    <p className="text-sm text-gray-600">{event.date}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm">
              View All Events
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;