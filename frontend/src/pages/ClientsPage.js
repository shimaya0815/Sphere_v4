import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../api';
import toast from 'react-hot-toast';
import { HiOutlineRefresh } from 'react-icons/hi';

const ClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All');

  // Fetch clients data
  useEffect(() => {
    fetchClients();
    fetchIndustries();
  }, [industryFilter]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (industryFilter !== 'All') {
        filters.industry = industryFilter;
      }
      
      const data = await clientsApi.getClients(filters);
      setClients(data.results || data);
      setError(null);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('クライアント情報の取得に失敗しました');
      toast.error('クライアント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchIndustries = async () => {
    try {
      const data = await clientsApi.getIndustries();
      setIndustries(data);
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    return (
      (client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       client.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       client.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'All' || true) // No status field in current model, adjust as needed
    );
  });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">クライアント</h1>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/clients/new')}
        >
          <span className="mr-2">+</span> 新規クライアント
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={fetchClients}
            className="flex items-center text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded"
          >
            <HiOutlineRefresh className="mr-1" /> 再読み込み
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">検索</label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="名前、担当者、メールで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select
            className="select select-bordered w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={true} // No status field in current model
          >
            <option value="All">すべてのステータス</option>
            <option value="Active">有効</option>
            <option value="Inactive">無効</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
          <select
            className="select select-bordered w-full"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            <option value="All">すべての業種</option>
            {industries.map(industry => (
              <option key={industry.industry} value={industry.industry}>
                {industry.industry} ({industry.count})
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Clients Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.name}</h3>
                  {/* ステータスの代わりにアカウントマネージャーがいるかどうかを表示 */}
                  {client.account_manager && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      担当者あり
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{client.industry || '業種未設定'}</p>
              </div>
              
              <div className="p-5">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">担当者</p>
                    <p className="mt-1">{client.contact_name || '未設定'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">メールアドレス</p>
                    <p className="mt-1">{client.email || '未設定'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">電話番号</p>
                    <p className="mt-1">{client.phone || '未設定'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">決算期</p>
                    <p className="mt-1">
                      {client.fiscal_year_end 
                        ? new Date(client.fiscal_year_end).toLocaleDateString('ja-JP')
                        : '未設定'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-gray-50 flex justify-end">
                <button 
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm mr-4"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  詳細
                </button>
                <button 
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  onClick={() => navigate(`/clients/${client.id}/edit`)}
                >
                  編集
                </button>
              </div>
            </div>
          ))}
          
          {!loading && filteredClients.length === 0 && (
            <div className="col-span-3 p-8 text-center text-gray-500 bg-white rounded-lg shadow">
              条件に一致するクライアントが見つかりませんでした。
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientsPage;