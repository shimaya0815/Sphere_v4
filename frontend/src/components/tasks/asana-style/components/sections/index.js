/**
 * タスクエディターのセクションコンポーネント
 */
import React from 'react';
import { Controller } from 'react-hook-form';

// 共通のフォームスタイル
const inputClassName = "mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";
const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md";
const textareaClassName = "mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";

// 空のセクションコンポーネント（開発中のセクション用）
const EmptySection = ({ title, children }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    {title && <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>}
    {children || <div className="task-section-placeholder text-gray-500 italic">セクションは現在開発中です</div>}
  </div>
);

// セクションコンポーネント
export const TaskEditorHeader = ({ children }) => (
  <div className="task-editor-header">
    {children}
  </div>
);

export const TaskEditorFooter = ({ children }) => (
  <div className="task-editor-footer">
    {children}
  </div>
);

export const TaskBasicInfoSection = ({ task, control, statuses = [], categories = [], clients = [], fiscalYears = [], workspaces = [], handleFieldChange, watch }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">基本情報</h3>
    
    {task?.id && (
      <div className="mb-2 text-sm text-gray-500">
        タスクID: {task.id}
      </div>
    )}
    
    <div className="mb-4">
      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
        タイトル
      </label>
      {control ? (
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <input
              type="text"
              id="title"
              className={inputClassName}
              placeholder="タスクのタイトルを入力"
              {...field}
              onChange={(e) => {
                field.onChange(e);
                if (handleFieldChange) {
                  setTimeout(() => handleFieldChange('title', e.target.value), 100);
                }
              }}
            />
          )}
        />
      ) : (
        <input 
          type="text" 
          className={inputClassName} 
          defaultValue={task?.title || ''} 
          placeholder="タスクのタイトルを入力"
        />
      )}
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          ステータス
        </label>
        {control ? (
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <select
                id="status"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('status', e.target.value), 100);
                  }
                }}
              >
                <option value="">選択してください</option>
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            )}
          />
        ) : (
          <select className={selectClassName} defaultValue={task?.status || ''}>
            <option value="">選択してください</option>
            {statuses.map(status => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          カテゴリー
        </label>
        {control ? (
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <select
                id="category"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('category', e.target.value), 100);
                  }
                }}
              >
                <option value="">選択してください</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          />
        ) : (
          <select className={selectClassName} defaultValue={task?.category || ''}>
            <option value="">選択してください</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label htmlFor="workspace" className="block text-sm font-medium text-gray-700 mb-1">
          ワークスペース
        </label>
        {control ? (
          <Controller
            name="workspace"
            control={control}
            render={({ field }) => {
              // デフォルトでデフォルトワークスペースを選択
              if (workspaces.length > 0) {
                const defaultWorkspace = workspaces.find(w => w.name === 'デフォルトワークスペース') || workspaces[0];
                if (!field.value) {
                  // フィールド値が未設定の場合、即時デフォルト値を設定
                  field.onChange(defaultWorkspace.id);
                  if (handleFieldChange) {
                    handleFieldChange('workspace', defaultWorkspace.id);
                  }
                }
              }
              
              return (
                <select
                  id="workspace"
                  className={selectClassName}
                  {...field}
                  disabled={workspaces.length <= 1} // ワークスペースが1つしかない場合は無効化
                  onChange={(e) => {
                    field.onChange(e);
                    if (handleFieldChange) {
                      setTimeout(() => handleFieldChange('workspace', e.target.value), 100);
                    }
                  }}
                >
                  {workspaces.map(workspace => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              );
            }}
          />
        ) : (
          <select className={selectClassName} defaultValue={task?.workspace || (workspaces.length > 0 ? workspaces[0].id : '')} disabled={workspaces.length <= 1}>
            {workspaces.map(workspace => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div>
        <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-1">
          見積時間（時間）
        </label>
        {control ? (
          <Controller
            name="estimated_hours"
            control={control}
            render={({ field }) => (
              <input
                type="number"
                id="estimated_hours"
                step="0.5"
                min="0"
                className={inputClassName}
                placeholder="例: 2.5"
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('estimated_hours', e.target.value), 100);
                  }
                }}
              />
            )}
          />
        ) : (
          <input 
            type="number" 
            step="0.5"
            min="0"
            className={inputClassName} 
            defaultValue={task?.estimated_hours || ''} 
            placeholder="例: 2.5"
          />
        )}
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
          クライアント
        </label>
        {control ? (
          <Controller
            name="client"
            control={control}
            render={({ field }) => (
              <select
                id="client"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('client', e.target.value), 100);
                  }
                }}
              >
                <option value="">選択してください</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          />
        ) : (
          <select className={selectClassName} defaultValue={task?.client || ''}>
            <option value="">選択してください</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      {/* 選択されたクライアントがある場合のみ決算期を表示 */}
      {watch && watch('client') && (
        <div>
          <label htmlFor="fiscal_year" className="block text-sm font-medium text-gray-700 mb-1">
            決算期
          </label>
          {control ? (
            <Controller
              name="fiscal_year"
              control={control}
              render={({ field }) => (
                <select
                  id="fiscal_year"
                  className={selectClassName}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (handleFieldChange) {
                      setTimeout(() => handleFieldChange('fiscal_year', e.target.value), 100);
                    }
                  }}
                >
                  <option value="">選択してください</option>
                  {fiscalYears
                    .filter(fy => !watch('client') || fy.client == watch('client'))
                    .map(fiscalYear => (
                      <option key={fiscalYear.id} value={fiscalYear.id}>
                        {fiscalYear.year}
                      </option>
                    ))}
                </select>
              )}
            />
          ) : (
            <select className={selectClassName} defaultValue={task?.fiscal_year || ''}>
              <option value="">選択してください</option>
              {fiscalYears.map(fiscalYear => (
                <option key={fiscalYear.id} value={fiscalYear.id}>
                  {fiscalYear.year}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  </div>
);

export const TaskAssigneeSection = ({ assignee, control, users = [], handleFieldChange }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">担当者</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
      <div>
        <label htmlFor="worker" className="block text-sm font-medium text-gray-700 mb-1">
          作業担当者
        </label>
        {control ? (
          <Controller
            name="worker"
            control={control}
            render={({ field }) => (
              <select
                id="worker"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('worker', e.target.value), 100);
                  }
                }}
              >
                <option value="">選択してください</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            )}
          />
        ) : (
          <select className={selectClassName} defaultValue={assignee?.id || ''}>
            <option value="">選択してください</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="reviewer" className="block text-sm font-medium text-gray-700 mb-1">
          レビュー担当者
        </label>
        {control ? (
          <Controller
            name="reviewer"
            control={control}
            render={({ field }) => (
              <select
                id="reviewer"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('reviewer', e.target.value), 100);
                  }
                }}
              >
                <option value="">選択してください</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            )}
          />
        ) : (
          <select className={selectClassName} defaultValue={''}>
            <option value="">選択してください</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div>
        <label htmlFor="approver" className="block text-sm font-medium text-gray-700 mb-1">
          承認者
        </label>
        {control ? (
          <Controller
            name="approver"
            control={control}
            render={({ field }) => (
              <select
                id="approver"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('approver', e.target.value), 100);
                  }
                }}
              >
                <option value="">選択してください</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            )}
          />
        ) : (
          <select className={selectClassName} defaultValue={''}>
            <option value="">選択してください</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  </div>
);

export const TaskDatePrioritySection = ({ dueDate, priority, priorities = [], control, handleFieldChange }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">期限・日程</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
          期限日
        </label>
        {control ? (
          <Controller
            name="due_date"
            control={control}
            render={({ field }) => (
              <input
                type="date"
                id="due_date"
                className={inputClassName}
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('due_date', e.target.value), 100);
                  }
                }}
              />
            )}
          />
        ) : (
          <input 
            type="date" 
            className={inputClassName} 
            defaultValue={dueDate || ''} 
          />
        )}
      </div>
      
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
          優先度
        </label>
        {control ? (
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <select
                id="priority"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('priority', e.target.value), 100);
                  }
                }}
              >
                <option value="">選択してください</option>
                {priorities.length > 0 ? (
                  priorities.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.priority_value ? `${p.priority_value}` : '未設定'}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </>
                )}
              </select>
            )}
          />
        ) : (
          <select className={selectClassName} defaultValue={priority || ''}>
            <option value="">選択してください</option>
            {priorities.length > 0 ? (
              priorities.map(p => (
                <option key={p.id} value={p.id}>
                  {p.priority_value ? `${p.priority_value}` : '未設定'}
                </option>
              ))
            ) : (
              <>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </>
            )}
          </select>
        )}
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
          開始日
        </label>
        {control ? (
          <Controller
            name="start_date"
            control={control}
            render={({ field }) => (
              <input
                type="date"
                id="start_date"
                className={inputClassName}
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('start_date', e.target.value), 100);
                  }
                }}
              />
            )}
          />
        ) : (
          <input 
            type="date" 
            className={inputClassName} 
            defaultValue={''} 
          />
        )}
      </div>
      
      <div>
        <label htmlFor="completed_at" className="block text-sm font-medium text-gray-700 mb-1">
          完了日
        </label>
        {control ? (
          <Controller
            name="completed_at"
            control={control}
            render={({ field }) => (
              <input
                type="date"
                id="completed_at"
                className={inputClassName}
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('completed_at', e.target.value), 100);
                  }
                }}
              />
            )}
          />
        ) : (
          <input 
            type="date" 
            className={inputClassName} 
            defaultValue={''} 
          />
        )}
      </div>
    </div>
  </div>
);

