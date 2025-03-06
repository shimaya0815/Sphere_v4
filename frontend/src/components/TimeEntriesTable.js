import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';

const TimeEntriesTable = ({ entries, onDelete, onEdit, loading, availableTasks = [], availableClients = [] }) => {
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({
    description: '',
    client_id: '',
    task_id: '',
    start_time: '',
    end_time: '',
    duration_seconds: 0
  });
  
  // Format duration in seconds to hours and minutes
  const formatDurationHM = (seconds) => {
    if (!seconds) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  };
  
  // Format duration for input field (HH:MM)
  const formatDurationForInput = (seconds) => {
    if (!seconds) return '00:00';
    
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };
  
  // Parse duration input (HH:MM) to seconds
  const parseDurationToSeconds = (duration) => {
    if (!duration) return 0;
    
    const [hours, minutes] = duration.split(':').map(Number);
    return (hours * 3600) + (minutes * 60);
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
  
  // Format ISO datetime for input fields
  const formatDateTimeForInput = (isoDateTime) => {
    if (!isoDateTime) return '';
    return format(parseISO(isoDateTime), "yyyy-MM-dd'T'HH:mm");
  };
  
  // Start editing an entry
  const handleEditClick = (entry) => {
    setEditingEntry(entry.id);
    setEditForm({
      description: entry.description || '',
      client_id: entry.client ? entry.client.id.toString() : '',
      task_id: entry.task ? entry.task.id.toString() : '',
      start_time: formatDateTimeForInput(entry.start_time),
      end_time: entry.end_time ? formatDateTimeForInput(entry.end_time) : '',
      duration_seconds: entry.duration_seconds || 0
    });
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({
      description: '',
      client_id: '',
      task_id: '',
      start_time: '',
      end_time: '',
      duration_seconds: 0
    });
  };
  
  // Save edited entry
  const handleSaveEdit = () => {
    if (onEdit && editingEntry) {
      onEdit(editingEntry, {
        ...editForm,
        client_id: editForm.client_id ? parseInt(editForm.client_id, 10) : null,
        task_id: editForm.task_id ? parseInt(editForm.task_id, 10) : null,
      });
      handleCancelEdit();
    }
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update duration when start or end time changes
    if (name === 'start_time' || name === 'end_time') {
      if (editForm.start_time && editForm.end_time) {
        const start = new Date(editForm.start_time);
        const end = new Date(editForm.end_time);
        const diff = (end - start) / 1000; // difference in seconds
        
        if (diff > 0) {
          setEditForm(prev => ({
            ...prev,
            duration_seconds: diff
          }));
        }
      }
    }
    
    // Update end time when duration changes
    if (name === 'duration') {
      const durationSeconds = parseDurationToSeconds(value);
      if (editForm.start_time && durationSeconds > 0) {
        const start = new Date(editForm.start_time);
        const end = new Date(start.getTime() + (durationSeconds * 1000));
        
        setEditForm(prev => ({
          ...prev,
          end_time: formatDateTimeForInput(end.toISOString()),
          duration_seconds: durationSeconds
        }));
      }
    }
  };

  return (
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
          {entries.length > 0 ? (
            entries.map(entry => (
              <tr key={entry.id} className={`hover:bg-gray-50 ${editingEntry === entry.id ? 'bg-blue-50' : ''}`}>
                {editingEntry === entry.id ? (
                  // Edit mode
                  <>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <input 
                        type="datetime-local"
                        name="start_time"
                        value={editForm.start_time}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      />
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <select
                        name="client_id"
                        value={editForm.client_id}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      >
                        <option value="">- 選択なし -</option>
                        {availableClients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <select
                        name="task_id"
                        value={editForm.task_id}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      >
                        <option value="">- 選択なし -</option>
                        {availableTasks.map(task => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <input 
                        type="text"
                        name="description"
                        value={editForm.description}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        placeholder="作業内容"
                      />
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <input 
                        type="datetime-local"
                        name="end_time"
                        value={editForm.end_time}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      />
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <input 
                        type="time"
                        name="duration"
                        value={formatDurationForInput(editForm.duration_seconds)}
                        onChange={handleInputChange}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      />
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          onClick={handleSaveEdit}
                        >
                          保存
                        </button>
                        <button 
                          className="text-gray-500 hover:text-gray-700"
                          onClick={handleCancelEdit}
                        >
                          キャンセル
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
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
                      <div className="flex justify-end space-x-2">
                        {!entry.is_running && (
                          <>
                            <button 
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => handleEditClick(entry)}
                              disabled={loading}
                            >
                              編集
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-800"
                              onClick={() => onDelete(entry.id)}
                              disabled={loading}
                            >
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                検索条件に一致する作業時間データがありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TimeEntriesTable;