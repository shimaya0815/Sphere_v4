import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

// ツールバー設定
const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  [{ 'color': [] }, { 'background': [] }],
  ['link', 'image'],
  ['clean']
];

/**
 * リッチテキストエディターコンポーネント
 * @param {object} props props
 * @param {string} props.value エディタの値
 * @param {Function} props.onChange 値変更ハンドラ
 * @param {string} props.label ラベル
 * @param {boolean} props.readOnly 読み取り専用フラグ
 * @param {string} props.error エラーメッセージ
 * @param {string} props.placeholder プレースホルダ
 * @param {number} props.minHeight 最小の高さ（px）
 */
const RichTextEditor = ({
  value = '',
  onChange,
  label,
  readOnly = false,
  error,
  placeholder = '内容を入力してください...',
  minHeight = 200
}) => {
  // クライアントサイドでのみReactQuillをレンダリング
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 値変更処理
  const handleChange = (content) => {
    // 入力内容をサニタイズして安全なHTMLに
    const sanitizedContent = DOMPurify.sanitize(content);
    
    if (onChange) {
      onChange(sanitizedContent);
    }
  };
  
  // エディタのスタイル
  const editorStyle = {
    minHeight: `${minHeight}px`,
    maxHeight: '500px'
  };
  
  // 読み取り専用モジュール設定
  const modules = {
    toolbar: readOnly ? false : toolbarOptions
  };
  
  return (
    <div className={`rich-text-editor ${error ? 'has-error' : ''}`}>
      {label && <label className="editor-label">{label}</label>}
      
      <div className="editor-container">
        {mounted ? (
          <ReactQuill
            value={value}
            onChange={handleChange}
            modules={modules}
            readOnly={readOnly}
            placeholder={placeholder}
            style={editorStyle}
            theme="snow"
          />
        ) : (
          <div className="editor-placeholder" style={{ minHeight: `${minHeight}px` }}>
            エディターを読み込み中...
          </div>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

// コンテンツ表示用コンポーネント
export const RichTextContent = ({ content }) => {
  if (!content) return null;
  
  // コンテンツをサニタイズ
  const sanitizedContent = DOMPurify.sanitize(content);
  
  return (
    <div className="rich-text-content">
      <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
    </div>
  );
};

export default RichTextEditor; 