export const TaskDescriptionSection = ({ description, control, handleFieldChange }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">詳細</h3>
    
    {control ? (
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <textarea
            className={textareaClassName}
            rows={5}
            placeholder="タスクの詳細を入力してください..."
            {...field}
            onChange={(e) => {
              field.onChange(e);
              if (handleFieldChange) {
                setTimeout(() => handleFieldChange('description', e.target.value), 100);
              }
            }}
          />
        )}
      />
    ) : (
      <textarea 
        className={textareaClassName} 
        rows={5} 
        defaultValue={description || ''} 
        placeholder="タスクの詳細を入力してください..."
      />
    )}
  </div>
);

export const TaskMetaInfoSection = ({ createdAt, updatedAt }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">メタ情報</h3>
    
    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
      <div>
        <span className="font-medium">作成日時:</span> {createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}
      </div>
      <div>
        <span className="font-medium">更新日時:</span> {updatedAt ? new Date(updatedAt).toLocaleString() : 'N/A'}
      </div>
    </div>
  </div>
);

export const TaskAdditionalSettingsSection = ({ control, handleFieldChange, watch }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">追加設定</h3>
    
    <div className="mb-4">
      <div className="flex items-center">
        {control ? (
          <Controller
            name="is_template"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                id="is_template"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={field.value === 'true' || field.value === true}
                onChange={(e) => {
                  const value = e.target.checked ? 'true' : 'false';
                  field.onChange(value);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('is_template', value), 100);
                  }
                }}
              />
            )}
          />
        ) : (
          <input 
            type="checkbox" 
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
          />
        )}
        <label htmlFor="is_template" className="ml-2 block text-sm text-gray-700">
          このタスクをテンプレートとして保存
        </label>
      </div>
    </div>
    
    {/* テンプレート名（テンプレートとして設定された場合のみ表示） */}
    {control && watch && (watch('is_template') === 'true' || watch('is_template') === true) && (
      <div className="mb-4 ml-6">
        <label htmlFor="template_name" className="block text-sm font-medium text-gray-700 mb-1">
          テンプレート名
        </label>
        <Controller
          name="template_name"
          control={control}
          render={({ field }) => (
            <input
              type="text"
              id="template_name"
              className={inputClassName}
              placeholder="テンプレート名を入力"
              {...field}
              onChange={(e) => {
                field.onChange(e);
                if (handleFieldChange) {
                  setTimeout(() => handleFieldChange('template_name', e.target.value), 100);
                }
              }}
            />
          )}
        />
      </div>
    )}
  </div>
);

