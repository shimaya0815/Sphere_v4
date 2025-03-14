import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * 基本的なリッチテキストエディタコンポーネント
 * 独立して動作し、変更時に親コンポーネントに通知する
 */
function BasicRichTextEditor({ initialValue, onChange, placeholder }) {
  // 編集内容を内部状態として保持
  const [content, setContent] = useState(initialValue || '');
  
  // 外部から値が変更された場合に反映
  useEffect(() => {
    setContent(initialValue || '');
  }, [initialValue]);
  
  // エディタツールバーの設定
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],          // テキスト装飾
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],  // リスト
      ['link'],                                 // リンク
      ['clean']                                 // 書式削除
    ]
  };
  
  // サポートするフォーマット
  const formats = [
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link'
  ];
  
  // エディタの内容が変更された時の処理
  const handleChange = (newContent) => {
    setContent(newContent);
    
    // 親コンポーネントに通知
    if (onChange) {
      onChange(newContent);
    }
  };
  
  return (
    <div className="basic-rich-editor">
      <style>
        {`
          .basic-rich-editor .ql-container {
            border-radius: 0 0 0.375rem 0.375rem;
            font-size: 0.875rem;
          }
          
          .basic-rich-editor .ql-toolbar {
            border-radius: 0.375rem 0.375rem 0 0;
            background-color: #f8f9fa;
          }
          
          .basic-rich-editor .ql-editor {
            min-height: 150px;
          }
          
          .basic-rich-editor .ql-editor p {
            margin-bottom: 0.5rem;
          }
        `}
      </style>
      
      <ReactQuill
        theme="snow"
        value={content}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'ここに入力してください...'}
      />
    </div>
  );
}

export default BasicRichTextEditor;