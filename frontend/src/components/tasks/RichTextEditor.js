import React, { forwardRef, useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// ReactQuillのfindDOMNode非推奨警告を抑制するためのラッパーコンポーネント
const RichTextEditor = forwardRef(({ value, onChange, placeholder, onBlur }, ref) => {
  const [editorValue, setEditorValue] = useState(value || '');

  // 外部からvalueが変更された場合に反映
  useEffect(() => {
    if (value !== undefined) {
      setEditorValue(value);
    }
  }, [value]);

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

  return (
    <div className="rich-text-editor">
      <style>
        {`
          .rich-text-editor .ql-container {
            border-radius: 0 0 4px 4px;
            min-height: 150px;
            font-size: 0.875rem;
          }
          
          .rich-text-editor .ql-toolbar {
            border-radius: 4px 4px 0 0;
          }
          
          .rich-text-editor .ql-editor {
            min-height: 150px;
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
      />
    </div>
  );
});

export default RichTextEditor;