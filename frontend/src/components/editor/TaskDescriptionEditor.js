import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { HiCodeBracket, HiLink, HiListBullet } from 'react-icons/hi2';
import { HiOutlinePencil } from 'react-icons/hi';
// dompurifyは削除

// Quillエディタのカスタムフォーマット定義
const CustomFormats = [
  'bold', 'italic', 'strike', 'underline',
  'list', 'bullet', 'ordered',
  'link', 'code-block', 'code', 
  'blockquote', 'header',
  'indent', 'align'
];

// カスタムツールバーオプション定義
const CustomToolbar = [
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'align': [] }],
  ['link', 'code'],
  ['clean']
];

/**
 * Slackスタイルのリッチテキストエディタ
 * - リアルタイムフォーマット適用
 * - ショートカット対応
 * - 自動保存機能
 */
const TaskDescriptionEditor = ({ value, onChange, onSave }) => {
  // 内部状態
  const [editorContent, setEditorContent] = useState(value || '');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const quillRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // エディタ設定 (シンプルなツールバーのみを使用)
  const simpleToolbar = [
    ['bold', 'italic', 'code'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link'],
  ];

  const modules = useMemo(() => ({
    toolbar: simpleToolbar,
    keyboard: {
      bindings: {
        bold: {
          key: 'B',
          shortKey: true,
          handler: function(range, context) {
            this.quill.format('bold', !context.format.bold);
          }
        },
        italic: {
          key: 'I',
          shortKey: true,
          handler: function(range, context) {
            this.quill.format('italic', !context.format.italic);
          }
        },
        code: {
          key: 'E',
          shortKey: true,
          handler: function(range, context) {
            this.quill.format('code', !context.format.code);
          }
        }
      }
    }
  }), []);
  
  // 値が外部から変更された場合
  useEffect(() => {
    setEditorContent(value || '');
  }, [value]);
  
  // エディタの内容変更時
  const handleChange = (content) => {
    setEditorContent(content);
    
    // 変更をコールバックに通知
    if (onChange) {
      onChange(content);
    }
    
    // 自動保存のセットアップ
    if (onSave) {
      setIsAutoSaving(true);
      
      // 既存のタイマーをクリア
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // 1.5秒後に自動保存
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave();
        setIsAutoSaving(false);
      }, 1500);
    }
  };
  
  // 自動保存タイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);
  
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
  
  // ショートカットヘルプのレンダリング
  const renderShortcutHelp = () => (
    <div className="shortcut-help">
      <span className="shortcut"><kbd>Ctrl/Cmd</kbd> + <kbd>B</kbd>: 太字</span>
      <span className="shortcut"><kbd>Ctrl/Cmd</kbd> + <kbd>I</kbd>: 斜体</span>
      <span className="shortcut"><kbd>Ctrl/Cmd</kbd> + <kbd>E</kbd>: コード</span>
    </div>
  );
  
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
            font-family: inherit;
          }
          
          .task-description-editor .ql-editor {
            min-height: 120px;
            max-height: 300px;
            overflow-y: auto;
            font-size: 0.875rem;
            font-family: inherit;
          }
          
          .task-description-editor .ql-editor p {
            margin-bottom: 0.5rem;
          }
          
          .task-description-editor .ql-editor pre {
            background: #f6f8fa;
            border-radius: 3px;
            padding: 0.5rem;
            font-family: monospace;
          }
          
          .task-description-editor .ql-editor code {
            background: #f6f8fa;
            border-radius: 3px;
            padding: 0.125rem 0.25rem;
            font-family: monospace;
            font-size: 0.875em;
          }
          
          .task-description-editor .ql-editor blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1rem;
            color: #6b7280;
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
            display: flex;
            align-items: center;
            gap: 4px;
          }
          
          .save-button:hover {
            background-color: #2563eb;
          }
          
          .save-button.saving {
            background-color: #9ca3af;
          }
          
          .editor-hint {
            font-size: 0.75rem;
            color: #6b7280;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .toolbar-toggle {
            display: flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 4px;
            background: #f3f4f6;
            cursor: pointer;
            margin-right: 8px;
          }
          
          .toolbar-toggle:hover {
            background: #e5e7eb;
          }
          
          .format-icons {
            display: flex;
            gap: 4px;
            margin-right: 8px;
          }
          
          .format-btn {
            background: none;
            border: none;
            padding: 2px 4px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            color: #6b7280;
          }
          
          .format-btn:hover {
            background: #f3f4f6;
            color: #374151;
          }
          
          .format-btn.active {
            color: #2563eb;
            background: #eff6ff;
          }
          
          .shortcut-help {
            display: flex;
            gap: 8px;
            font-size: 0.7rem;
            color: #9ca3af;
          }
          
          .shortcut kbd {
            font-family: monospace;
            background: #f3f4f6;
            padding: 1px 3px;
            border-radius: 3px;
            border: 1px solid #e5e7eb;
          }
          
          @media (max-width: 640px) {
            .shortcut-help {
              display: none;
            }
          }
        `}
      </style>
      
      <ReactQuill
        ref={quillRef}
        value={editorContent}
        onChange={handleChange}
        modules={modules}
        formats={CustomFormats}
        placeholder="タスクの説明を入力してください...（Ctrl+Bで太字、Ctrl+Iで斜体）"
        theme="snow"
      />
      
      <div className="editor-footer">
        <div className="editor-hint">
          <div className="flex items-center">
            {renderShortcutHelp()}
          </div>
        </div>
        
        <button 
          type="button"
          className={`save-button ${isAutoSaving ? 'saving' : ''}`}
          onClick={handleSave}
          disabled={isAutoSaving}
        >
          {isAutoSaving ? '保存中...' : '変更を保存'}
        </button>
      </div>
    </div>
  );
};

export default TaskDescriptionEditor;