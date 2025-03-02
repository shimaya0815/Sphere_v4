import React, { useState } from 'react';

const TasksPage = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Update client documentation', dueDate: '2023-10-25', status: 'In Progress', priority: 'High', assignee: 'John Doe' },
    { id: 2, title: 'Prepare quarterly report', dueDate: '2023-10-30', status: 'Not Started', priority: 'Medium', assignee: 'Jane Smith' },
    { id: 3, title: 'Review website designs', dueDate: '2023-10-22', status: 'In Review', priority: 'Low', assignee: 'John Doe' },
    { id: 4, title: 'Client meeting preparation', dueDate: '2023-10-21', status: 'Completed', priority: 'High', assignee: 'Jane Smith' },
  ]);

  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = tasks.filter(task => {
    return (
      (statusFilter === 'All' || task.status === statusFilter) &&
      (priorityFilter === 'All' || task.priority === priorityFilter) &&
      task.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button className="btn btn-primary">
          <span className="mr-2">+</span> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="select select-bordered w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            className="select select-bordered w-full"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select className="select select-bordered w-full">
            <option>Due Date (Ascending)</option>
            <option>Due Date (Descending)</option>
            <option>Priority (High-Low)</option>
            <option>Priority (Low-High)</option>
          </select>
        </div>
      </div>

      {/* Task Board */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{task.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-medium">
                      {task.assignee.split(' ').map(name => name[0]).join('')}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{task.assignee}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredTasks.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No tasks found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;