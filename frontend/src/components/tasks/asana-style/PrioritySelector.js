import React, { useState, useEffect, forwardRef } from 'react';
import { HiCheck, HiOutlineChevronDown, HiFlag } from 'react-icons/hi';

// 優先度のオプション
const PRIORITY_OPTIONS = [
  { id: 'low', label: '低', color: '#718096', icon: <HiFlag /> },
  { id: 'medium', label: '中', color: '#f6ad55', icon: <HiFlag /> },
  { id: 'high', label: '高', color: '#f56565', icon: <HiFlag /> },
  { id: 'urgent', label: '緊急', color: '#9b2c2c', icon: <HiFlag /> }
];

/**
 * 優先度選択コンポーネント
 * @param {object} props props
 * @param {string} props.value 現在の値
 * @param {Function} props.onChange 値変更ハンドラ
 * @param {boolean} props.disabled 無効フラグ
 */
const PrioritySelector = forwardRef(({ value = 'medium', onChange, disabled = false, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(
    PRIORITY_OPTIONS.find(option => option.id === value) || PRIORITY_OPTIONS[1]
  );
  
  // valueが変更されたら選択されているオプションを更新
  useEffect(() => {
    const option = PRIORITY_OPTIONS.find(option => option.id === value);
    if (option && option.id !== selectedOption.id) {
      setSelectedOption(option);
    }
  }, [value, selectedOption.id]);
  
  // 優先度変更ハンドラ
  const handleSelect = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
    
    if (onChange) {
      onChange(option.id);
    }
  };
  
  // ドロップダウン表示の切り替え
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  };
  
  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.priority-selector')) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <div className={`priority-selector ${disabled ? 'disabled' : ''}`} ref={ref} {...props}>
      <div 
        className="selected-priority"
        onClick={toggleDropdown}
      >
        <span className="priority-icon" style={{ color: selectedOption.color }}>
          {React.cloneElement(selectedOption.icon, { size: 16 })}
        </span>
        <span className="priority-label">{selectedOption.label}</span>
        <HiOutlineChevronDown className={`dropdown-icon ${isOpen ? 'open' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="priority-dropdown">
          {PRIORITY_OPTIONS.map(option => (
            <div
              key={option.id}
              className={`priority-option ${option.id === selectedOption.id ? 'selected' : ''}`}
              onClick={() => handleSelect(option)}
            >
              <span className="priority-icon" style={{ color: option.color }}>
                {React.cloneElement(option.icon, { size: 16 })}
              </span>
              <span className="priority-label">{option.label}</span>
              {option.id === selectedOption.id && <HiCheck className="selected-icon" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PrioritySelector.displayName = 'PrioritySelector';

export default PrioritySelector; 