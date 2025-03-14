import React, { forwardRef, useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// ReactQuillが正しく動作するためのデバッグログ
console.log('RichTextEditor component loaded, ReactQuill:', ReactQuill ? 'available' : 'not available');

// ReactQuillのfindDOMNode非推奨警告を抑制するためのラッパーコンポーネント
const RichTextEditor = forwardRef(({ value, onChange, placeholder, onBlur }, ref) => {
  const [editorValue, setEditorValue] = useState(value || '');

  // エディタ設定
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };
  
  // フォーマット指定
  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block',
    'list', 'bullet',
    'link'
  ];
  
  // コンポーネントがマウントされたときにデバッグログを出力
  useEffect(() => {
    console.log('RichTextEditor mounted, modules:', modules);
  }, [modules]);

  // 外部からvalueが変更された場合に反映
  useEffect(() => {
    if (value !== undefined) {
      console.log('RichTextEditor value changed:', value);
      setEditorValue(value);
    }
  }, [value]);

  // エディタの変更を処理
  const handleChange = (content) => {
    setEditorValue(content);
    if (onChange) {
      onChange(content);
    }
  };

  // エディタがフォーカスを失った時の処理
  const handleBlur = () => {
    if (onBlur) {
      onBlur(editorValue);
    }
  };

  // レンダリング時にデバッグログ
  console.log('RichTextEditor rendering with value:', editorValue);

  return (
    <div className="rich-text-editor" style={{ border: '1px solid #ccc', borderRadius: '4px', marginBottom: '1rem' }}>
      <style>
        {`
          .rich-text-editor .ql-container {
            border-radius: 0 0 4px 4px;
            min-height: 150px;
            font-size: 0.875rem;
            background-color: white;
          }
          
          .rich-text-editor .ql-toolbar {
            border-radius: 4px 4px 0 0;
            background-color: #f8f8f8;
            border-bottom: 1px solid #ccc;
          }
          
          .rich-text-editor .ql-editor {
            min-height: 150px;
            background-color: white;
          }
          
          .rich-text-editor .ql-editor p {
            margin-bottom: 0.5rem;
          }
          
          .rich-text-editor .ql-editor blockquote {
            border-left: 3px solid #ccc;
            padding-left: 0.75rem;
            margin-left: 0;
            color: #666;
          }
          
          .rich-text-editor .ql-editor pre {
            background-color: #f1f1f1;
            border-radius: 3px;
            padding: 0.5rem;
            font-family: monospace;
            white-space: pre-wrap;
          }
        `}
      </style>

      <ReactQuill
        ref={ref}
        value={editorValue}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'ここに入力...'}
        theme="snow"
        onBlur={handleBlur}
        style={{ height: '200px' }}
      />
      <div className="text-xs text-gray-500 mt-1">
        書式設定: 太字・斜体・リスト・引用などが使えます
      </div>
    </div>
  );
});

export default RichTextEditor;