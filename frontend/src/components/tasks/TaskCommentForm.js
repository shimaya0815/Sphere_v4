import React, { useState, useRef, useCallback, useEffect } from 'react';
import { HiOutlinePaperAirplane, HiOutlinePaperClip } from 'react-icons/hi';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import { quillModules, quillFormats } from './TaskCommentsUtils';

const TaskCommentForm = ({ taskId, onCommentAdded, submitting, setSubmitting }) => {
  const [newComment, setNewComment] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  const [pastedImages, setPastedImages] = useState([]);
  
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // ペースト処理のハンドラー
  const handlePaste = useCallback((e) => {
    const clipboardData = e.clipboardData;
    const items = clipboardData.items;
    let hasImage = false;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        hasImage = true;
        
        const blob = items[i].getAsFile();
        const imageUrl = URL.createObjectURL(blob);
        
        // 画像プレビューを追加
        setPastedImages(prev => [...prev, {
          id: Date.now().toString(),
          file: blob,
          url: imageUrl
        }]);
      }
    }
    
    // 画像がペーストされた場合のみデフォルト動作をキャンセル
    if (hasImage) {
      e.preventDefault();
      toast.success('画像が追加されました');
    }
    
    // テキストのペーストはそのまま通常通り処理
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
  
  // Quillエディタの初期化を確認
  useEffect(() => {
    // コンポーネントマウント後に少し遅延させてQuillを初期化
    const timer = setTimeout(() => {
      try {
        if (quillRef.current) {
          console.log('Quill ref is available, initializing editor');
          const quill = quillRef.current.getEditor();
          
          if (quill) {
            console.log('Quill editor initialized successfully');
            
            // ツールバーが表示されるよう強制的にスタイルを適用
            const toolbarElement = document.querySelector('.ql-toolbar');
            if (toolbarElement) {
              toolbarElement.style.display = 'block';
              toolbarElement.style.visibility = 'visible';
            }
          }
        }
      } catch (error) {
        console.error('Error initializing Quill editor:', error);
      }
    }, 300);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  // 初期化設定をセットアップ - リスナーの設定
  useEffect(() => {
    // 初期化時のみリスナーを設定
    setupClipboardHandler();
    
    return () => {
      // コンポーネントのアンマウント時にリスナーを削除
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
  }, [setupClipboardHandler, handlePaste]);
  
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
  
  // エディターの変更ハンドラー
  const handleEditorChange = (content, delta, source, editor) => {
    if (editor) {
      setEditorHtml(content);
      // プレーンテキスト形式も保持（API送信用）
      const plainText = editor.getText().trim();
      setNewComment(plainText);
    }
  };

  // コメント送信
  const handleSubmit = async (e) => {
    if (e) e.preventDefault(); // イベントが存在する場合は、デフォルトの動作を明示的に防止
    
    // コメント内容とファイル添付のどちらかがあれば送信可能
    if ((!newComment.trim() && !editorHtml) && pastedImages.length === 0) {
      toast.error('コメント内容または画像を入力してください');
      return;
    }
    
    setSubmitting(true);
    let savedComment = newComment; // プレーンテキスト
    let savedHtml = editorHtml; // HTML形式
    
    // 空のHTMLコンテンツをチェック（Quillが<p><br></p>のような空要素を生成する場合がある）
    if (!savedHtml || savedHtml === '<p><br></p>' || savedHtml === '<p></p>') {
      console.log('Empty HTML content detected, generating from plain text');
      savedHtml = `<p>${newComment.replace(/\n/g, '</p><p>')}</p>`;
    }
    
    // イメージのURLリスト（プレビュー用）
    const imagePreviewUrls = pastedImages.map(img => img.url);
    
    try {
      // FormDataを作成してファイルと一緒に送信
      const formData = new FormData();
      formData.append('task', taskId);
      formData.append('content', savedComment);
      
      // 必ずHTML形式のコンテンツも送信
      if (savedHtml && savedHtml.trim() !== '') {
        formData.append('html_content', savedHtml);
      } else {
        const generatedHtml = `<p>${savedComment.replace(/\n/g, '</p><p>')}</p>`;
        formData.append('html_content', generatedHtml);
      }
      
      // 画像ファイルを追加
      if (pastedImages.length > 0) {
        pastedImages.forEach(img => {
          formData.append('files', img.file);
        });
      }
      
      // 親コンポーネントにコメント情報とFormDataを渡す
      onCommentAdded({
        content: savedComment,
        html_content: savedHtml,
        imageUrls: imagePreviewUrls
      }, formData);
      
      // フォームをリセット
      resetForm();
      
    } catch (error) {
      console.error('Error preparing comment form data:', error);
      toast.error('コメントの準備中にエラーが発生しました');
      setSubmitting(false);
    }
  };

  // フォームリセット
  const resetForm = () => {
    setNewComment('');
    setEditorHtml('');
    setPastedImages([]);
    
    // エディタの内容をクリア
    if (quillRef.current) {
      try {
        const editor = quillRef.current.getEditor();
        editor.setContents([]);
      } catch (error) {
        console.error('エディタのリセットに失敗:', error);
      }
    }
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
            <div className="quill-container" style={{ minHeight: '150px' }}>
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
              />
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