import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { HiOutlineCalendar, HiOutlineUser, HiOutlineTag } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useFormContext, Controller } from 'react-hook-form';
// 欠けているUIコンポーネントをインポートせず、代わりにカスタムコンポーネントを使用
// import { Input, TextArea, Select, DatePicker, Checkbox } from '../../../components/ui';
// import { UserSelector, ProjectSelector, TagSelector } from '../../../components/selectors';
import { Loader } from '../../../components/ui'; // Loaderのみインポート
// import RichTextEditor from '../../../components/RichTextEditor';
import StatusSelector from './StatusSelector';
import PrioritySelector from './PrioritySelector';

// 欠けているUIコンポーネントの簡易実装
const Input = forwardRef(({ value, onChange, placeholder, error, ...props }, ref) => (
  <input
    ref={ref}
    value={value || ''}
    onChange={onChange}
    placeholder={placeholder}
    className={`form-input ${error ? 'has-error' : ''}`}
    {...props}
  />
));
Input.displayName = 'Input';

const TextArea = forwardRef(({ value, onChange, placeholder, error, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    value={value || ''}
    onChange={onChange}
    placeholder={placeholder}
    className={`form-textarea ${error ? 'has-error' : ''}`}
    rows={rows}
    {...props}
  />
));
TextArea.displayName = 'TextArea';

const Select = forwardRef(({ value, onChange, options = [], placeholder, error, ...props }, ref) => (
  <select
    ref={ref}
    value={value || ''}
    onChange={onChange}
    className={`form-select ${error ? 'has-error' : ''}`}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
));
Select.displayName = 'Select';

const DatePicker = forwardRef(({ value, onChange, error, ...props }, ref) => (
  <input
    ref={ref}
    type="date"
    value={value || ''}
    onChange={onChange}
    className={`form-datepicker ${error ? 'has-error' : ''}`}
    {...props}
  />
));
DatePicker.displayName = 'DatePicker';

const Checkbox = forwardRef(({ checked, onChange, label, error, ...props }, ref) => (
  <div className={`form-checkbox ${error ? 'has-error' : ''}`}>
    <input
      ref={ref}
      type="checkbox"
      checked={checked || false}
      onChange={onChange}
      {...props}
    />
    {label && <span>{label}</span>}
  </div>
));
Checkbox.displayName = 'Checkbox';

// セレクターコンポーネントの簡易実装
const UserSelector = forwardRef(({ value, onChange, error, ...props }, ref) => (
  <select
    ref={ref}
    value={value || ''}
    onChange={onChange}
    className={`form-select ${error ? 'has-error' : ''}`}
    {...props}
  >
    <option value="">担当者を選択</option>
    <option value="1">ユーザー 1</option>
    <option value="2">ユーザー 2</option>
  </select>
));
UserSelector.displayName = 'UserSelector';

const ProjectSelector = forwardRef(({ value, onChange, error, ...props }, ref) => (
  <select
    ref={ref}
    value={value || ''}
    onChange={onChange}
    className={`form-select ${error ? 'has-error' : ''}`}
    {...props}
  >
    <option value="">プロジェクトを選択</option>
    <option value="1">プロジェクト 1</option>
    <option value="2">プロジェクト 2</option>
  </select>
));
ProjectSelector.displayName = 'ProjectSelector';

const TagSelector = forwardRef(({ value = [], onChange, error, ...props }, ref) => (
  <select
    ref={ref}
    multiple
    value={value}
    onChange={(e) => {
      const options = e.target.options;
      const selectedValues = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selectedValues.push(options[i].value);
        }
      }
      onChange(selectedValues);
    }}
    className={`form-select ${error ? 'has-error' : ''}`}
    {...props}
  >
    <option value="1">タグ 1</option>
    <option value="2">タグ 2</option>
    <option value="3">タグ 3</option>
  </select>
));
TagSelector.displayName = 'TagSelector';

const RichTextEditor = forwardRef(({ value, onChange, ...props }, ref) => (
  <TextArea
    ref={ref}
    value={value}
    onChange={onChange}
    rows={5}
    {...props}
  />
));
RichTextEditor.displayName = 'RichTextEditor';

/**
 * タスクフォームコンポーネント
 * - useFormContextを活用したフォームフィールド
 * - 再利用可能なフィールドコンポーネント
 */
const TaskForm = ({ children }) => {
  return (
    <div className="task-form">
      {children}
    </div>
  );
};

// フィールドコンポーネント
const Field = ({ name, component: Component = Input, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="form-field">
      <Component
        id={name}
        name={name}
        {...props}
        error={errors[name]?.message}
      />
    </div>
  );
};

// リッチテキストフィールドコンポーネント
const RichField = ({ name, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="form-field rich-field">
      <TextArea
        id={name}
        name={name}
        rows={5}
        {...props}
        error={errors[name]?.message}
      />
    </div>
  );
};

// ユーザーフィールドコンポーネント
const UserField = ({ name, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="form-field user-field">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <UserSelector
            id={name}
            {...field}
            {...props}
            error={errors[name]?.message}
          />
        )}
      />
    </div>
  );
};

// 日付フィールドコンポーネント
const DateField = ({ name, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="form-field date-field">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DatePicker
            id={name}
            {...field}
            {...props}
            error={errors[name]?.message}
          />
        )}
      />
    </div>
  );
};

// プロジェクトフィールドコンポーネント
const ProjectField = ({ name, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="form-field project-field">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <ProjectSelector
            id={name}
            {...field}
            {...props}
            error={errors[name]?.message}
          />
        )}
      />
    </div>
  );
};

// タグフィールドコンポーネント
const TagsField = ({ name, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="form-field tags-field">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <TagSelector
            id={name}
            {...field}
            {...props}
            error={errors[name]?.message}
          />
        )}
      />
    </div>
  );
};

// チェックボックスフィールドコンポーネント
const CheckboxField = ({ name, label, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="form-field checkbox-field">
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value, ...field } }) => (
          <Checkbox
            id={name}
            checked={value}
            onChange={onChange}
            label={label}
            {...field}
            {...props}
            error={errors[name]?.message}
          />
        )}
      />
    </div>
  );
};

// 優先度フィールドコンポーネント
const PriorityField = ({ name, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="form-field priority-field">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            id={name}
            {...field}
            {...props}
            options={[
              { value: 'low', label: '低' },
              { value: 'medium', label: '中' },
              { value: 'high', label: '高' }
            ]}
            error={errors[name]?.message}
          />
        )}
      />
    </div>
  );
};

// コンポーネントを追加
TaskForm.Field = Field;
TaskForm.RichField = RichField;
TaskForm.UserField = UserField;
TaskForm.DateField = DateField;
TaskForm.ProjectField = ProjectField;
TaskForm.TagsField = TagsField;
TaskForm.CheckboxField = CheckboxField;
TaskForm.PriorityField = PriorityField;

export default TaskForm; 