import React, { useEffect } from 'react';

const TaskTable = ({
  tasks,
  sortConfig,
  onSortChange,
  bulkEditMode,
  selectedTasks,
  onSelectTask,
  onSelectAll,
  onTaskSelect
}) => {
  // デバッグ用：タスクデータの構造を確認
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('タスクデータのサンプル:', tasks[0]);
      console.log('決算期関連のプロパティ:', {
        fiscal_year: tasks[0].fiscal_year,
        fiscal_year_data: tasks[0].fiscal_year_data,
        fiscal_year_name: tasks[0].fiscal_year_name
      });
    }
  }, [tasks]);

  // ステータス名の表示形式を整える
  const getStatusName = (task) => {
    if (!task.status) return '未設定';
    return task.status_data ? task.status_data.name : task.status;
  };

  // ステータスに基づくスタイルを返す
  const getStatusClass = (task) => {
    const statusName = task.status_data?.name || '';
    
    if (statusName.includes('完了')) return 'badge-success';
    if (statusName.includes('作業中') || statusName.includes('進行中')) return 'badge-info';
    if (statusName === 'レビュー中') return 'badge-warning';
    if (statusName.includes('差戻')) return 'badge-error';
    return 'badge-ghost';
  };

  // 優先度の表示形式を整える
  const getPriorityName = (task) => {
    if (!task.priority) return '未設定';
    return task.priority_data ? task.priority_data.priority_value : task.priority;
  };

  // 決算期の表示形式を整える
  const getFiscalYearName = (task) => {
    // デバッグログ
    console.log('決算期データ:', {
      task_id: task.id,
      fiscal_year: task.fiscal_year,
      fiscal_year_data: task.fiscal_year_data,
      fiscal_year_name: task.fiscal_year_name
    });
    
    // 既に整形された名前がある場合はそれを使用
    if (task.fiscal_year_name) {
      // 既に「第X期」の形式になっているか確認
      if (task.fiscal_year_name.includes('第') && task.fiscal_year_name.includes('期')) {
        return task.fiscal_year_name;
      }
      // そうでなければ整形
      return formatFiscalYearDisplay(task.fiscal_year_name);
    }
    
    // fiscal_year_dataオブジェクトがある場合
    if (task.fiscal_year_data && task.fiscal_year_data.name) {
      // 既に「第X期」の形式になっているか確認
      if (task.fiscal_year_data.name.includes('第') && task.fiscal_year_data.name.includes('期')) {
        return task.fiscal_year_data.name;
      }
      // そうでなければ整形
      return formatFiscalYearDisplay(task.fiscal_year_data.name, task.fiscal_year_data.end_date);
    }
    
    // fiscal_yearプロパティがある場合
    if (task.fiscal_year) {
      if (typeof task.fiscal_year === 'object' && task.fiscal_year.name) {
        // オブジェクトの場合
        if (task.fiscal_year.name.includes('第') && task.fiscal_year.name.includes('期')) {
          return task.fiscal_year.name;
        }
        return formatFiscalYearDisplay(task.fiscal_year.name, task.fiscal_year.end_date);
      }
      
      // 数値または文字列の場合
      return formatFiscalYearDisplay(String(task.fiscal_year));
    }
    
    return '-';
  };

  // 決算期の表示形式を整形する補助関数
  const formatFiscalYearDisplay = (fiscalYearValue, endDate) => {
    // 数値または数字のみの文字列かチェック
    const isNumeric = /^\d+$/.test(fiscalYearValue);
    
    if (isNumeric) {
      // 今年の日付をデフォルトの期末日として使用
      const defaultEndDate = endDate || '2024-12-31';
      const formattedEndDate = typeof defaultEndDate === 'string' ? defaultEndDate : defaultEndDate.toISOString().split('T')[0];
      
      // 「第X期(YYYY-MM-DD)」の形式で返す
      return `第${fiscalYearValue}期(${formattedEndDate})`;
    }
    
    // 数値でない場合はそのまま返す
    return fiscalYearValue;
  };

  // 決算期データが存在するかどうかをチェック
  const hasFiscalYearData = (task) => {
    return !!(task.fiscal_year_name || 
              (task.fiscal_year_data && task.fiscal_year_data.name) || 
              task.fiscal_year);
  };

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            {bulkEditMode && (
              <th className="w-12">
                <input 
                  type="checkbox" 
                  className="checkbox" 
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onChange={onSelectAll}
                />
              </th>
            )}
            <th>ステータス</th>
            <th>タイトル</th>
            <th>担当者</th>
            <th onClick={() => onSortChange('due_date')} className="cursor-pointer select-none">
              期限日
              {sortConfig.field === 'due_date' && (
                <span className="ml-1">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => onSortChange('priority')} className="cursor-pointer select-none">
              優先度
              {sortConfig.field === 'priority' && (
                <span className="ml-1">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th>クライアント</th>
            <th>決算期</th>
            <th>カテゴリー</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr 
              key={task.id} 
              className={`hover ${selectedTasks.includes(task.id) ? 'bg-indigo-50' : ''}`}
              onClick={(e) => {
                // 一括編集モードの場合はタスク選択処理
                if (bulkEditMode) {
                  // チェックボックス自体のクリックイベントは親に伝播させない
                  if (!e.target.closest('input[type="checkbox"]')) {
                    onSelectTask(task.id);
                  }
                  return;
                }
                
                // 通常モードの場合は詳細表示処理
                if (!e.target.closest('button')) {
                  onTaskSelect(task);
                }
              }}
            >
              {bulkEditMode && (
                <td onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="checkbox" 
                    checked={selectedTasks.includes(task.id)}
                    onChange={() => onSelectTask(task.id)}
                  />
                </td>
              )}
              <td>
                {task.status && (
                  <span className={`badge ${getStatusClass(task)}`}>
                    {getStatusName(task)}
                  </span>
                )}
              </td>
              <td className="font-medium">
                {task.title}
              </td>
              <td>
                {task.assignee_data?.name || task.assignee_name || (task.assignee?.name || '')}
              </td>
              <td>
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
              </td>
              <td>
                {task.priority && (
                  <span className="badge">
                    {getPriorityName(task)}
                  </span>
                )}
              </td>
              <td>
                {task.client_data?.name || task.client_name || (task.client?.name || '')}
              </td>
              <td>
                {hasFiscalYearData(task) ? (
                  <span className="badge badge-outline badge-secondary">
                    {getFiscalYearName(task)}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td>
                {task.category && (
                  <span className="badge badge-outline badge-primary">
                    {task.category_data?.name || task.category_name || (typeof task.category === 'object' ? task.category.name : task.category)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable; 