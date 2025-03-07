import { useState, useEffect, useCallback } from 'react';
import useSocketIO from './useSocketIO';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const useTaskSocket = (taskId) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const {
    isConnected,
    emit,
    on,
    connect,
    disconnect
  } = useSocketIO({
    autoConnect: Boolean(taskId && currentUser),
    onConnect: () => {
      console.log(`Connected to task socket for task ${taskId}`);
      
      // Join the task room
      if (taskId && currentUser) {
        joinTask();
      }
    },
    onDisconnect: (reason) => {
      console.log(`Disconnected from task socket: ${reason}`);
    },
    onError: (err) => {
      console.error('Task socket error:', err);
    },
    onReconnect: () => {
      console.log(`Reconnected to task socket for task ${taskId}`);
      
      // Rejoin the task room
      if (taskId && currentUser) {
        joinTask();
      }
    }
  });
  
  // Join a task room
  const joinTask = useCallback(() => {
    if (!isConnected || !currentUser || !taskId) return;
    
    console.log(`Joining task ${taskId} via Socket.IO`);
    
    emit('join_task', {
      task_id: taskId,
      user_info: {
        id: currentUser.id,
        name: currentUser.get_full_name ? currentUser.get_full_name() : 'User',
        email: currentUser.email
      }
    }, (response) => {
      console.log('Join task response:', response);
      setLoading(false);
    });
  }, [isConnected, currentUser, taskId, emit]);
  
  // Leave a task room
  const leaveTask = useCallback(() => {
    if (!isConnected || !taskId) return;
    
    console.log(`Leaving task ${taskId} via Socket.IO`);
    
    emit('leave_task', {
      task_id: taskId
    });
  }, [isConnected, taskId, emit]);
  
  // Add a comment to the task
  const addComment = useCallback((content) => {
    if (!isConnected || !taskId || !currentUser) return null;
    
    const tempId = `temp-${Date.now()}`;
    
    // Create temporary comment for immediate display
    const tempComment = {
      id: tempId,
      content,
      task_id: taskId,
      user: {
        id: currentUser.id,
        name: currentUser.get_full_name ? currentUser.get_full_name() : 'User'
      },
      timestamp: new Date().toISOString(),
      is_local: true
    };
    
    // Add to local state
    setComments(prev => [...prev, tempComment]);
    
    // Send via Socket.IO
    emit('task_comment', {
      task_id: taskId,
      content,
      comment_id: tempId
    }, (response) => {
      console.log('Comment sent response:', response);
      
      if (response && response.status === 'success') {
        // Update the local comment to mark it as confirmed
        setComments(prev => 
          prev.map(comment => 
            comment.id === tempId 
              ? { ...comment, is_local: false, comment_id: response.comment_id } 
              : comment
          )
        );
      }
    });
    
    return tempComment;
  }, [isConnected, taskId, currentUser, emit]);
  
  // Update task status
  const updateStatus = useCallback((newStatus, oldStatus) => {
    if (!isConnected || !taskId || !currentUser) return false;
    
    // Send status update via Socket.IO
    emit('task_status_change', {
      task_id: taskId,
      new_status: newStatus,
      old_status: oldStatus
    }, (response) => {
      console.log('Status update response:', response);
      
      if (response && response.status === 'success') {
        // Add to status updates
        const statusUpdate = {
          type: 'status_changed',
          task_id: taskId,
          old_status: oldStatus,
          new_status: newStatus,
          user: {
            id: currentUser.id,
            name: currentUser.get_full_name ? currentUser.get_full_name() : 'User'
          },
          timestamp: new Date().toISOString()
        };
        
        setStatusUpdates(prev => [...prev, statusUpdate]);
        return true;
      }
      
      return false;
    });
    
    return true;
  }, [isConnected, taskId, currentUser, emit]);
  
  // Set up event listeners for task updates
  useEffect(() => {
    if (!isConnected || !taskId) return;
    
    // Handle task joined confirmation
    const unsubscribeTaskJoined = on('task_joined', (data) => {
      console.log('Task joined confirmation:', data);
      setActiveUsers(data.active_users || 0);
      setLoading(false);
    });
    
    // Handle task updates (comments, status changes, etc.)
    const unsubscribeTaskUpdate = on('task_update', (data) => {
      console.log('Task update received:', data);
      
      if (data.type === 'comment_added') {
        // Handle new comment
        setComments(prev => {
          // Check if we already have this comment (avoid duplicates)
          const exists = prev.some(comment => 
            comment.id === data.comment_id || 
            comment.comment_id === data.comment_id
          );
          
          if (exists) return prev;
          
          // Add the new comment
          return [...prev, {
            id: data.comment_id,
            content: data.content,
            task_id: data.task_id,
            user: data.user,
            timestamp: data.timestamp
          }];
        });
        
        // Show notification if comment is from someone else
        if (data.user && data.user.id !== currentUser?.id) {
          toast.success(`${data.user.name || 'Someone'} commented on this task`);
        }
      } else if (data.type === 'status_changed') {
        // Handle status change
        setStatusUpdates(prev => [...prev, data]);
        
        // Show notification if status change is from someone else
        if (data.user && data.user.id !== currentUser?.id) {
          toast(`${data.user.name || 'Someone'} changed the status to ${data.new_status}`, {
            icon: '🔄'
          });
        }
      }
    });
    
    // Clean up event listeners
    return () => {
      unsubscribeTaskJoined();
      unsubscribeTaskUpdate();
    };
  }, [isConnected, taskId, currentUser, on]);
  
  // Join task on mount and leave on unmount
  useEffect(() => {
    if (taskId && currentUser && isConnected) {
      joinTask();
    }
    
    return () => {
      if (taskId && isConnected) {
        leaveTask();
      }
    };
  }, [taskId, currentUser, isConnected, joinTask, leaveTask]);
  
  return {
    isConnected,
    comments,
    statusUpdates,
    activeUsers,
    loading,
    addComment,
    updateStatus,
    connect,
    disconnect
  };
};

export default useTaskSocket;