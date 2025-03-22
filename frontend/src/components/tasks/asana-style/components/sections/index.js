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

export const TaskBasicInfoSection = ({ task, control, statuses = [], categories = [], clients = [], handleFieldChange, watch }) => (
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
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  </div>
);

export const TaskAssigneeSection = ({ assignee, control, users = [], handleFieldChange }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">担当者</h3>
    
    <div>
      <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
        担当者
      </label>
      {control ? (
        <Controller
          name="assignee"
          control={control}
          render={({ field }) => (
            <select
              id="assignee"
              className={selectClassName}
              {...field}
              onChange={(e) => {
                field.onChange(e);
                if (handleFieldChange) {
                  setTimeout(() => handleFieldChange('assignee', e.target.value), 100);
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
);

export const TaskDatePrioritySection = ({ dueDate, priority, control, handleFieldChange }) => (
  <div className="task-section mb-6 bg-white p-4 rounded-lg shadow-sm">
    <h3 className="text-lg font-medium text-gray-900 mb-3">期限・優先度</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            )}
          />
        ) : (
          <select className={selectClassName} defaultValue={priority || 'medium'}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
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

export const TaskAdditionalSettingsSection = () => (
  <EmptySection title="追加設定" />
);

export const TaskRecurrenceSection = () => (
  <EmptySection title="繰り返し設定" />
);