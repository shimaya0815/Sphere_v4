import styled from 'styled-components';

/**
 * Quillエディタ用のCSS
 */
export const quillStyles = `
  .ql-container {
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  
  .ql-editor {
    min-height: 120px;
    max-height: 300px;
    overflow-y: auto;
    padding: 12px 15px;
  }
  
  .ql-editor p {
    margin-bottom: 8px;
  }
  
  .ql-toolbar {
    border-radius: 4px 4px 0 0;
    background-color: #f9fafb;
    border-color: #e5e7eb;
  }
  
  .ql-container {
    border-radius: 0 0 4px 4px;
    border-color: #e5e7eb;
  }
  
  .ql-snow .ql-picker-label {
    color: #4b5563;
  }
  
  .ql-snow .ql-stroke {
    stroke: #4b5563;
  }
  
  .ql-snow .ql-fill {
    fill: #4b5563;
  }
  
  .ql-snow.ql-toolbar button:hover,
  .ql-snow .ql-toolbar button:hover,
  .ql-snow.ql-toolbar button.ql-active,
  .ql-snow .ql-toolbar button.ql-active,
  .ql-snow.ql-toolbar .ql-picker-label:hover,
  .ql-snow .ql-toolbar .ql-picker-label:hover,
  .ql-snow.ql-toolbar .ql-picker-label.ql-active,
  .ql-snow .ql-toolbar .ql-picker-label.ql-active,
  .ql-snow.ql-toolbar .ql-picker-item:hover,
  .ql-snow .ql-toolbar .ql-picker-item:hover,
  .ql-snow.ql-toolbar .ql-picker-item.ql-selected,
  .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
    color: #3b82f6;
  }
  
  .ql-snow.ql-toolbar button:hover .ql-stroke,
  .ql-snow .ql-toolbar button:hover .ql-stroke,
  .ql-snow.ql-toolbar button.ql-active .ql-stroke,
  .ql-snow .ql-toolbar button.ql-active .ql-stroke,
  .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
  .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
  .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke,
  .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke {
    stroke: #3b82f6;
  }
  
  .ql-snow.ql-toolbar button:hover .ql-fill,
  .ql-snow .ql-toolbar button:hover .ql-fill,
  .ql-snow.ql-toolbar button.ql-active .ql-fill,
  .ql-snow .ql-toolbar button.ql-active .ql-fill,
  .ql-snow.ql-toolbar .ql-picker-label:hover .ql-fill,
  .ql-snow .ql-toolbar .ql-picker-label:hover .ql-fill,
  .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-fill,
  .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-fill {
    fill: #3b82f6;
  }
`;

// メインコンテナ
export const CommentContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  width: 100%;
`;

// コメント入力フォーム
export const CommentForm = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

// Quillエディタのカスタムスタイル
export const QuillContainer = styled.div`
  .ql-editor {
    min-height: 100px;
    max-height: 200px;
    overflow-y: auto;
    line-height: 1.5;
    padding: 12px 15px;
    background: #fff;
  }
  
  .ql-toolbar {
    border-bottom: 1px solid #e0e0e0;
    background: #f9f9f9;
  }
`;

// コメントアクション
export const CommentActions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  background: #f9f9f9;
  border-top: 1px solid #e0e0e0;
`;

// コメント送信ボタン
export const SubmitButton = styled.button`
  background-color: #4a86e8;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background-color: #3a76d8;
  }
  
  &:disabled {
    background-color: #c5d3f0;
    cursor: not-allowed;
  }
`;

// コメントリストのスタイル
export const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

// 個別コメントのスタイル
export const CommentItem = styled.div`
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
`;

// アバターのスタイル
export const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #4a86e8;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
  flex-shrink: 0;
`;

// コメントコンテンツ
export const CommentContent = styled.div`
  flex: 1;
`;

// コメントヘッダー
export const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
`;

// ユーザー名
export const UserName = styled.div`
  font-weight: 500;
  color: #333;
`;

// タイムスタンプ
export const TimeStamp = styled.div`
  font-size: 0.8rem;
  color: #888;
`;

// コメント本文
export const CommentBody = styled.div`
  color: #333;
  
  p {
    margin: 0 0 8px 0;
  }
  
  a {
    color: #4a86e8;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .mention {
    color: #4a86e8;
    background-color: rgba(74, 134, 232, 0.1);
    padding: 0 4px;
    border-radius: 2px;
    font-weight: 500;
  }
`;

// メンション候補リスト
export const MentionList = styled.div`
  position: absolute;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  width: 250px;
`;

// メンション候補アイテム
export const MentionItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  
  &:hover, &.selected {
    background-color: #f0f7ff;
  }
  
  .mention-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #4a86e8;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 8px;
    font-size: 0.8rem;
  }
  
  .mention-name {
    font-weight: 500;
  }
`;

export default {
  quillStyles
}; 