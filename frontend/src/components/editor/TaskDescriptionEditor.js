import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { HiCodeBracket, HiLink, HiListBullet } from 'react-icons/hi2';
import { HiOutlinePencil } from 'react-icons/hi';

// Quillエディタのカスタムフォーマット定義
const CustomFormats = [
  'bold', 'italic', 'strike', 'underline',
  'list', 'bullet', 'ordered',
  'link', 'code-block', 'code', 
  'blockquote', 'header',
  'indent', 'align'
];

/**
 * Slackスタイルのリッチテキストエディタ
 * - リアルタイムフォーマット適用
 * - ショートカット対応
 * - URL自動リンク機能
 */
const TaskDescriptionEditor = ({ value, onChange }) => {
  // 内部状態
  const [editorContent, setEditorContent] = useState(value || '');
  const quillRef = useRef(null);

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
  
  // URLマッチング用正規表現は各関数で定義
  
  // 値が外部から変更された場合
  
  useEffect(() => {
    setEditorContent(value || '');
  }, [value]);
  
  // エディタ初期化と拡張
  useEffect(() => {
    if (!quillRef.current) return;
    
    // Quillインスタンスを取得
    const quill = quillRef.current.getEditor();
    
    // 簡易URLマッチャー
    const handleURLs = () => {
      try {
        // 編集全体の内容を取得
        const text = quill.getText();
        
        // URLパターンを検出する正規表現
        const urlRegex = /https?:\/\/\S+/g;
        
        // 全テキストから全てのURLを検出
        let match;
        while ((match = urlRegex.exec(text)) !== null) {
          const url = match[0];
          const start = match.index;
          const end = start + url.length;
          
          // URLの末尾が句読点などの場合、それを除外
          let urlEnd = end;
          const lastChar = url[url.length - 1];
          if (['.', ',', ':', ';', ')', '}', ']'].includes(lastChar)) {
            urlEnd--;
          }
          
          const length = urlEnd - start;
          
          // 現在のフォーマットを取得して、リンクがまだない場合のみ適用
          const formats = quill.getFormat(start, length);
          if (!formats.link) {
            // console.log('リンク化:', url.substring(0, length), 'at', start, 'length', length);
            
            // 非同期でフォーマットを適用（エラー防止）
            setTimeout(() => {
              quill.formatText(start, length, 'link', url.substring(0, length));
            }, 1);
          }
        }
      } catch (error) {
        console.error('URL処理中にエラーが発生:', error);
      }
    };
    
    // 以下の場合にURLを処理
    // 1. テキスト変更時
    quill.on('text-change', (delta, oldContents, source) => {
      if (source === 'user') {
        handleURLs();
      }
    });
    
    // 2. ペースト後
    quill.root.addEventListener('paste', () => {
      // ペースト後に少し待ってからURLを処理
      setTimeout(handleURLs, 10);
    });
    
    // 3. 初期表示時
    setTimeout(handleURLs, 100);
    
    // クリーンアップ
    return () => {
      quill.off('text-change');
      if (quill.root) {
        quill.root.removeEventListener('paste', handleURLs);
      }
    };
  }, []);
  
  // エディタの内容変更時
  const handleChange = (content) => {
    setEditorContent(content);
    
    // 変更をコールバックに通知
    if (onChange) {
      // 空の内容を特別処理
      if (content === '<p><br></p>' || content === '<p></p>') {
        onChange('');
      } else {
        onChange(content);
      }
    }
  };
  
  // ショートカットヘルプのレンダリング
  const renderShortcutHelp = () => (
    <div className="shortcut-help">
      <span className="shortcut"><kbd>Ctrl/Cmd</kbd> + <kbd>B</kbd>: 太字</span>
      <span className="shortcut"><kbd>Ctrl/Cmd</kbd> + <kbd>I</kbd>: 斜体</span>
      <span className="shortcut"><kbd>Ctrl/Cmd</kbd> + <kbd>E</kbd>: コード</span>
      <span className="shortcut">URLを貼り付けるとリンクに自動変換</span>
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
      </div>
    </div>
  );
};

export default TaskDescriptionEditor;