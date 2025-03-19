import { useState, useEffect } from 'react';

/**
 * タスクソート用カスタムフック
 * @param {Array} initialTasks - 初期タスク配列
 * @param {Object} initialSortConfig - 初期ソート設定
 * @param {string} initialSecondarySortField - 初期第2ソートフィールド
 * @returns {Object} ソート関連の状態と関数
 */
const useTaskSorting = (
  initialTasks = [],
  initialSortConfig = { field: 'due_date', direction: 'asc' },
  initialSecondarySortField = 'priority'
) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [sortConfig, setSortConfig] = useState(initialSortConfig);
  const [secondarySortField, setSecondarySortField] = useState(initialSecondarySortField);
  
  // 優先度の数値への変換
  const getPriorityValue = (priority) => {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };
  
  // タスクをソートする関数
  const sortTasks = (tasksToSort) => {
    return [...tasksToSort].sort((a, b) => {
      // 第1ソートフィールド
      let comparison = 0;
      
      if (sortConfig.field === 'due_date') {
        // 期限日ソート (null値は最後に)
        const dateA = a.due_date ? new Date(a.due_date) : new Date(8640000000000000);
        const dateB = b.due_date ? new Date(b.due_date) : new Date(8640000000000000);
        comparison = sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortConfig.field === 'priority') {
        // 優先度ソート
        const priorityA = getPriorityValue(a.priority);
        const priorityB = getPriorityValue(b.priority);
        comparison = sortConfig.direction === 'asc' ? priorityB - priorityA : priorityA - priorityB; // 高い優先度が先
      } else {
        // その他のフィールド
        const valA = a[sortConfig.field] || '';
        const valB = b[sortConfig.field] || '';
        comparison = sortConfig.direction === 'asc' ? 
          valA.toString().localeCompare(valB.toString()) : 
          valB.toString().localeCompare(valA.toString());
      }
      
      // 第1ソートが同値の場合は第2ソートを適用
      if (comparison === 0 && secondarySortField) {
        if (secondarySortField === 'priority') {
          const priorityA = getPriorityValue(a.priority);
          const priorityB = getPriorityValue(b.priority);
          return priorityB - priorityA; // 高い優先度が先（昇順）
        } else if (secondarySortField === 'due_date') {
          const dateA = a.due_date ? new Date(a.due_date) : new Date(8640000000000000);
          const dateB = b.due_date ? new Date(b.due_date) : new Date(8640000000000000);
          return dateA - dateB; // 日付昇順
        }
      }
      
      return comparison;
    });
  };
  
  // ソート設定変更ハンドラー
  const handleSortChange = (field) => {
    setSortConfig(prevConfig => {
      if (prevConfig.field === field) {
        // 同じフィールドの場合は昇順/降順を切り替え
        return { field, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        // 別フィールドの場合は新しいフィールドで昇順から
        return { field, direction: 'asc' };
      }
    });
  };
  
  // 外部からタスクが更新された時のハンドラー
  const updateTasks = (newTasks) => {
    setTasks(sortTasks(newTasks));
  };
  
  // ソート設定が変更された時に自動的にタスクを並べ替え
  useEffect(() => {
    setTasks(prevTasks => sortTasks([...prevTasks]));
  }, [sortConfig, secondarySortField]);
  
  return {
    tasks,
    sortConfig,
    secondarySortField,
    setSecondarySortField,
    handleSortChange,
    updateTasks,
    sortTasks
  };
};

export default useTaskSorting; 