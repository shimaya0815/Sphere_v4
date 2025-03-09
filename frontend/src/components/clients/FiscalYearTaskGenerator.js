import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { HiOutlineClipboardCheck, HiOutlineRefresh } from 'react-icons/hi';
import tasksApi from '../../api/tasks';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const TASK_TYPES = [
  { id: 'closing_preparation', name: '決算準備', days_before: 60 },
  { id: 'financial_statement', name: '財務諸表作成', days_before: 30 },
  { id: 'tax_return', name: '税務申告書作成', days_before: 20 },
  { id: 'director_meeting', name: '役員会開催', days_before: 15 },
  { id: 'shareholder_meeting', name: '株主総会準備', days_before: 10 },
  { id: 'submit_docs', name: '各種書類提出', days_before: 5 }
];

const FiscalYearTaskGenerator = ({ fiscalYear, clientId, clientName, onTasksGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState(
    TASK_TYPES.reduce((acc, task) => ({ ...acc, [task.id]: true }), {})
  );

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      assignToCurrentUser: true
    }
  });

  // タスクのメタデータを取得
  useEffect(() => {
    const fetchTaskMetadata = async () => {
      try {
        const [categoriesData, statusesData, prioritiesData] = await Promise.all([
          tasksApi.getCategories(),
          tasksApi.getStatuses(),
          tasksApi.getPriorities()
        ]);
        setCategories(categoriesData);
        setStatuses(statusesData);
        setPriorities(prioritiesData);
      } catch (error) {
        console.error('Error fetching task metadata:', error);
        toast.error('タスクのメタデータの取得に失敗しました');
      }
    };

    fetchTaskMetadata();
  }, []);

  const handleTaskSelection = (taskId) => {
    setSelectedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const onSubmit = async (data) => {
    // 選択されているタスクがない場合
    const selectedTaskTypes = Object.entries(selectedTasks)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (selectedTaskTypes.length === 0) {
      toast.error('少なくとも1つのタスクタイプを選択してください');
      return;
    }

    setLoading(true);

    try {
      // フィルタリングして選択されたタスクだけを生成
      const selectedTaskData = TASK_TYPES.filter(task => selectedTasks[task.id]);
      
      // 選択されたタスクタイプごとにタスクを作成
      const createdTasks = await Promise.all(
        selectedTaskData.map(async (taskType) => {
          // 決算日から「days_before」日前の日付を計算
          const dueDate = dayjs(fiscalYear.end_date)
            .subtract(taskType.days_before, 'day')
            .format('YYYY-MM-DD');
          
          // リクエストデータを構築
          const taskData = {
            title: `${clientName} - ${taskType.name}（第${fiscalYear.fiscal_period}期）`,
            description: `${clientName}の第${fiscalYear.fiscal_period}期の${taskType.name}タスクです。\n\n期間：${dayjs(fiscalYear.start_date).format('YYYY/MM/DD')} 〜 ${dayjs(fiscalYear.end_date).format('YYYY/MM/DD')}`,
            status: data.status || (Array.isArray(statuses) && statuses.length > 0 ? statuses[0].id : null),
            category: data.category || (Array.isArray(categories) && categories.length > 0 ? categories[0].id : null),
            priority: data.priority || (Array.isArray(priorities) && priorities.length > 0 ? priorities[0].id : null),
            client: clientId,
            due_date: dueDate,
            assigned_user: data.assignToCurrentUser ? null : data.assigned_user, // nullにすると現在のユーザーに割り当て
            fiscal_year_id: fiscalYear.id,
            is_fiscal_task: true
          };
          
          // タスク作成APIを呼び出し
          return await tasksApi.createTask(taskData);
        })
      );
      
      toast.success(`${createdTasks.length}件の決算関連タスクを生成しました`);
      
      if (onTasksGenerated) {
        onTasksGenerated(createdTasks);
      }
    } catch (error) {
      console.error('Error generating fiscal tasks:', error);
      toast.error('タスクの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <HiOutlineClipboardCheck className="mr-2" /> 
          決算関連タスク自動生成
        </h3>
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              第{fiscalYear.fiscal_period}期の決算日（{dayjs(fiscalYear.end_date).format('YYYY年MM月DD日')}）に基づいて
              タスクを自動生成します。
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
              {TASK_TYPES.map(task => (
                <div key={task.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`task-${task.id}`}
                    checked={selectedTasks[task.id]}
                    onChange={() => handleTaskSelection(task.id)}
                    className="checkbox checkbox-sm checkbox-primary mr-2"
                  />
                  <label htmlFor={`task-${task.id}`} className="text-sm">
                    {task.name} (決算{task.days_before}日前)
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* カテゴリー */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリー
              </label>
              <select
                id="category"
                {...register("category")}
                className="select select-bordered w-full"
              >
                {Array.isArray(categories) && categories.length > 0 ? categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                )) : (
                  <option value="">カテゴリーがありません</option>
                )}
              </select>
            </div>
            
            {/* ステータス */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                id="status"
                {...register("status")}
                className="select select-bordered w-full"
              >
                {Array.isArray(statuses) && statuses.length > 0 ? statuses.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                )) : (
                  <option value="">ステータスがありません</option>
                )}
              </select>
            </div>
            
            {/* 優先度 */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                優先度
              </label>
              <select
                id="priority"
                {...register("priority")}
                className="select select-bordered w-full"
              >
                {Array.isArray(priorities) && priorities.length > 0 ? priorities.map(priority => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                )) : (
                  <option value="">優先度がありません</option>
                )}
              </select>
            </div>
          </div>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="assignToCurrentUser"
              {...register("assignToCurrentUser")}
              className="checkbox checkbox-sm mr-2"
            />
            <label htmlFor="assignToCurrentUser" className="text-sm">
              自分にタスクを割り当てる
            </label>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  生成中...
                </>
              ) : (
                <>
                  <HiOutlineClipboardCheck className="mr-2" />
                  タスクを生成
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FiscalYearTaskGenerator;