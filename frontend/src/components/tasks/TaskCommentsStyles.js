// Quillエディタのスタイル定義
export const quillStyles = `
/* コンテナ全体のスタイル */
.quill-container {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
  min-height: 150px;
  display: flex;
  flex-direction: column;
}

/* Quillエディタ全体のスタイル */
.quill-editor {
  display: flex;
  flex-direction: column;
  height: 150px;
}

/* ツールバー部分のスタイル */
.ql-toolbar.ql-snow {
  border-radius: 4px 4px 0 0;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
  display: flex !important;
  flex-wrap: wrap !important;
  padding: 8px;
}

/* エディタ本文部分のスタイル */
.ql-container.ql-snow {
  border: none;
  font-size: 0.875rem;
  height: 120px;
  overflow-y: auto;
}

/* エディタのコンテンツ領域 */
.ql-editor {
  min-height: 100px;
  font-family: inherit;
  padding: 12px;
}

/* コンテンツ表示用のスタイル */
.quill-content {
  font-size: 0.875rem;
  line-height: 1.5;
}

.quill-content img {
  max-width: 100%;
  height: auto;
  margin: 8px 0;
  border-radius: 4px;
}

.quill-content p {
  margin-bottom: 0.5rem;
}

.quill-content blockquote {
  border-left: 3px solid #ccc;
  padding-left: 0.75rem;
  margin-left: 0;
  color: #666;
}

.quill-content pre {
  background-color: #f1f1f1;
  border-radius: 3px;
  padding: 0.5rem;
  font-family: monospace;
  white-space: pre-wrap;
}

.quill-content .ql-syntax {
  background-color: #f8f8f8;
  border-radius: 3px;
  padding: 0.5rem;
  font-family: monospace;
  white-space: pre-wrap;
}

.quill-content ul, .quill-content ol {
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

.quill-content ul li {
  list-style-type: disc;
}

.quill-content ol li {
  list-style-type: decimal;
}

.quill-content a {
  color: #2563eb;
  text-decoration: underline;
}

.quill-content strong, .quill-content b {
  font-weight: bold;
}

.quill-content em, .quill-content i {
  font-style: italic;
}
`; 