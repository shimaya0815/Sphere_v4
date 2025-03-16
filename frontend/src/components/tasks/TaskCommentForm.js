import React, { useState, useRef, useCallback, useEffect } from 'react';
import { HiOutlinePaperAirplane, HiOutlinePaperClip } from 'react-icons/hi';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import { 
  quillModules, 
  quillFormats, 
  MENTION_REGEX, 
  findMentionCandidates, 
  extractMentionedUserIds,
  dataURLtoBlob,
  extractBase64Images 
} from './TaskCommentsUtils';
import tasksApi from '../../api/tasks';
import usersApi from '../../api/users';
import MentionUsersList from './MentionUsersList';

// エディタのカスタムスタイルをインポート
import './TaskCommentsStyles';

const TaskCommentForm = ({ taskId, onCommentAdded, submitting, setSubmitting }) => {
  const [newComment, setNewComment] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  const [pastedImages, setPastedImages] = useState([]);
  const [users, setUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionCandidates, setMentionCandidates] = useState([]);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [editorReady, setEditorReady] = useState(false);
  
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // エディタの初期化確認
  useEffect(() => {
    const timer = setTimeout(() => {
      setEditorReady(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  // ペースト処理のハンドラー
  const handlePaste = useCallback((e) => {
    const clipboardData = e.clipboardData;
    const items = clipboardData.items;
    let hasImage = false;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        hasImage = true;
        e.preventDefault(); // デフォルトの貼り付けをキャンセル
        
        const blob = items[i].getAsFile();
        const imageUrl = URL.createObjectURL(blob);
        
        // 画像サイズのチェック（最大5MBまで）
        if (blob.size > 5 * 1024 * 1024) {
          toast.error('画像サイズが大きすぎます（最大5MB）');
          return;
        }
        
        // Quillエディタのインスタンスを取得
        const quill = quillRef.current.getEditor();
        if (quill) {
          // 現在のカーソル位置を取得
          const range = quill.getSelection();
          const position = range ? range.index : quill.getLength();
          
          // 画像をエディタに直接挿入（カスタムスタイル付き）
          quill.insertEmbed(position, 'image', imageUrl);
          
          // 挿入した画像要素を取得して最大幅を設定
          setTimeout(() => {
            const imageElements = quill.root.querySelectorAll('img');
            
            // 最後に挿入された画像（通常は最後の要素）を取得
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
          
          // Base64形式に変換してHTMLに埋め込む
          const reader = new FileReader();
          reader.onload = function(event) {
            const base64Data = event.target.result;
            // 既存のURLを置き換え
            const editorContent = quill.root.innerHTML;
            const updatedContent = editorContent.replace(imageUrl, base64Data);
            quill.root.innerHTML = updatedContent;
            
            // HTMLの更新をStateにも反映
            setEditorHtml(updatedContent);
          };
          reader.readAsDataURL(blob);
          
          toast.success('画像がコメントに挿入されました');
        } else {
          // エディタが使用できない場合は従来の方法で画像を添付
          setPastedImages(prev => [...prev, {
            id: Date.now().toString(),
            file: blob,
            url: imageUrl
          }]);
          toast.success('画像が添付されました');
        }
      }
    }
    
    // 画像以外のペーストはQuillのデフォルト処理に任せる
  }, []);
  
  // Quill初期化後のクリップボード設定
  const setupClipboardHandler = useCallback(() => {
    if (quillRef.current) {
      try {
        const quill = quillRef.current.getEditor();
        if (quill && quill.root) {
          // 既存のリスナーを削除してから追加（重複防止）
          quill.root.removeEventListener('paste', handlePaste);
          quill.root.addEventListener('paste', handlePaste);
          console.log('Paste event listener setup for Quill editor');
        }
      } catch (error) {
        console.error('Error setting up clipboard handler:', error);
      }
    }
  }, [handlePaste]);
  
  // コンポーネントマウント時とエディタ準備完了時の処理
  useEffect(() => {
    if (editorReady) {
      // エディタの設定を追加
      setupClipboardHandler();
      
      // エディタのツールバーが見えるようにスタイル調整
      const fixQuillToolbar = () => {
        const toolbarElement = document.querySelector('.ql-toolbar');
        if (toolbarElement) {
          toolbarElement.style.display = 'flex';
          toolbarElement.style.visibility = 'visible';
          toolbarElement.style.opacity = '1';
        }
      };
      
      // 少し遅延を入れてDOM要素が確実に存在するようにする
      setTimeout(fixQuillToolbar, 100);
    }
    
    return () => {
      // クリーンアップ処理
      if (quillRef.current) {
        try {
          const quill = quillRef.current.getEditor();
          if (quill && quill.root) {
            quill.root.removeEventListener('paste', handlePaste);
          }
        } catch (err) {
          // エラーハンドリング
        }
      }
    };
  }, [setupClipboardHandler, handlePaste, editorReady]);
  
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
    
    // Quillエディタのインスタンスを取得
    const quill = quillRef.current?.getEditor();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        // 画像サイズのチェック（最大5MBまで）
        if (file.size > 5 * 1024 * 1024) {
          toast.error('画像サイズが大きすぎます（最大5MB）');
          continue;
        }
        
        if (quill) {
          // 画像をエディタに直接挿入する
          const reader = new FileReader();
          reader.onload = function(event) {
            const base64Data = event.target.result;
            // 現在のカーソル位置を取得
            const range = quill.getSelection();
            const position = range ? range.index : quill.getLength();
            
            // 画像をエディタに挿入
            quill.insertEmbed(position, 'image', base64Data);
            
            // 挿入した画像要素を取得して最大幅を設定
            setTimeout(() => {
              const imageElements = quill.root.querySelectorAll('img');
              
              // 最後に挿入された画像（通常は最後の要素）を取得
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
            
            // HTMLの更新をStateにも反映
            setEditorHtml(quill.root.innerHTML);
          };
          reader.readAsDataURL(file);
          toast.success('画像がコメントに挿入されました');
        } else {
          // エディタが使用できない場合は従来の方法で画像を添付
          const imageUrl = URL.createObjectURL(file);
          setPastedImages(prev => [...prev, {
            id: Date.now().toString() + i,
            file: file,
            url: imageUrl
          }]);
          toast.success('画像が添付されました');
        }
      }
    }
    
    // ファイル入力をリセット
    e.target.value = '';
  };
  
  // エディターの変更ハンドラー
  const handleEditorChange = (content, delta, source, editor) => {
    if (editor) {
      setEditorHtml(content);
      // プレーンテキスト形式も保持（API送信用）
      const plainText = editor.getText().trim();
      setNewComment(plainText);
      checkForMentions(plainText);
    }
  };

  // ユーザー情報を取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('Fetching users for mention feature...');
        const response = await usersApi.getBusinessUsers();
        
        // さまざまな形式のレスポンスに対応
        let userData = [];
        
        if (response) {
          if (Array.isArray(response)) {
            userData = response;
          } else if (response.data && Array.isArray(response.data)) {
            userData = response.data;
          } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
            userData = response.data.results;
          }
        }
        
        console.log(`Loaded ${userData.length} users for mention feature`);
        
        // デモユーザーを追加（テスト用）
        if (userData.length === 0) {
          userData = [
            { id: 1, username: 'admin', first_name: '管理者', last_name: 'ユーザー' },
            { id: 2, username: 'worker1', first_name: '担当者', last_name: '1' },
            { id: 3, username: 'worker2', first_name: '担当者', last_name: '2' },
          ];
          console.log('Using demo users for mention feature');
        }
        
        setUsers(userData);
      } catch (error) {
        console.error('ユーザー一覧の取得に失敗しました:', error);
        
        // エラー時はデモユーザーを使用
        const demoUsers = [
          { id: 1, username: 'admin', first_name: '管理者', last_name: 'ユーザー' },
          { id: 2, username: 'worker1', first_name: '担当者', last_name: '1' },
          { id: 3, username: 'worker2', first_name: '担当者', last_name: '2' },
        ];
        setUsers(demoUsers);
        console.log('Using demo users due to API error');
      }
    };

    fetchUsers();
  }, []);

  // メンションのチェック
  const checkForMentions = (text) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection) return;

    const cursorPosition = selection.index;
    const textBeforeCursor = editor.getText(0, cursorPosition);
    
    console.log('Checking for mentions at position:', cursorPosition);
    console.log('Text before cursor:', textBeforeCursor);
    
    // @マークから現在のカーソル位置までをチェック
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    if (lastAtSymbol === -1) {
      setMentionCandidates([]);
      return;
    }
    
    // @マークから現在位置までのテキストを抽出し、スペースが含まれていないか確認
    const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
    const hasSpace = textAfterAt.includes(' ');
    
    console.log('Text after @ symbol:', textAfterAt);
    console.log('Has space after @:', hasSpace);
    
    // スペースが見つかった場合かつ@直後でない場合は、メンション入力が終了したと判断
    if (hasSpace && textAfterAt.length > 0) {
      setMentionCandidates([]);
      return;
    }

    // メンションクエリを抽出（@の後の文字列）
    const query = textAfterAt;
    setMentionQuery(query);
    console.log('Mention query:', query);

    // クエリに一致するユーザーを検索
    const candidates = findMentionCandidates(query, users);
    console.log('Found mention candidates:', candidates.length);
    setMentionCandidates(candidates);

    // メンションリストの位置を計算
    const bounds = editor.getBounds(lastAtSymbol);
    const quillContainer = document.querySelector('.quill-container');
    const quillContainerRect = quillContainer?.getBoundingClientRect();
    const editorRect = editor.root.getBoundingClientRect();
    
    // エディタの絶対位置から計算（固定位置のための計算）
    const editorTop = editorRect.top;
    const editorLeft = editorRect.left;
    
    // カーソル位置を絶対位置で計算
    const absoluteTop = editorTop + bounds.top + bounds.height + 10; // @マークの下に表示
    const absoluteLeft = editorLeft + bounds.left;
    
    console.log('Editor rect:', editorRect);
    console.log('Bounds:', bounds);
    console.log('Absolute position:', { top: absoluteTop, left: absoluteLeft });
    
    setMentionPosition({
      top: absoluteTop,
      left: absoluteLeft
    });
  };

  // メンションユーザーの選択
  const handleSelectMention = (user) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection) return;

    const cursorPosition = selection.index;
    const textBeforeCursor = editor.getText(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      // @マークからカーソル位置までを削除
      editor.deleteText(lastAtSymbol, cursorPosition - lastAtSymbol);
      
      // ユーザー名を挿入（@付き）
      const userFullName = user.get_full_name || 
                          `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                          user.email || 
                          user.username;
      
      editor.insertText(lastAtSymbol, `@${userFullName} `, {
        color: '#4a86e8',
        background: 'rgba(74, 134, 232, 0.1)',
        bold: true
      });
      
      // フォーカスを戻す
      editor.focus();
      
      // メンションされたユーザーを記録
      setMentionedUsers((prev) => {
        // 重複を避ける
        if (!prev.some(u => u.id === user.id)) {
          return [...prev, user];
        }
        return prev;
      });
    }
    
    // メンション候補をクリア
    setMentionCandidates([]);
  };

  // メンション候補を閉じる
  const closeMentionCandidates = () => {
    setMentionCandidates([]);
  };

  // コメント送信
  const handleSubmit = async (e) => {
    if (e) e.preventDefault(); // イベントが存在する場合は、デフォルトの動作を明示的に防止
    
    if (!newComment.trim() && !editorHtml && pastedImages.length === 0) {
      toast.error('コメント内容または画像を入力してください');
      return;
    }
    
    setSubmitting(true);
    let savedComment = newComment; // プレーンテキスト
    let savedHtml = editorHtml; // HTML形式
    
    // デバッグログ: 送信前のデータを確認
    console.log('Submit data check:');
    console.log('taskId:', taskId);
    console.log('savedComment:', savedComment);
    console.log('savedHtml:', savedHtml);
    
    // 空のHTMLコンテンツをチェック（Quillが<p><br></p>のような空要素を生成する場合がある）
    if (!savedHtml || savedHtml === '<p><br></p>' || savedHtml === '<p></p>') {
      console.log('Empty HTML content detected, generating from plain text');
      savedHtml = `<p>${newComment.replace(/\n/g, '</p><p>')}</p>`;
    }
    
    try {
      // メンションされたユーザーのIDを抽出
      const mentionedUserIds = extractMentionedUserIds(mentionedUsers);
      
      // FormDataを作成してファイルと一緒に送信
      const formData = new FormData();
      
      // taskとcontentは必須フィールドなので、値を確認
      if (!taskId) {
        console.error('タスクIDが不正です:', taskId);
        toast.error('タスクIDが不正です。ページを再読み込みしてください。');
        setSubmitting(false);
        return;
      }
      
      if (!savedComment && !pastedImages.length) {
        console.error('コメント内容が空です');
        toast.error('コメント内容を入力してください');
        setSubmitting(false);
        return;
      }
      
      formData.append('task', taskId);
      formData.append('content', savedComment || '画像コメント'); // コンテンツが空の場合はプレースホルダーを使用
      
      // FormDataに追加されているかを確認（デバッグ用）
      console.log('FormData values:');
      console.log('task:', formData.get('task'));
      console.log('content:', formData.get('content'));
      
      // HTML形式のコンテンツを送信
      formData.append('html_content', savedHtml);
      console.log('html_content:', formData.get('html_content'));
      
      // Base64エンコードされた画像を抽出（HTML内に埋め込まれた画像）
      const base64Images = extractBase64Images(savedHtml);
      console.log(`Extracted ${base64Images.length} base64 images from HTML content`);
      
      // メンションされたユーザーIDを追加
      if (mentionedUserIds.length > 0) {
        console.log('Adding mentioned user IDs:', mentionedUserIds);
        mentionedUserIds.forEach(userId => {
          formData.append('mentioned_users', userId.toString());
        });
        
        // デバッグ用：すべてのmentioned_usersが追加されたか確認
        const mentionedValues = formData.getAll('mentioned_users');
        console.log('All mentioned_users in FormData:', mentionedValues);
      }
      
      // 添付ファイルとして追加されている画像ファイルを追加
      if (pastedImages.length > 0) {
        console.log(`Adding ${pastedImages.length} attachment images to FormData`);
        pastedImages.forEach((img, index) => {
          formData.append('files', img.file);
          console.log(`Added image ${index + 1}: ${img.file.name} (${img.file.type}, ${img.file.size} bytes)`);
        });
      }
      
      // FormDataの全エントリをデバッグ表示（ファイル以外）
      console.log('FormData entries:');
      for (let pair of formData.entries()) {
        // ファイルオブジェクトは大きすぎるのでスキップ
        if (pair[1] instanceof File) {
          console.log(pair[0], ':', '[File object]', pair[1].name, pair[1].size, 'bytes');
        } else {
          console.log(pair[0], ':', pair[1]);
        }
      }
      
      // コメントを送信
      console.log('送信開始: addCommentWithFiles API呼び出し');
      const addedComment = await tasksApi.addCommentWithFiles(taskId, formData);
      console.log('API応答:', addedComment);
      
      // 成功時の処理
      toast.success('コメントが追加されました');
      
      // フォームをクリア
      setNewComment('');
      setEditorHtml('');
      setPastedImages([]);
      setMentionedUsers([]);
      
      // 親コンポーネントにコメント追加を通知
      if (onCommentAdded) {
        onCommentAdded(addedComment);
      }
      
      setSubmitting(false);
    } catch (error) {
      console.error('コメントの送信に失敗しました:', error);
      // エラーの詳細情報を表示
      if (error.response) {
        console.error('エラーレスポンス:', error.response.data);
        console.error('エラーステータス:', error.response.status);
        // ユーザーにわかりやすいメッセージを表示
        toast.error(`コメントの送信に失敗しました (${error.response.status}): サーバーエラーが発生しました`);
      } else if (error.request) {
        // リクエストは送信されたがレスポンスがない場合
        console.error('リクエストエラー:', error.request);
        toast.error('コメントの送信に失敗しました: サーバーから応答がありません');
      } else {
        // リクエスト設定中にエラーが発生した場合
        toast.error('コメントの送信に失敗しました: ' + error.message);
      }
      setSubmitting(false);
    }
  };

  // キー入力イベント
  const handleKeyDown = (e) => {
    // Ctrl + Enter でコメント送信
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit();
    }
    
    // メンション候補が表示されていない場合は何もしない
    if (mentionCandidates.length === 0) return;
    
    // メンション候補の操作はMentionUsersListコンポーネントで処理
  };

  return (
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
        {/* ファイル添付の非表示入力 */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
        
        {/* リッチテキストエディタ */}
        <div className="flex items-start space-x-3">
          <div className="relative flex-1">
            <div className="quill-container relative" style={{ minHeight: '150px' }}>
              {editorReady && (
                <ReactQuill
                  ref={quillRef}
                  value={editorHtml}
                  onChange={handleEditorChange}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="コメントを入力..."
                  theme="snow"
                  className="quill-editor"
                  readOnly={submitting}
                  onKeyDown={handleKeyDown}
                />
              )}
              
              {/* メンション候補リスト - エディタ内に配置 */}
              {mentionCandidates.length > 0 && (
                <MentionUsersList
                  users={mentionCandidates}
                  position={mentionPosition}
                  onSelect={handleSelectMention}
                  onClose={closeMentionCandidates}
                />
              )}
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleSubmit}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              submitting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            disabled={submitting}
            style={{ marginTop: '15px' }} // エディタのツールバーと揃える
          >
            <HiOutlinePaperAirplane className="-ml-1 mr-2 h-5 w-5 transform rotate-90" />
            送信
          </button>
        </div>
        
        {/* 編集ツールバー */}
        <div className="mt-2 flex space-x-2">
          <button
            type="button"
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
            onClick={handleFileButtonClick}
            title="画像を添付"
          >
            <HiOutlinePaperClip className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* ヘルプテキスト */}
      <div className="mt-2 text-xs text-gray-500">
        <p>画像はクリップボードからペースト、**太字**、*斜体*、`コード`などの書式が使えます。</p>
      </div>
    </div>
  );
};

export default TaskCommentForm; 