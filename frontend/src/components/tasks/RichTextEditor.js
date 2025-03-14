import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * 完全にシンプル化したリッチテキストエディタ
 * React Hook Formと併用可能
 */
const RichTextEditor = ({ 
  name = 'description',  // デフォルトはdescription
  value = '',           // 初期値
  onChange,             // 変更時のコールバック
  onBlur,               // フォーカス外れた時のコールバック
  placeholder = 'ここに入力してください...',
  register               // React Hook Formのregister関数（オプション）
}) => {
  console.log('QuillEditor rendering with value:', value?.substring(0, 30));

  // エディタの内容を状態として保持
  const [content, setContent] = useState(value || '');
  
  // 外部からの値の変更を検知して内部状態を更新
  useEffect(() => {
    console.log('QuillEditor: external value changed');
    setContent(value || '');
  }, [value]);

  // ツールバーの設定（最小限）
  const modules = {
    toolbar: [
      ['bold', 'italic'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }]
    ]
  };

  // エディタの内容が変更された時の処理
  const handleChange = (html) => {
    console.log('QuillEditor: content changed');
    setContent(html);
    
    // 親コンポーネントに変更を通知
    if (onChange) {
      onChange({
        target: {
          name,
          value: html
        }
      });
    }
  };
  
  // フォーカスが外れた時の処理
  const handleBlur = () => {
    console.log('QuillEditor: blur event');
    
    // 標準的なイベントオブジェクトを模倣
    if (onBlur) {
      onBlur({
        target: {
          name,
          value: content
        }
      });
    }
  };

  // タイムアウト後にエディタを初期化（実験的）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.querySelector('.ql-editor')) {
        console.log('QuillEditor initialized successfully');
      } else {
        console.warn('QuillEditor not found in DOM');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="quill-editor-wrapper" style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
      <style>{`
        .quill-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.375rem; 
          border-top-right-radius: 0.375rem;
          background-color: #f9fafb;
          border: none;
          border-bottom: 1px solid #e5e7eb;
        }
        .quill-editor-wrapper .ql-container {
          border: none;
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .quill-editor-wrapper .ql-editor {
          min-height: 160px;
          font-family: inherit;
        }
      `}</style>
      
      <ReactQuill
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        modules={modules}
        formats={['bold', 'italic', 'list', 'bullet']}
        placeholder={placeholder}
        theme="snow"
      />
    </div>
  );
};

export default RichTextEditor;