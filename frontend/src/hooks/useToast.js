import { useState, useCallback } from 'react';

// Simple toast hook for displaying notifications
export const useToast = () => {
  const [toast, setToast] = useState(null);

  // Show a toast message with specified type (success, error, info, warning)
  const showToast = useCallback((message, type = 'info') => {
    // If using with a UI library, you could integrate with their toast system
    // For now, just use browser's alert for simplicity
    if (type === 'error') {
      console.error(message);
      alert(`エラー: ${message}`);
    } else if (type === 'success') {
      console.log(message);
      alert(`成功: ${message}`);
    } else {
      console.log(message);
      alert(message);
    }
    
    // Set toast for potential UI display
    setToast({ message, type });
    
    // Auto-clear after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  return { toast, showToast };
};