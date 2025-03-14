import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * タスク説明用エディタコンポーネント
 * ReactQuillを直接統合し、特定のフォーマットのみをサポート
 */
const TaskDescriptionEditor = ({ value, onChange, onSave }) => {
  // 内部状態
  const [editorContent, setEditorContent] = useState(value || '');
  
  // 値が外部から変更された場合
  useEffect(() => {
    setEditorContent(value || '');
  }, [value]);
  
  // エディタの設定
  const modules = {
    toolbar: [
      ['bold', 'italic'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
    ]
  };
  
  // 対応フォーマット
  const formats = [
    'bold', 'italic',
    'list', 'bullet',
    'link'
  ];
  
  // エディタの内容変更時
  const handleChange = (content) => {
    setEditorContent(content);
    if (onChange) {
      onChange(content);
    }
  };
  
  // 保存ボタンクリック時
  const handleSave = () => {
    // 空の内容を特別処理
    let contentToSave = editorContent;
    if (contentToSave === '<p><br></p>' || contentToSave === '<p></p>') {
      contentToSave = '';
    }
    
    if (onSave) {
      onSave(contentToSave);
    }
  };
  
  return (
    <div className="task-description-editor">
      <style>
        {`
          .task-description-editor {
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            overflow: hidden;
          }
          
          .task-description-editor .ql-toolbar {
            border: none;
            border-bottom: 1px solid #e5e7eb;
            background-color: #f9fafb;
            padding: 8px;
          }
          
          .task-description-editor .ql-container {
            border: none;
            height: auto;
          }
          
          .task-description-editor .ql-editor {
            min-height: 120px;
            max-height: 300px;
            overflow-y: auto;
            font-size: 0.875rem;
          }
          
          .editor-footer {
            border-top: 1px solid #e5e7eb;
            background-color: #f9fafb;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .save-button {
            background-color: #3b82f6;
            color: white;
            font-size: 0.75rem;
            font-weight: 500;
            padding: 0.25rem 0.75rem;
            border-radius: 0.25rem;
            border: none;
            cursor: pointer;
          }
          
          .save-button:hover {
            background-color: #2563eb;
          }
          
          .editor-hint {
            font-size: 0.75rem;
            color: #6b7280;
          }
        `}
      </style>
      
      <ReactQuill
        value={editorContent}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder="タスクの説明を入力してください..."
        theme="snow"
      />
      
      <div className="editor-footer">
        <div className="editor-hint">
          ※ 書式：<b>太字</b>、<i>斜体</i>、箇条書き、リンク
        </div>
        <button 
          type="button"
          className="save-button"
          onClick={handleSave}
        >
          変更を保存
        </button>
      </div>
    </div>
  );
};

export default TaskDescriptionEditor;