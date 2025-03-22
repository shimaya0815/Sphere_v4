import React, { useState, useRef, useEffect } from 'react';
import { HiPencil } from 'react-icons/hi';
import toast from 'react-hot-toast';

/**
 * タスクタイトル編集コンポーネント
 * @param {object} props props
 * @param {string} props.initialValue 初期値
 * @param {Function} props.onSave 保存時コールバック
 * @param {boolean} props.required 必須フラグ
 */
const TaskTitleEditor = ({ initialValue = '', onSave, required = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [tempValue, setTempValue] = useState(initialValue);
  const inputRef = useRef(null);
  
  // 初期値が変更されたら反映
  useEffect(() => {
    setValue(initialValue);
    setTempValue(initialValue);
  }, [initialValue]);
  
  // 編集モード開始時にフォーカス
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // カーソルを末尾に
      inputRef.current.setSelectionRange(
        tempValue.length,
        tempValue.length
      );
    }
  }, [isEditing, tempValue]);
  
  // 編集モードに切り替え
  const handleStartEditing = () => {
    setIsEditing(true);
  };
  
  // 編集内容を保存
  const handleSave = async () => {
    // 必須項目が空の場合
    if (required && !tempValue.trim()) {
      toast.error('タイトルは必須です');
      return;
    }
    
    try {
      if (onSave) {
        await onSave(tempValue);
      }
      
      setValue(tempValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving task title:', error);
      toast.error('タイトルの保存に失敗しました');
    }
  };
  
  // ESCで編集キャンセル、Enterで保存
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };
  
  // 外部クリックで保存
  const handleBlur = () => {
    handleSave();
  };
  
  return (
    <div className="task-title-editor">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="title-input"
          placeholder="タスクのタイトルを入力"
        />
      ) : (
        <div className="title-display" onClick={handleStartEditing}>
          <h2>{value || 'タスクのタイトルを入力'}</h2>
          <button className="edit-button" aria-label="タイトルを編集">
            <HiPencil size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskTitleEditor; 