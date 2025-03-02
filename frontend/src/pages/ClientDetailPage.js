import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientsApi } from '../api';
import toast from 'react-hot-toast';
import { 
  HiOutlineArrowLeft, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineOfficeBuilding,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineGlobeAlt,
  HiOutlineUser,
  HiOutlineIdentification,
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineClipboardList,
  HiOutlineDocumentDuplicate,
  HiOutlineAnnotation
} from 'react-icons/hi';

const ClientDetailPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const data = await clientsApi.getClient(clientId);
      setClient(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching client details:', error);
      setError('クライアント情報の取得に失敗しました');
      toast.error('クライアント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`クライアント「${client.name}」を削除してもよろしいですか？`)) {
      return;
    }
    
    try {
      await clientsApi.deleteClient(clientId);
      toast.success('クライアントを削除しました');
      navigate('/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('クライアントの削除に失敗しました');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    try {
      return new Date(dateString).toLocaleDateString('ja-JP');
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg">
          <h3 className="text-lg font-medium">{error}</h3>
          <p className="mt-2">
            <button 
              onClick={() => navigate('/clients')}
              className="text-red-700 underline"
            >
              クライアント一覧に戻る
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 text-yellow-600 p-6 rounded-lg">
          <h3 className="text-lg font-medium">クライアントが見つかりませんでした</h3>
          <p className="mt-2">
            <button 
              onClick={() => navigate('/clients')}
              className="text-yellow-700 underline"
            >
              クライアント一覧に戻る
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* ヘッダー部分 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/clients')} 
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => navigate(`/clients/${clientId}/edit`)}
              className="btn btn-outline btn-primary flex items-center"
            >
              <HiOutlinePencil className="mr-1" />
              編集
            </button>
            <button 
              onClick={handleDelete}
              className="btn btn-outline btn-error flex items-center"
            >
              <HiOutlineTrash className="mr-1" />
              削除
            </button>
          </div>
        </div>
      </div>
      
      {/* タブ切り替え */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`mr-8 py-4 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('info')}
            >
              <div className="flex items-center">
                <HiOutlineOfficeBuilding className="mr-2" />
                基本情報
              </div>
            </button>
            <button
              className={`mr-8 py-4 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'contracts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('contracts')}
            >
              <div className="flex items-center">
                <HiOutlineDocumentDuplicate className="mr-2" />
                契約情報
              </div>
            </button>
            <button
              className={`mr-8 py-4 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              <div className="flex items-center">
                <HiOutlineClipboardList className="mr-2" />
                タスク
              </div>
            </button>
            <button
              className={`mr-8 py-4 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'notes'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('notes')}
            >
              <div className="flex items-center">
                <HiOutlineAnnotation className="mr-2" />
                メモ
              </div>
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {/* 基本情報タブ */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">会社情報</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlineBriefcase className="mr-2" />
                      業種
                    </div>
                    <div className="text-sm font-medium">{client.industry || '未設定'}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlineIdentification className="mr-2" />
                      法人番号
                    </div>
                    <div className="text-sm font-medium">{client.tax_id || '未設定'}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlineCalendar className="mr-2" />
                      決算期
                    </div>
                    <div className="text-sm font-medium">{formatDate(client.fiscal_year_end)}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlinePhone className="mr-2" />
                      電話番号
                    </div>
                    <div className="text-sm font-medium">{client.phone || '未設定'}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlineMail className="mr-2" />
                      メールアドレス
                    </div>
                    <div className="text-sm font-medium">{client.email || '未設定'}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlineGlobeAlt className="mr-2" />
                      Webサイト
                    </div>
                    <div className="text-sm font-medium">
                      {client.website ? (
                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {client.website}
                        </a>
                      ) : '未設定'}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-800 mt-6 mb-4">住所</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{client.address || '未設定'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">担当者情報</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlineUser className="mr-2" />
                      担当者名
                    </div>
                    <div className="text-sm font-medium">{client.contact_name || '未設定'}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      役職
                    </div>
                    <div className="text-sm font-medium">{client.contact_position || '未設定'}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlineMail className="mr-2" />
                      担当者メールアドレス
                    </div>
                    <div className="text-sm font-medium">{client.contact_email || '未設定'}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlinePhone className="mr-2" />
                      担当者電話番号
                    </div>
                    <div className="text-sm font-medium">{client.contact_phone || '未設定'}</div>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      <HiOutlineUser className="mr-2" />
                      アカウントマネージャー
                    </div>
                    <div className="text-sm font-medium">{client.account_manager_name || '未設定'}</div>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-800 mt-6 mb-4">備考</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{client.notes || '備考はありません'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 契約情報タブ */}
          {activeTab === 'contracts' && (
            <div className="text-center py-12">
              <HiOutlineDocumentDuplicate className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">契約情報はまだ追加されていません</h3>
              <p className="mt-1 text-sm text-gray-500">新しい契約情報を追加しましょう</p>
              <div className="mt-6">
                <button className="btn btn-primary">
                  契約を追加
                </button>
              </div>
            </div>
          )}
          
          {/* タスクタブ */}
          {activeTab === 'tasks' && (
            <div className="text-center py-12">
              <HiOutlineClipboardList className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">タスクはまだ追加されていません</h3>
              <p className="mt-1 text-sm text-gray-500">新しいタスクを追加しましょう</p>
              <div className="mt-6">
                <button className="btn btn-primary">
                  タスクを追加
                </button>
              </div>
            </div>
          )}
          
          {/* メモタブ */}
          {activeTab === 'notes' && (
            <div className="text-center py-12">
              <HiOutlineAnnotation className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">メモはまだ追加されていません</h3>
              <p className="mt-1 text-sm text-gray-500">新しいメモを追加しましょう</p>
              <div className="mt-6">
                <button className="btn btn-primary">
                  メモを追加
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailPage;