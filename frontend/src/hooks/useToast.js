import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

// Toast hook for displaying notifications using react-hot-toast
export const useToast = () => {
  const [currentToast, setCurrentToast] = useState(null);

  // Show a toast message with specified type (success, error, info, warning)
  const showToast = useCallback((message, type = 'info') => {
    if (type === 'error') {
      console.error(message);
      toast.error(message);
    } else if (type === 'success') {
      console.log(message);
      toast.success(message);
    } else if (type === 'warning') {
      console.warn(message);
      toast(message, {
        icon: '⚠️',
        style: {
          backgroundColor: '#FEFCE8',
          color: '#854D0E',
        },
      });
    } else {
      console.log(message);
      toast(message);
    }
    
    // Set current toast for reference
    const toastId = Date.now();
    setCurrentToast({ id: toastId, message, type });
    
    // Auto-clear reference after 3 seconds
    setTimeout(() => {
      setCurrentToast(prev => prev && prev.id === toastId ? null : prev);
    }, 3000);
  }, []);

  return { toast: currentToast, showToast };
};