export const TaskRecurrenceSection = ({ control, handleFieldChange, watch }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">繰り返し設定</h3>
    
    <div className="mb-4">
      <div className="flex items-center">
        {control ? (
          <Controller
            name="is_recurring"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                id="is_recurring"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={field.value === 'true' || field.value === true}
                onChange={(e) => {
                  const value = e.target.checked ? 'true' : 'false';
                  field.onChange(value);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('is_recurring', value), 100);
                  }
                }}
              />
            )}
          />
        ) : (
          <input 
            type="checkbox" 
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
          />
        )}
        <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700">
          このタスクを繰り返し設定する
        </label>
      </div>
    </div>
    
    {/* 繰り返し設定（繰り返しとして設定された場合のみ表示） */}
    {control && watch && (watch('is_recurring') === 'true' || watch('is_recurring') === true) && (
      <div className="ml-6 space-y-4">
        <div>
          <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-gray-700 mb-1">
            繰り返しパターン
          </label>
          <Controller
            name="recurrence_pattern"
            control={control}
            render={({ field }) => (
              <select
                id="recurrence_pattern"
                className={selectClassName}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('recurrence_pattern', e.target.value), 100);
                  }
                }}
              >
                <option value="">選択してください</option>
                <option value="daily">毎日</option>
                <option value="weekly">毎週</option>
                <option value="monthly">毎月</option>
                <option value="yearly">毎年</option>
              </select>
            )}
          />
        </div>
        
        {/* 週次の場合の曜日設定 */}
        {watch('recurrence_pattern') === 'weekly' && (
          <div>
            <label htmlFor="weekday" className="block text-sm font-medium text-gray-700 mb-1">
              曜日を選択
            </label>
            <Controller
              name="weekday"
              control={control}
              render={({ field }) => (
                <select
                  id="weekday"
                  className={selectClassName}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (handleFieldChange) {
                      setTimeout(() => handleFieldChange('weekday', e.target.value), 100);
                    }
                  }}
                >
                  <option value="">選択してください</option>
                  <option value="0">月曜日</option>
                  <option value="1">火曜日</option>
                  <option value="2">水曜日</option>
                  <option value="3">木曜日</option>
                  <option value="4">金曜日</option>
                  <option value="5">土曜日</option>
                  <option value="6">日曜日</option>
                </select>
              )}
            />
            
            <div className="mt-2">
              <label htmlFor="weekdays" className="block text-sm font-medium text-gray-700 mb-1">
                複数曜日（カンマ区切り: 例 "0,2,4" = 月,水,金）
              </label>
              <Controller
                name="weekdays"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    id="weekdays"
                    className={inputClassName}
                    placeholder="例: 0,2,4"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (handleFieldChange) {
                        setTimeout(() => handleFieldChange('weekdays', e.target.value), 100);
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>
        )}
        
        {/* 月次の場合の日付設定 */}
        {watch('recurrence_pattern') === 'monthly' && (
          <div>
            <label htmlFor="monthday" className="block text-sm font-medium text-gray-700 mb-1">
              毎月の日付（1-31）
            </label>
            <Controller
              name="monthday"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  id="monthday"
                  min="1"
                  max="31"
                  className={inputClassName}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (handleFieldChange) {
                      setTimeout(() => handleFieldChange('monthday', e.target.value), 100);
                    }
                  }}
                />
              )}
            />
            
            <div className="mt-2">
              <label htmlFor="business_day" className="block text-sm font-medium text-gray-700 mb-1">
                営業日指定（月初から何営業日目か）
              </label>
              <Controller
                name="business_day"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    id="business_day"
                    min="1"
                    className={inputClassName}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (handleFieldChange) {
                        setTimeout(() => handleFieldChange('business_day', e.target.value), 100);
                      }
                    }}
                  />
                )}
              />
            </div>
            
            <div className="mt-2 flex items-center">
              <Controller
                name="consider_holidays"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="consider_holidays"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={field.value === 'true' || field.value === true}
                    onChange={(e) => {
                      const value = e.target.checked ? 'true' : 'false';
                      field.onChange(value);
                      if (handleFieldChange) {
                        setTimeout(() => handleFieldChange('consider_holidays', value), 100);
                      }
                    }}
                  />
                )}
              />
              <label htmlFor="consider_holidays" className="ml-2 block text-sm text-gray-700">
                祝日を考慮する
              </label>
            </div>
          </div>
        )}
        
        <div>
          <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700 mb-1">
            繰り返し終了日
          </label>
          <Controller
            name="recurrence_end_date"
            control={control}
            render={({ field }) => (
              <input
                type="date"
                id="recurrence_end_date"
                className={inputClassName}
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e);
                  if (handleFieldChange) {
                    setTimeout(() => handleFieldChange('recurrence_end_date', e.target.value), 100);
                  }
                }}
              />
            )}
          />
        </div>
      </div>
    )}
  </div>
);