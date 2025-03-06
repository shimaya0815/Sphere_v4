import React, { useState, useEffect, useRef } from 'react';
import { HiOutlinePaperAirplane, HiOutlineTrash, HiOutlineAtSymbol, HiOutlinePaperClip } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { tasksApi, usersApi, chatApi } from '../../api';
import useWebSocket from '../../hooks/useWebSocket';

const TaskComments = ({ taskId, task, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQueryStart, setMentionQueryStart] = useState(-1);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [taskChannel, setTaskChannel] = useState(null);
  
  const commentInputRef = useRef(null);
  const mentionSuggestionsRef = useRef(null);
  
  // WebSocketの接続と設定 - 一時的に無効化
  /*
  const { sendMessage } = useWebSocket(
    taskChannel ? `ws://localhost:8001/ws/chat/${taskChannel.id}/` : null,
    {
      onOpen: () => console.log(`Connected to task channel: ${taskChannel?.id}`),
      onMessage: (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message' && data.data.task_id === taskId) {
          // リアルタイムコメント更新
          fetchComments();
        }
      },
      onClose: () => console.log('Disconnected from task channel')
    }
  );
  */
  // ダミーの関数を定義（エラー回避のため）
  const sendMessage = () => console.log('WebSocket disabled');

  // タスク用のチャットチャンネルを探すか作成する - 一時的に無効化
  /*
  useEffect(() => {
    const initializeTaskChannel = async () => {
      if (!taskId || !task) return;
      
      try {
        // タスク名をチャンネル名として使用するためのプレフィックス
        const channelPrefix = `task-${taskId}-`;
        
        // 既存のタスクチャンネルを探す
        const myChannels = await chatApi.getMyChannels();
        let taskChan = null;
        
        for (const workspaceChannels of myChannels) {
          const foundChannel = workspaceChannels.channels.find(
            c => c.name.startsWith(channelPrefix)
          );
          
          if (foundChannel) {
            taskChan = foundChannel;
            break;
          }
        }
        
        if (!taskChan) {
          // タスクチャンネルがなければ作成
          const workspace = await chatApi.getDefaultWorkspace();
          
          if (workspace) {
            // チャンネル名は "task-{タスクID}-{タスクタイトル}" の形式
            const channelName = `${channelPrefix}${task.title.substring(0, 30)}`;
            
            taskChan = await chatApi.createChannel({
              name: channelName,
              description: `タスク「${task.title}」の連携チャンネル`,
              workspace: workspace.id,
              channel_type: 'private'
            });
            
            // タスクの担当者をメンバーに追加
            if (task.worker_data && task.worker_data.id) {
              await chatApi.addChannelMember(taskChan.id, task.worker_data.id);
            }
            
            if (task.reviewer_data && task.reviewer_data.id) {
              await chatApi.addChannelMember(taskChan.id, task.reviewer_data.id);
            }
            
            console.log('タスクチャンネルを作成しました:', taskChan);
          }
        }
        
        setTaskChannel(taskChan);
        
      } catch (error) {
        console.error('タスクチャンネルの初期化エラー:', error);
      }
    };
    
    initializeTaskChannel();
  }, [taskId, task]);
  */

  // ビジネス内のユーザー一覧を取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const currentUser = await usersApi.getCurrentUser();
        if (currentUser && currentUser.business) {
          const businessUsers = await usersApi.getBusinessUsers(currentUser.business);
          setUsers(Array.isArray(businessUsers) ? businessUsers : businessUsers.results || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, []);

  // コメント一覧を取得
  useEffect(() => {
    fetchComments();
  }, [taskId]);

  // コメント一覧を取得
  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await tasksApi.getComments(taskId);
      setComments(data.results || data);
      setError(null);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('コメントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // メンション候補を処理
  useEffect(() => {
    if (mentionQuery && mentionQuery.length > 0) {
      const filteredUsers = users.filter(user => {
        const fullName = user.get_full_name || user.email || '';
        return fullName.toLowerCase().includes(mentionQuery.toLowerCase());
      }).slice(0, 5); // 最大5人まで表示
      
      setMentionSuggestions(filteredUsers);
      setShowMentionSuggestions(filteredUsers.length > 0);
    } else {
      setShowMentionSuggestions(false);
    }
  }, [mentionQuery, users]);

  // コメント入力時のハンドラ
  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    
    // カーソル位置を更新
    const curPos = e.target.selectionStart;
    setCursorPosition(curPos);
    
    // @が入力されているか確認
    const textUntilCursor = value.substring(0, curPos);
    const lastAtPos = textUntilCursor.lastIndexOf('@');
    
    if (lastAtPos !== -1) {
      // @の直後またはスペースがない場合は、メンション候補を表示
      const textAfterAt = textUntilCursor.substring(lastAtPos + 1);
      const hasSpace = textAfterAt.includes(' ');
      
      if (!hasSpace && lastAtPos !== -1) {
        setMentionQueryStart(lastAtPos);
        setMentionQuery(textAfterAt);
        return;
      }
    }
    
    // それ以外の場合はメンション候補を非表示
    setShowMentionSuggestions(false);
    setMentionQueryStart(-1);
    setMentionQuery('');
  };

  // メンション候補選択時のハンドラ
  const handleSelectMention = (user) => {
    const userName = user.get_full_name || user.email || user.username;
    
    // メンション候補を名前に置き換え
    const beforeMention = newComment.substring(0, mentionQueryStart);
    const afterMention = newComment.substring(mentionQueryStart + mentionQuery.length + 1);
    const updatedComment = `${beforeMention}@${userName} ${afterMention}`;
    
    setNewComment(updatedComment);
    setShowMentionSuggestions(false);
    setMentionQueryStart(-1);
    setMentionQuery('');
    
    // フォーカスを戻す
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  // 特殊キー処理
  const handleKeyDown = (e) => {
    // メンション候補が表示されている場合
    if (showMentionSuggestions) {
      // 上下キーによる選択
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // 選択処理を実装（複雑なため今回は省略）
      }
      
      // Enterキーによる選択決定
      else if (e.key === 'Enter' && mentionSuggestions.length > 0) {
        e.preventDefault();
        handleSelectMention(mentionSuggestions[0]);
      }
      
      // Escキーによるキャンセル
      else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionSuggestions(false);
      }
    }
  };

  // コメント送信
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    try {
      // APIでコメント追加
      const addedComment = await tasksApi.addComment(taskId, { content: newComment });
      setNewComment('');
      toast.success('コメントが追加されました');
      
      // コメント一覧を再取得
      fetchComments();
      
      // タスクチャンネルにもメッセージを送信 - 一時的に無効化
      /*
      if (taskChannel) {
        // WebSocketでメッセージ送信
        sendMessage(JSON.stringify({
          type: 'chat_message',
          data: {
            task_id: taskId,
            message: newComment,
            user_id: addedComment.user,
            user_name: addedComment.user_name,
            timestamp: new Date().toISOString()
          }
        }));
        
        // チャットAPIでもメッセージを保存
        await chatApi.sendMessage({
          channel: taskChannel.id,
          content: `[タスクコメント] ${newComment}`
        });
      }
      */
      
      // コールバック
      onCommentAdded && onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('コメントの追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // コメント削除
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('このコメントを削除してもよろしいですか？')) {
      return;
    }

    try {
      await tasksApi.deleteComment(commentId);
      toast.success('コメントが削除されました');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('コメントの削除に失敗しました');
    }
  };

  // 日付フォーマット
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
      return dateString;
    }
  };

  // コメント内のメンションをハイライト
  const highlightMentions = (content) => {
    if (!content) return '';
    
    // メンションパターン検索
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    
    // コンテンツを分割してメンションをスタイル適用
    let lastIndex = 0;
    const parts = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      // メンション前のテキスト
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      // メンションテキスト
      parts.push(
        <span key={match.index} className="text-blue-600 font-medium">
          {match[0]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // 残りのテキスト
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts;
  };

  // ローディング表示
  if (loading && comments.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // エラー表示
  if (error && comments.length === 0) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* チャンネル情報表示 - 一時的に無効化
      {taskChannel && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-medium text-blue-800">チャットチャンネル: </span>
            <span className="ml-1 text-blue-600">{taskChannel.name}</span>
            <a 
              href={`/chat/channel/${taskChannel.id}`} 
              className="ml-auto text-blue-600 hover:text-blue-800 underline text-xs"
              target="_blank"
              rel="noopener noreferrer"
            >
              チャットで開く
            </a>
          </div>
        </div>
      )}
      */}

      {/* コメント一覧 */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            まだコメントはありません
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">
                    {comment.user_name?.[0] || 'U'}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {comment.user_name || 'ユーザー'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 hover:text-red-500"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                {highlightMentions(comment.content)}
              </div>
              
              {/* メンション情報（あれば表示） */}
              {comment.mentioned_user_names && comment.mentioned_user_names.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {comment.mentioned_user_names.map((name, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      @{name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* コメント入力フォーム */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="relative">
          <div className="flex items-start space-x-3">
            <div className="relative flex-1">
              <textarea
                ref={commentInputRef}
                rows="3"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="コメントを入力... @でメンション"
                value={newComment}
                onChange={handleCommentChange}
                onKeyDown={handleKeyDown}
                disabled={submitting}
              ></textarea>
              
              {/* メンション候補 */}
              {showMentionSuggestions && (
                <div 
                  ref={mentionSuggestionsRef}
                  className="absolute z-10 mt-1 w-60 bg-white rounded-md shadow-lg border border-gray-200"
                >
                  <ul className="py-1">
                    {mentionSuggestions.map(user => (
                      <li 
                        key={user.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => handleSelectMention(user)}
                      >
                        <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-xs mr-2">
                          {(user.get_full_name || user.email || '')[0]}
                        </div>
                        <span>{user.get_full_name || user.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="absolute bottom-2 left-2 flex space-x-2 text-gray-400">
                <button
                  type="button"
                  className="hover:text-primary-500 focus:outline-none"
                  title="メンション"
                  onClick={() => {
                    setNewComment(prev => prev + '@');
                    commentInputRef.current.focus();
                  }}
                >
                  <HiOutlineAtSymbol className="h-5 w-5" />
                </button>
                {/* ファイル添付ボタン（後で実装） */}
                <button
                  type="button"
                  className="hover:text-primary-500 focus:outline-none"
                  title="ファイルを添付"
                  onClick={() => toast.info('ファイル添付機能は開発中です')}
                >
                  <HiOutlinePaperClip className="h-5 w-5" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                submitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              disabled={submitting || !newComment.trim()}
            >
              <HiOutlinePaperAirplane className="-ml-1 mr-2 h-5 w-5 transform rotate-90" />
              送信
            </button>
          </div>
        </div>
        
        {/* ヘルプテキスト */}
        <div className="mt-2 text-xs text-gray-500">
          <p>@で始めてユーザーをメンションできます。メンションされたユーザーには通知が送信されます。</p>
        </div>
      </div>
    </div>
  );
};

export default TaskComments;