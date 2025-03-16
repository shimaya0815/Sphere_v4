import React from 'react';
import DOMPurify from 'dompurify';
import { Avatar, CommentItem, CommentContent, CommentHeader, UserName, TimeStamp, CommentBody } from './TaskCommentsStyles';
import { formatDate } from './TaskCommentsUtils';

// 個別コメント表示コンポーネント
const TaskCommentItem = ({ comment }) => {
  // ユーザーのイニシャルを生成
  const getUserInitials = (user) => {
    if (!user) return '??';
    
    const fullName = user.get_full_name || 
                    `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                    user.email || 
                    user.username || '';
                    
    if (!fullName) return '??';
    
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // HTMLコンテンツをサニタイズしてメンションをハイライト
  const getSanitizedContent = () => {
    // DOMPurifyで安全なHTMLのみを許可
    const cleanHtml = DOMPurify.sanitize(comment.html_content || '', {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
    });
    
    // メンションされたユーザーの名前を強調表示
    let enhancedHtml = cleanHtml;
    
    if (comment.mentioned_user_names && Array.isArray(comment.mentioned_user_names)) {
      comment.mentioned_user_names.forEach(name => {
        // 正規表現でメンションを検索し、spanタグで囲む
        const mentionRegex = new RegExp(`@(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?:\\s|$)`, 'g');
        enhancedHtml = enhancedHtml.replace(mentionRegex, '<span class="mention">@$1</span> ');
      });
    }
    
    return { __html: enhancedHtml };
  };

  return (
    <CommentItem>
      <Avatar>{getUserInitials(comment.user)}</Avatar>
      <CommentContent>
        <CommentHeader>
          <UserName>
            {comment.user?.get_full_name || 
             `${comment.user?.first_name || ''} ${comment.user?.last_name || ''}`.trim() || 
             comment.user?.email || 
             comment.user?.username || '不明なユーザー'}
          </UserName>
          <TimeStamp>{formatDate(comment.created_at)}</TimeStamp>
        </CommentHeader>
        <CommentBody dangerouslySetInnerHTML={getSanitizedContent()} />
      </CommentContent>
    </CommentItem>
  );
};

export default TaskCommentItem; 