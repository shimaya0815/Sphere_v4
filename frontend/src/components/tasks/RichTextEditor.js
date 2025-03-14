import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/*
 * シンプルなリッチテキストエディタコンポーネント
 * ReactQuillを使用し、最小限の機能に絞った実装
 */
const RichTextEditor = ({ value, onChange, onSave, placeholder }) => {
  // 内部状態として値を保持
  const [content, setContent] = useState(value || '');
  
  // エディタツールバーの設定（最小限）
  const modules = {
    toolbar: [
      ['bold', 'italic'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }]
    ]
  };

  // 値が変更された時の処理
  const handleChange = (html) => {
    console.log('エディタ内容変更:', html);
    setContent(html);
    
    // 親コンポーネントのonChangeハンドラを呼び出し
    if (onChange) {
      onChange(html);
    }
  };
  
  // フォーカスが外れた時の処理
  const handleBlur = () => {
    console.log('エディタからフォーカスが外れました');
    
    // 空の内容を処理
    let cleanContent = content;
    if (content === '<p><br></p>' || content === '<p></p>') {
      console.log('空の内容を検出しました');
      cleanContent = '';
    }
    
    // 保存処理を実行
    if (onSave) {
      console.log('保存される内容:', cleanContent);
      onSave(cleanContent);
    }
  };

  // タイムアウト後にエディタにフォーカスを当てる
  setTimeout(() => {
    try {
      const editorElements = document.querySelectorAll('.ql-editor');
      if (editorElements && editorElements.length > 0) {
        console.log('エディタにフォーカスを当てます');
        editorElements[0].click();
      }
    } catch (e) {
      console.error('エディタにフォーカスできませんでした', e);
    }
  }, 500);

  return (
    <div className="rich-editor" style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
      <style>
        {`
          .rich-editor .ql-toolbar {
            background-color: #f8f9fa;
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
            border-bottom: 1px solid #ddd;
          }
          .rich-editor .ql-container {
            border-bottom-left-radius: 4px;
            border-bottom-right-radius: 4px;
          }
          .rich-editor .ql-editor {
            min-height: 120px;
            font-size: 0.875rem;
          }
        `}
      </style>
      
      <ReactQuill
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        modules={modules}
        placeholder={placeholder || 'ここに入力してください...'}
        theme="snow"
      />
    </div>
  );
};

export default RichTextEditor;