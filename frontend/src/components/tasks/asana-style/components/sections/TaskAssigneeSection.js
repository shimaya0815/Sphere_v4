import React, { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { HiUser, HiUserGroup } from 'react-icons/hi';
import CurrentAssignee from '../CurrentAssignee';
import toast from 'react-hot-toast';

/**
 * タスクの担当者を表示・編集するコンポーネント
 */
const TaskAssigneeSection = ({ 
  task, 
  users = [], 
  control, 
  handleFieldChange,
  formState = {},
  watch = () => null
}) => {
  const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md";

  // 現在の担当者
  const currentWorker = watch('worker');
  const currentReviewer = watch('reviewer');
  const currentApprover = watch('approver');
  
  // ユーザーリストのデバッグ
  useEffect(() => {
    console.log('TaskAssigneeSection: users prop received:', users);
    console.log('TaskAssigneeSection: users array length:', Array.isArray(users) ? users.length : 'not an array');
  }, [users]);
  
  // ユーザーが存在しない場合のフォールバック
  const normalizedUsers = Array.isArray(users) && users.length > 0 
    ? users 
    : [{ id: 1, first_name: 'サンプル', last_name: 'ユーザー' }];

  // ユーザーのフルネームを取得する関数
  const getUserFullName = (user) => {
    if (!user) return '';
    
    // 優先順位：
    // 1. first_name + last_name
    // 2. full_name プロパティ
    // 3. name プロパティ
    // 4. username
    // 5. email
    // 6. 'ユーザー ' + id
    
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    
    if (user.full_name) return user.full_name;
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) return user.email;
    
    return `ユーザー ${user.id}`;
  };
  
  return (
    <div>
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-md font-medium text-gray-700 mb-2">担当者</h3>
        
        {/* 現在の担当者表示 (編集時のみ) */}
        {task && formState && !formState.isDirty && (
          <div className="flex items-start space-x-4 mb-4">
            <CurrentAssignee 
              label="作業者"
              assigneeId={task.worker}
              users={normalizedUsers}
              icon={<HiUser className="h-5 w-5 text-gray-400" />}
            />
            
            <CurrentAssignee 
              label="レビュアー"
              assigneeId={task.reviewer}
              users={normalizedUsers}
              icon={<HiUserGroup className="h-5 w-5 text-gray-400" />}
            />
            
            <CurrentAssignee 
              label="承認者"
              assigneeId={task.approver}
              users={normalizedUsers}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>}
            />
          </div>
        )}
        
        {/* 担当者選択 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 作業担当者 */}
          <div>
            <label htmlFor="worker" className="block text-sm font-medium text-gray-700">
              <HiUser className="inline-block mr-1 -mt-1" />
              作業者
            </label>
            <div className="mt-1">
              <Controller
                name="worker"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <select
                    id="worker"
                    className={selectClassName}
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      field.onChange(e);
                      // 「担当者なし」を選択した場合は明示的にnullを送信
                      handleFieldChange('worker', e.target.value === '' ? null : e.target.value);
                    }}
                  >
                    <option value="">担当者なし</option>
                    {normalizedUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserFullName(user)}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
          
          {/* レビュー担当者 */}
          <div>
            <label htmlFor="reviewer" className="block text-sm font-medium text-gray-700">
              <HiUserGroup className="inline-block mr-1 -mt-1" />
              レビュアー
            </label>
            <div className="mt-1">
              <Controller
                name="reviewer"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <select
                    id="reviewer"
                    className={selectClassName}
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      field.onChange(e);
                      // 「担当者なし」を選択した場合は明示的にnullを送信
                      handleFieldChange('reviewer', e.target.value === '' ? null : e.target.value);
                    }}
                  >
                    <option value="">担当者なし</option>
                    {normalizedUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserFullName(user)}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
        </div>
        
        {/* 承認者 */}
        <div className="mt-4">
          <label htmlFor="approver" className="block text-sm font-medium text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block mr-1 -mt-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            承認者
          </label>
          <div className="mt-1">
            <Controller
              name="approver"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <select
                  id="approver"
                  className={selectClassName}
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e);
                    // 「担当者なし」を選択した場合は明示的にnullを送信
                    handleFieldChange('approver', e.target.value === '' ? null : e.target.value);
                  }}
                >
                  <option value="">担当者なし</option>
                  {normalizedUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserFullName(user)}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskAssigneeSection;