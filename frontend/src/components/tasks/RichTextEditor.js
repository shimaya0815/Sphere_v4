import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// ReactQuillコンポーネントの存在チェック
console.log('RichTextEditor component loaded, ReactQuill:', ReactQuill ? 'available' : 'not available');

// シンプルな実装に変更して問題を特定
const RichTextEditor = ({ value, onChange, placeholder, onBlur }) => {
  // デバッグ情報を追加
  console.log('RichTextEditor rendering with props:', { value, placeholder });
  
  // 内部状態として値を保持
  const [editorContent, setEditorContent] = useState(value || '');
  
  // 外部からの値変更を内部状態に反映
  useEffect(() => {
    console.log('RichTextEditor value prop changed:', value);
    setEditorContent(value || '');
  }, [value]);

  // エディタ設定（シンプルにする）
  const modules = {
    toolbar: [
      ['bold', 'italic'], 
      [{ 'list': 'ordered' }, { 'list': 'bullet' }]
    ]
  };

  // 値が変更された時の処理
  const handleChange = (content) => {
    console.log('Editor content changed:', content);
    setEditorContent(content);
    
    // 親コンポーネントに通知
    if (onChange) {
      onChange(content);
    }
  };

  // フォーカスが外れたときの処理
  const handleBlur = () => {
    console.log('Editor lost focus, current content:', editorContent);
    if (onBlur) {
      onBlur(editorContent);
    }
  };

  // 説明テキスト用のダミーデータ
  const dummyText = `これはリッチテキストエディタのサンプルです。

- 箇条書き1
- 箇条書き2
- **太字テキスト**
- *斜体テキスト*

編集してみてください。`;

  return (
    <div className="rich-text-editor-container">
      {/* スタイル定義 */}
      <style>
        {`
          .rich-text-editor-container {
            border: 2px solid #e5e7eb;
            border-radius: 0.375rem;
            overflow: hidden;
            margin-bottom: 1rem;
          }
          
          .ql-toolbar {
            background-color: #f9fafb;
            border-bottom: 1px solid #e5e7eb !important;
            padding: 0.5rem !important;
          }
          
          .ql-container {
            min-height: 150px;
            font-size: 0.875rem !important;
          }
          
          .ql-editor {
            min-height: 150px;
          }
        `}
      </style>

      {/* フォールバック表示（エディタが表示されない場合） */}
      <div className="fallback-message hidden">
        <p className="p-4 text-sm text-gray-500">エディタを読み込み中...</p>
      </div>
      
      {/* ReactQuillエディタ */}
      <ReactQuill
        value={editorContent}
        onChange={handleChange}
        modules={modules}
        placeholder={placeholder || 'ここに入力してください...'}
        theme="snow"
        onBlur={handleBlur}
      />
      
      {/* 書式説明テキスト */}
      <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
        書式設定: 太字(Ctrl+B) / 斜体(Ctrl+I) / 箇条書き
      </div>
    </div>
  );
};

export default RichTextEditor;