import React, { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { HiCodeBracket, HiLink, HiListBullet, HiPhoto } from 'react-icons/hi2';
import { HiOutlinePencil, HiOutlineChevronRight } from 'react-icons/hi';
import toast from 'react-hot-toast';

// Quillエディタのカスタムフォーマット定義
const CustomFormats = [
  'bold', 'italic', 'strike', 'underline',
  'list', 'bullet', 'ordered',
  'link', 'code-block', 'code', 
  'blockquote', 'header',
  'indent', 'align',
  'image'
];

// ReactQuillをforwardRefでラップして、findDOMNodeの使用を回避
const QuillEditor = forwardRef((props, ref) => {
  return <ReactQuill ref={ref} {...props} />;
});
QuillEditor.displayName = 'QuillEditor'; // displayNameを追加して開発ツールでの識別を容易に

/**
 * Slackスタイルのリッチテキストエディタ
 * - リアルタイムフォーマット適用
 * - ショートカット対応
 * - URL自動リンク機能
 * - 画像貼り付け機能
 */
const TaskDescriptionEditor = ({ value, onChange }) => {
  // 内部状態
  const [editorContent, setEditorContent] = useState(value || '');
  const quillRef = useRef(null);
  const editorRef = useRef(null);

  // エディタ設定 (シンプルなツールバーのみを使用)
  const simpleToolbar = [
    ['bold', 'italic', 'code'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, 'blockquote'],
    ['link', 'image'],
  ];

  const modules = useMemo(() => ({
    toolbar: {
      container: simpleToolbar,
      handlers: {
        image: function() {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();
          
          input.onchange = () => {
            if (input.files && input.files[0]) {
              const file = input.files[0];
              
              // ファイルサイズチェック (5MB)
              if (file.size > 5 * 1024 * 1024) {
                toast.error('画像サイズが大きすぎます（最大5MB）');
                return;
              }
              
              const reader = new FileReader();
              reader.onload = (e) => {
                const quill = this.quill;
                const range = quill.getSelection(true);
                const position = range ? range.index : 0;
                
                // 画像を挿入
                quill.insertEmbed(position, 'image', e.target.result);
                
                // 挿入した画像にスタイルを適用
                setTimeout(() => {
                  const imageElements = quill.root.querySelectorAll('img');
                  if (imageElements.length > 0) {
                    const lastImage = imageElements[imageElements.length - 1];
                    lastImage.style.maxWidth = '100%';
                    lastImage.style.height = 'auto';
                    lastImage.style.margin = '10px 0';
                    lastImage.style.borderRadius = '4px';
                    
                    // 大きな画像の場合は高さも制限
                    if (lastImage.naturalHeight > 600) {
                      lastImage.style.maxHeight = '400px';
                      lastImage.style.objectFit = 'contain';
                    }
                  }
                }, 10);
                
                // カーソルを画像の後ろに移動
                quill.setSelection(position + 1);
                
                // 変更を通知
                if (onChange) {
                  onChange(quill.root.innerHTML);
                }
              };
              
              reader.readAsDataURL(file);
            }
          };
        }
      }
    },
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
        },
        blockquote: {
          key: '9',
          shortKey: true,
          shiftKey: true,
          handler: function(range, context) {
            this.quill.format('blockquote', !context.format.blockquote);
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
    
    // クリップボードからの画像貼り付け処理
    const handlePaste = (e) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      
      const items = clipboardData.items;
      let hasImage = false;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          hasImage = true;
          
          const blob = items[i].getAsFile();
          
          // 画像サイズのチェック（最大5MBまで）
          if (blob.size > 5 * 1024 * 1024) {
            toast.error('画像サイズが大きすぎます（最大5MB）');
            return;
          }
          
          // FileReaderを使用してBase64に変換
          const reader = new FileReader();
          reader.onload = (readerEvent) => {
            const base64Data = readerEvent.target.result;
            
            // 現在のカーソル位置を取得
            const range = quill.getSelection(true);
            const position = range ? range.index : quill.getLength();
            
            // 画像をエディタに直接挿入
            quill.insertEmbed(position, 'image', base64Data);
            
            // 挿入した画像要素を取得して最大幅を設定
            setTimeout(() => {
              const imageElements = quill.root.querySelectorAll('img');
              if (imageElements.length > 0) {
                const lastImage = imageElements[imageElements.length - 1];
                
                // 画像にスタイルを適用
                lastImage.style.maxWidth = '100%';
                lastImage.style.height = 'auto';
                lastImage.style.margin = '10px 0';
                lastImage.style.borderRadius = '4px';
                
                // 画像が大きすぎる場合は最大高さも制限
                if (lastImage.naturalHeight > 600) {
                  lastImage.style.maxHeight = '400px';
                  lastImage.style.objectFit = 'contain';
                }
              }
            }, 10);
            
            // カーソルを画像の後ろに移動
            quill.setSelection(position + 1);
            
            // 変更を通知
            if (onChange) {
              onChange(quill.root.innerHTML);
            }
            
            toast.success('画像が挿入されました');
          };
          
          // Base64として読み込み
          reader.readAsDataURL(blob);
          
          // 他のアプリケーションのデフォルト貼り付け動作を停止
          e.preventDefault();
          break;
        }
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
    quill.root.addEventListener('paste', handlePaste);
    
    // 3. 初期表示時
    setTimeout(handleURLs, 100);
    
    // クリーンアップ
    return () => {
      quill.off('text-change');
      if (quill.root) {
        quill.root.removeEventListener('paste', handlePaste);
      }
    };
  }, [onChange]);
  
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
    <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
      <span><kbd>Ctrl+B</kbd> 太字</span>
      <span><kbd>Ctrl+I</kbd> 斜体</span>
      <span><kbd>Ctrl+E</kbd> コード</span>
      <span><kbd>Ctrl+Shift+9</kbd> 引用</span>
      <span>画像はドラッグ&ドロップまたは貼り付け可能</span>
    </div>
  );
  
  return (
    <div ref={editorRef} className="task-description-editor">
      <style jsx="true">{`
        .task-description-editor {
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          overflow: hidden;
        }
        
        .task-description-editor .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          background-color: #f9fafb;
          border-color: #e5e7eb;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px;
        }
        
        .task-description-editor .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          border-color: #e5e7eb;
          border: none;
          height: auto;
          font-family: inherit;
        }
        
        .task-description-editor .ql-editor {
          font-size: 0.875rem;
          line-height: 1.5;
          min-height: 150px;
          max-height: 300px;
          overflow-y: auto;
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
          border-left: 3px solid #ccc;
          padding-left: 0.75rem;
          margin-left: 0;
          margin-bottom: 0.5rem;
          color: #666;
        }
        
        .task-description-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          margin: 10px 0;
          border-radius: 4px;
        }
      
        .task-description-editor .ql-blockquote {
          position: relative;
        }
        
        .task-description-editor .ql-blockquote:after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8.25 4.5l7.5 7.5-7.5 7.5' /%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
        }
        
        .editor-footer {
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
          padding: 8px 12px;
        }
      `}</style>
      <QuillEditor
        ref={quillRef}
        value={editorContent}
        onChange={handleChange}
        modules={modules}
        formats={CustomFormats}
        placeholder="タスクの詳細を記入..."
      />
      <div className="editor-footer">
        {renderShortcutHelp()}
      </div>
    </div>
  );
};

export default TaskDescriptionEditor;