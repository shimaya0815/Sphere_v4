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
  const [pastedImages, setPastedImages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [boldText, setBoldText] = useState(false);
  const [italicText, setItalicText] = useState(false);
  
  const commentInputRef = useRef(null);
  const mentionSuggestionsRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // WebSocketの接続と設定 - タスク専用WebSocketエンドポイントを使用
  // プロトコルを自動判定（ブラウザがhttpsなら、wssを使う）
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  
  // WebSocketのURLを構築
  let wsUrl = null;
  if (taskId) {
    // 環境に応じたホスト名を使用
    let wsHost = 'localhost:8001';
    
    // Docker環境の場合はサービス名を使用
    if (process.env.NODE_ENV === 'development') {
      wsHost = 'websocket:8001';
    }
    
    wsUrl = `${wsProtocol}://${wsHost}/ws/tasks/${taskId}/`;
    
    console.log(`Environment: ${process.env.NODE_ENV}, Protocol: ${wsProtocol}, Host: ${wsHost}`);
  }
  console.log(`WebSocket URL for task ${taskId}: ${wsUrl}`);
  
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  
  const { sendMessage, isConnected, connect } = useWebSocket(
    wsUrl,
    {
      onOpen: () => {
        console.log(`Connected to task WebSocket for task ID: ${taskId}`);
        setConnectionError(false);
        setConnectionAttempts(0);
        toast.success('リアルタイム通知に接続しました', { id: 'ws-connected', duration: 2000 });
        
        // 初回Pingは即時送信
        setTimeout(() => {
          if (isConnected) {
            sendMessage(JSON.stringify({
              type: 'ping',
              data: { timestamp: new Date().toISOString() }
            }));
            console.log('Sent initial ping to server');
          }
        }, 500);
        
        // 定期的なPingを送信するインターバルを設定
        const pingInterval = setInterval(() => {
          if (isConnected) {
            sendMessage(JSON.stringify({
              type: 'ping',
              data: { timestamp: new Date().toISOString() }
            }));
            console.log('Sent ping to server');
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // 30秒ごとにPing
        
        // コンポーネントのクリーンアップ時にインターバルをクリア
        return () => clearInterval(pingInterval);
      },
      onMessage: (event) => {
        try {
          // データの正規化（文字列・オブジェクトの両方に対応）
          const data = typeof event === 'string' ? JSON.parse(event) : event;
          
          console.log("Received WebSocket message:", data);
          
          // 接続確立メッセージを受信した場合は接続エラーをクリア
          if (data.type === 'connection_established') {
            console.log('Connection established with server for task', taskId);
            setConnectionError(false);
            setConnectionAttempts(0);
          }
          // コメント追加イベントの場合はコメント一覧を再取得
          else if (data.type === 'comment_added') {
            console.log('Comment added notification received');
            fetchComments();
          }
          // Pingへの応答
          else if (data.type === 'pong') {
            console.log('Received pong from server:', data);
            // 接続が生きていることを確認（エラー状態をクリア）
            if (connectionError) {
              setConnectionError(false);
            }
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      },
      onClose: () => {
        console.log('Disconnected from task WebSocket');
        // 自動的に再接続を試みる
        const newAttempts = connectionAttempts + 1;
        setConnectionAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          setConnectionError(true);
          // エラーメッセージは開発中なので非表示
          // toast.error('通知サーバーへの接続に問題が発生しました', { id: 'ws-error', duration: 3000 });
        }
      },
      onError: (error) => {
        console.error('Task WebSocket error:', error);
        setConnectionError(true);
        
        // エラーメッセージは開発中なので非表示
        // if (connectionAttempts >= 2) {
        //   toast.error('通知サーバーへの接続に問題が発生しました', { id: 'ws-error', duration: 3000 });
        // }
      },
      // 自動再接続設定
      reconnectInterval: 3000,
      reconnectAttempts: 10,
      automaticOpen: true, // 自動接続を有効に
    }
  );
  
  // 明示的な再接続機能
  const handleReconnect = () => {
    // 接続状態に関わらず強制的に再接続を試みる
    console.log('Reconnect button clicked. Current connection state:', isConnected ? 'Connected' : 'Disconnected');
    
    // 現在のWebSocketを明示的に閉じて、新しい接続を作成
    if (wsUrl) {
      connect();  // useWebSocket hookのconnect関数を呼び出し
      console.log('Manual reconnection initiated');
      
      // 開発中はユーザーへの通知を無効化
      // toast('通知サーバーに再接続しています...', { id: 'ws-reconnect' });
      
      setConnectionAttempts(0);
      setConnectionError(false);
    } else {
      console.warn('Cannot reconnect: WebSocket URL not set');
      // toast.error('接続先が設定されていません', { id: 'ws-error-no-url' });
    }
  };

  // 共通のタスクチャンネルを確認・作成する
  useEffect(() => {
    const checkTaskChannel = async () => {
      if (!taskId || !task) return;
      
      try {
        console.log('Checking for common task channel');
        
        // 共通のtaskチャンネルを探す
        const myChannels = await chatApi.getMyChannels();
        let taskChannel = null;
        
        // 既存のチャンネルから「task」を検索（大文字小文字を区別せず）
        if (Array.isArray(myChannels)) {
          for (const workspace of myChannels) {
            if (workspace && Array.isArray(workspace.channels)) {
              const foundChannel = workspace.channels.find(
                c => c && c.name && c.name.toLowerCase() === 'task'
              );
              
              if (foundChannel) {
                taskChannel = foundChannel;
                console.log('Found existing task channel:', taskChannel);
                break;
              }
            }
          }
        } else {
          console.log('Channels data structure is not as expected:', myChannels);
        }
        
        if (!taskChannel) {
          console.log('No task channel found, creating a common one');
          // タスクチャンネルがなければ作成
          const workspace = await chatApi.getDefaultWorkspace();
          
          if (workspace) {
            try {
              taskChannel = await chatApi.createChannel({
                name: 'task',
                description: 'タスク関連の通知や議論のための共通チャンネルです',
                workspace: workspace.id,
                channel_type: 'public'
              });
              
              console.log('Common task channel created:', taskChannel);
              toast.success('タスク用チャンネルを作成しました');
            } catch (createError) {
              console.error('Error creating task channel:', createError);
              // エラーはコンソールに記録するだけで、ユーザーには表示しない
            }
          } else {
            console.error('No default workspace found for task channel creation');
          }
        }
      } catch (error) {
        console.error('Error checking task channel:', error);
      }
    };
    
    // タスクIDとタスクデータがある場合、チャンネル確認を実行
    if (taskId && task) {
      checkTaskChannel();
    }
  }, [taskId, task]);

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
  
  // コメント一覧を取得（useEffect用）
  useEffect(() => {
    if (taskId) {
      fetchComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

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

  // 画像のペースト処理
  const handlePaste = (e) => {
    const clipboardData = e.clipboardData;
    const items = clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); // デフォルトのペースト動作をキャンセル
        
        const blob = items[i].getAsFile();
        const imageUrl = URL.createObjectURL(blob);
        
        // 画像プレビューを追加
        setPastedImages(prev => [...prev, {
          id: Date.now().toString(),
          file: blob,
          url: imageUrl
        }]);
        
        toast.success('画像が追加されました');
      }
    }
  };
  
  // 画像の削除
  const handleRemoveImage = (imageId) => {
    setPastedImages(prev => prev.filter(img => img.id !== imageId));
  };
  
  // ファイル選択ダイアログを開く
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // ファイル選択時の処理
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(file);
        
        // 画像プレビューを追加
        setPastedImages(prev => [...prev, {
          id: Date.now().toString() + i,
          file: file,
          url: imageUrl
        }]);
      }
    }
    
    // ファイル入力をリセット
    e.target.value = '';
    
    toast.success('画像が追加されました');
  };
  
  // リッチテキスト編集
  const insertFormatting = (format) => {
    if (!commentInputRef.current) return;
    
    const textarea = commentInputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newComment;
    
    let formattedText = '';
    let selectionOffset = 0;
    
    switch (format) {
      case 'bold':
        formattedText = text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end);
        selectionOffset = 2;
        break;
      case 'italic':
        formattedText = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
        selectionOffset = 1;
        break;
      case 'code':
        formattedText = text.substring(0, start) + '`' + text.substring(start, end) + '`' + text.substring(end);
        selectionOffset = 1;
        break;
      default:
        return;
    }
    
    setNewComment(formattedText);
    
    // フォーカスを戻す
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(end + selectionOffset * 2, end + selectionOffset * 2);
    }, 10);
  };
  
  // コメント入力時のハンドラ
  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    
    // カーソル位置を取得
    const curPos = e.target.selectionStart;
    
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
    if (!newComment.trim() && pastedImages.length === 0) return;
    
    setSubmitting(true);
    let addedComment;
    let savedComment = newComment; // 送信前にコメント内容を保存
    let imagePreviewUrls = pastedImages.map(img => img.url);
    
    // 楽観的UI更新 - 送信中のコメントを表示
    const tempComment = {
      id: `temp-${Date.now()}`,
      content: savedComment,
      user_name: 'あなた', // 現在のユーザー名は後でAPIから取得
      created_at: new Date().toISOString(),
      isSending: true,
      imageUrls: imagePreviewUrls
    };
    
    // 一時的にコメントを表示
    setComments(prevComments => [tempComment, ...prevComments]);
    setNewComment(''); // 入力欄をクリア
    
    try {
      // FormDataを作成してファイルと一緒に送信
      const formData = new FormData();
      formData.append('task', taskId);
      formData.append('content', savedComment);
      
      // 画像ファイルを追加
      pastedImages.forEach(img => {
        formData.append('files', img.file);
      });
      
      // APIでコメント追加（FormDataを使用）
      addedComment = await tasksApi.addCommentWithFiles(taskId, formData);
      toast.success('コメントが追加されました');
      
      // 添付画像をクリア
      setPastedImages([]);
      
      // 一覧を再取得（一時コメントを実際のコメントで置き換え）
      await fetchComments();
      
      // 少し遅延させてコメント入力欄にスクロールする
      setTimeout(() => {
        commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        commentInputRef.current?.focus();
      }, 100);
      
      // タスク固有のWebSocketにコメント通知を送信
      try {
        if (isConnected) {
          const wsSuccess = sendMessage(JSON.stringify({
            type: 'comment',
            data: {
              task_id: taskId,
              task_title: task?.title || 'タスク',
              comment_id: addedComment.id,
              user_name: addedComment.user_name,
              content: savedComment,
              created_at: new Date().toISOString(),
              has_attachments: pastedImages.length > 0
            }
          }));
          
          if (wsSuccess) {
            console.log('Task comment WebSocket notification sent successfully');
          } else {
            console.warn('Failed to send WebSocket notification, but comment was saved to API');
            // 自動的に再接続を試みる
            if (connectionAttempts < 2) {
              setConnectionAttempts(prev => prev + 1);
              setTimeout(() => {
                console.log('Attempting to reconnect WebSocket after send failure...');
                connect();
              }, 1000);
            }
          }
        } else {
          console.warn('WebSocket not connected, cannot send notification');
          setConnectionError(true);
        }
      } catch (wsError) {
        console.error('Error sending WebSocket notification:', wsError);
        // WebSocketエラーはAPIのコメント保存には影響しない
      }
      
      // コールバック
      onCommentAdded && onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('コメントの追加に失敗しました');
      
      // エラー時は一時コメントを削除
      setComments(prevComments => prevComments.filter(comment => comment.id !== tempComment.id));
      // 入力内容を復元
      setNewComment(savedComment);
      
      // エラー時も画像は保持
      // setPastedImages([...pastedImages]);
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
      {/* WebSocket接続状態表示は非表示（開発中） */}
      {false && connectionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-red-800">リアルタイム更新は現在利用できません</span>
            <button 
              onClick={handleReconnect} 
              className="ml-auto bg-red-600 text-white px-3 py-1 rounded-md text-xs hover:bg-red-700 transition-colors"
            >
              再接続
            </button>
          </div>
        </div>
      )}
      
      {/* 接続成功時の表示（現在は非表示） */}
      {false && isConnected && !connectionError && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-2 text-sm hidden md:block">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 text-xs">リアルタイム通知に接続されています</span>
          </div>
        </div>
      )}

      {/* コメント一覧 */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            まだコメントはありません
          </div>
        ) : (
          // 古いコメントが上、新しいコメントが下に表示
          [...comments].map(comment => (
            <div 
              key={comment.id} 
              className={`bg-gray-50 rounded-lg p-4 ${comment.isSending ? 'opacity-70' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">
                    {comment.user_name?.[0] || 'U'}
                  </div>
                  <div className="ml-3">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {comment.user_name || 'ユーザー'}
                      </p>
                      {comment.isSending && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          送信中...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                </div>
                {!comment.isSending && (
                  <button
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                )}
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
              
              {/* 画像添付がある場合 */}
              {(comment.attachments && comment.attachments.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {comment.attachments.map((attachment, index) => (
                    <a 
                      key={index}
                      href={attachment.file} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative"
                    >
                      <img 
                        src={attachment.file} 
                        alt={`添付${index + 1}`}
                        className="max-w-xs max-h-40 rounded-md shadow-sm border border-gray-200"
                      />
                    </a>
                  ))}
                </div>
              )}
              
              {/* プレビュー用の添付画像 */}
              {comment.imageUrls && comment.imageUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {comment.imageUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`添付${index + 1}`}
                        className="max-w-xs max-h-40 rounded-md shadow-sm border border-gray-200 opacity-70"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-md">
                        <span className="text-white font-medium">
                          送信中...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* コメント入力フォーム */}
      <div className="bg-gray-50 rounded-lg p-4">
        {/* 画像プレビュー表示エリア */}
        {pastedImages.length > 0 && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">添付画像</h4>
            <div className="flex flex-wrap gap-3">
              {pastedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={image.url} 
                    alt={`添付${index + 1}`} 
                    className="w-24 h-24 object-cover rounded border border-gray-300"
                  />
                  <button
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(image.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="relative">
          {/* リッチテキストツールバー */}
          <div className="flex items-center space-x-1 mb-2 bg-white p-1 rounded-t-md border border-gray-300 border-b-0">
            <button
              type="button"
              className={`p-1 rounded ${boldText ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="太字"
              onClick={() => insertFormatting('bold')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.594 10.5c0 1.25-.984 2.297-2.312 2.422l2.375 2.375-1.281 1.281-3.844-3.828v-2.688h1.359c1.187 0 2.141-.891 2.141-2.062 0-1.125-.938-2.016-2.125-2.016H5v10h3.703c2.625 0 4.891-1.594 4.891-4.484 0-1.406-.531-2.625-1.422-3.516l1.422 1.422z"></path>
              </svg>
            </button>
            <button
              type="button" 
              className={`p-1 rounded ${italicText ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="斜体"
              onClick={() => insertFormatting('italic')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 17h-5l.371-1.132H12l-1.329-9H9l-.371-1H14l-.371 1h-1.675l1.330 9h1.344L15 17z"></path>
              </svg>
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-100"
              title="コード"
              onClick={() => insertFormatting('code')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="border-l border-gray-300 h-6 mx-1"></div>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-100"
              title="メンション"
              onClick={() => {
                setNewComment(prev => prev + '@');
                commentInputRef.current.focus();
              }}
            >
              <HiOutlineAtSymbol className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-100"
              title="ファイルを添付"
              onClick={handleFileButtonClick}
            >
              <HiOutlinePaperClip className="h-5 w-5" />
            </button>
            {/* 非表示のファイル入力 */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="relative flex-1">
              <textarea
                ref={commentInputRef}
                rows="3"
                className="block w-full px-3 py-2 border border-gray-300 rounded-b-md rounded-tr-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="コメントを入力... @でメンション、画像はペーストで添付できます"
                value={newComment}
                onChange={handleCommentChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
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
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                submitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              disabled={submitting || (!newComment.trim() && pastedImages.length === 0)}
            >
              <HiOutlinePaperAirplane className="-ml-1 mr-2 h-5 w-5 transform rotate-90" />
              送信
            </button>
          </div>
        </div>
        
        {/* ヘルプテキスト */}
        <div className="mt-2 text-xs text-gray-500">
          <p>@でメンション、画像はクリップボードからペースト、**太字**、*斜体*、`コード`などの書式が使えます。</p>
        </div>
      </div>
    </div>
  );
};

export default TaskComments;