import React, { useEffect, useState, useRef } from 'react';
import { MentionList, MentionItem } from './TaskCommentsStyles';

const MentionUsersList = ({ users, position, onSelect, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // 初期化時にアイテム参照を設定
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, users.length);
    if (users.length > 0 && selectedIndex >= 0) {
      // スクロール位置を調整
      const selectedItem = itemRefs.current[selectedIndex];
      if (selectedItem && listRef.current) {
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [users, selectedIndex]);

  // キーボードイベントハンドラ
  const handleKeyDown = (e) => {
    if (!users.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < users.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : users.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (users[selectedIndex]) {
          onSelect(users[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  // コンポーネントマウント時にドキュメントにイベントリスナーを追加
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [users, selectedIndex]);

  // ユーザー候補がない場合は何も表示しない
  if (!users.length) return null;

  return (
    <MentionList 
      ref={listRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      {users.map((user, index) => {
        const fullName = user.get_full_name || 
                        `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                        user.email || 
                        user.username || '';
        const initials = fullName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);

        return (
          <MentionItem
            key={user.id}
            className={index === selectedIndex ? 'selected' : ''}
            onClick={() => onSelect(user)}
            ref={el => (itemRefs.current[index] = el)}
          >
            <div className="mention-avatar">{initials}</div>
            <div className="mention-name">{fullName}</div>
          </MentionItem>
        );
      })}
    </MentionList>
  );
};

export default MentionUsersList; 