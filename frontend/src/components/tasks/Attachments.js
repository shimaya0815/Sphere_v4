import React, { useState, useEffect, useCallback } from 'react';
import { 
  HiOutlinePaperClip,
  HiOutlineDocumentDuplicate,
  HiOutlinePhotograph,
  HiOutlineDocument,
  HiDownload,
  HiOutlineTrash
} from 'react-icons/hi';
import { tasksApi } from '../../api';
import toast from 'react-hot-toast';

/**
 * ファイルタイプに基づいてアイコンを返す
 * @param {string} fileType ファイルタイプ
 * @returns {JSX.Element} アイコン
 */
const getFileIcon = (fileType) => {
  if (!fileType) return <HiOutlineDocument size={24} />;
  
  if (fileType.startsWith('image/')) {
    return <HiOutlinePhotograph size={24} />;
  } else if (fileType.includes('pdf')) {
    return <HiOutlineDocumentDuplicate size={24} />;
  } else {
    return <HiOutlineDocument size={24} />;
  }
};

/**
 * ファイルサイズのフォーマット
 * @param {number} bytes バイト数
 * @returns {string} フォーマット済みサイズ
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * タスク添付ファイルコンポーネント
 * @param {object} props props
 * @param {number} props.taskId タスクID
 */
const Attachments = ({ taskId }) => {
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // 添付ファイル一覧を取得
  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      // APIが実際に存在することを前提としています
      // 実際の実装では適切なAPIエンドポイントに置き換えてください
      const data = await tasksApi.getAttachments(taskId);
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast.error('添付ファイルの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);
  
  // コンポーネントマウント時とタスクID変更時に添付ファイルを取得
  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);
  
  // ファイルアップロード処理
  const handleFileUpload = async (files) => {
    if (!taskId || !files || files.length === 0) return;
    
    // FormDataの作成
    const formData = new FormData();
    formData.append('task', taskId);
    
    // 複数ファイルに対応
    Array.from(files).forEach(file => {
      formData.append('file', file);
    });
    
    try {
      // APIが実際に存在することを前提としています
      // 実際の実装では適切なAPIエンドポイントに置き換えてください
      const uploadedAttachments = await tasksApi.uploadAttachments(taskId, formData);
      
      // 添付ファイル一覧を更新
      setAttachments(prev => [...prev, ...uploadedAttachments]);
      
      toast.success('ファイルをアップロードしました');
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toast.error('ファイルのアップロードに失敗しました');
    }
  };
  
  // ファイル削除処理
  const handleDeleteAttachment = async (attachmentId) => {
    if (!attachmentId) return;
    
    try {
      // APIが実際に存在することを前提としています
      await tasksApi.deleteAttachment(attachmentId);
      
      // 添付ファイル一覧を更新
      setAttachments(prev => prev.filter(attachment => attachment.id !== attachmentId));
      
      toast.success('ファイルを削除しました');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('ファイルの削除に失敗しました');
    }
  };
  
  // ファイルダウンロード処理
  const handleDownload = (attachment) => {
    if (!attachment || !attachment.file_url) return;
    
    // ダウンロードリンクの作成
    const link = document.createElement('a');
    link.href = attachment.file_url;
    link.download = attachment.filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // ドラッグアンドドロップイベントハンドラ
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };
  
  // ファイル選択処理
  const handleFileSelect = (e) => {
    const files = e.target.files;
    handleFileUpload(files);
    e.target.value = null; // 同じファイルを連続で選択できるようにリセット
  };
  
  // モックデータ（実際の実装では削除）
  const mockAttachments = [
    {
      id: 1,
      filename: '要件定義書.pdf',
      file_url: '#',
      content_type: 'application/pdf',
      file_size: 1024 * 1024 * 2.5, // 2.5MB
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      filename: 'スクリーンショット.png',
      file_url: '#',
      content_type: 'image/png',
      file_size: 1024 * 512, // 512KB
      created_at: new Date().toISOString()
    }
  ];
  
  // 開発用にモックデータを使用
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && attachments.length === 0 && !isLoading) {
      setAttachments(mockAttachments);
    }
  }, [attachments.length, isLoading]);
  
  return (
    <div className="task-attachments">
      {/* ファイルアップロード領域 */}
      <div 
        className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label htmlFor="file-upload" className="file-upload-label">
          <HiOutlinePaperClip size={24} />
          <span>
            ファイルをドラッグするか、<span className="upload-text">クリックしてアップロード</span>
          </span>
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      
      {/* 添付ファイル一覧 */}
      <div className="attachments-list">
        {isLoading ? (
          <div className="loading-message">添付ファイルを読み込み中...</div>
        ) : attachments.length === 0 ? (
          <div className="empty-message">
            <HiOutlinePaperClip size={24} />
            <p>添付ファイルはありません</p>
          </div>
        ) : (
          <ul>
            {attachments.map(attachment => (
              <li key={attachment.id} className="attachment-item">
                <div className="attachment-icon">
                  {getFileIcon(attachment.content_type)}
                </div>
                
                <div className="attachment-info">
                  <div className="attachment-name">{attachment.filename}</div>
                  <div className="attachment-meta">
                    {formatFileSize(attachment.file_size)}
                  </div>
                </div>
                
                <div className="attachment-actions">
                  <button 
                    className="action-button download"
                    onClick={() => handleDownload(attachment)}
                    aria-label="ダウンロード"
                  >
                    <HiDownload size={18} />
                  </button>
                  
                  <button 
                    className="action-button delete"
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    aria-label="削除"
                  >
                    <HiOutlineTrash size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Attachments;