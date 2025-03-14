import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * 直接実装のリッチテキストエディタ
 * React Hook Formを明示的に回避して実装
 */
const SimpleRichTextEditor = ({ 
  initialValue = '', 
  onSave,
  placeholder = 'ここに入力してください...'
}) => {
  // エディタの内容を状態として保持
  const [content, setContent] = useState(initialValue || '');
  
  // 表示用の値
  const displayValue = content === '<p><br></p>' ? '' : content;
  
  // ツールバーの設定
  const modules = {
    toolbar: [
      ['bold', 'italic'],  // 太字、斜体
      ['link'],            // リンク
      [{ 'list': 'ordered' }, { 'list': 'bullet' }]  // 順序リスト、箇条書き
    ]
  };
  
  // 対応フォーマット
  const formats = [
    'bold', 'italic',
    'list', 'bullet',
    'link'
  ];

  // 値が変更された時の処理
  const handleChange = (html) => {
    console.log('エディタ内容変更:', html ? html.substring(0, 20) + '...' : '空');
    setContent(html || '');
  };
  
  // フォーカスが外れた時の処理
  const handleBlur = () => {
    console.log('エディタからフォーカスが外れました');
    
    // 空の内容を正規化
    let cleanContent = content;
    if (content === '<p><br></p>' || content === '<p></p>') {
      cleanContent = '';
    }
    
    // 親コンポーネントのコールバックを呼び出し
    if (onSave) {
      onSave(cleanContent);
    }
  };

  return (
    <div className="rich-text-editor" style={{ 
      border: '1px solid #d1d5db', 
      borderRadius: '0.375rem',
      overflow: 'hidden' 
    }}>
      <style>{`
        .rich-text-editor .ql-toolbar {
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb !important;
          padding: 8px !important;
        }
        
        .rich-text-editor .ql-container {
          font-size: 0.875rem !important;
          font-family: inherit;
          min-height: 120px;
        }
        
        .rich-text-editor .ql-editor {
          min-height: 120px;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .rich-text-editor .ql-editor p {
          margin-bottom: 0.5em;
        }
      `}</style>
      
      <ReactQuill
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        theme="snow"
      />
    </div>
  );
};

export default SimpleRichTextEditor;