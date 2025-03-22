import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients } from '../api/clients';
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
  const [entityFilter, setEntityFilter] = useState('All');

  // Fetch clients data
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      console.log('クライアント一覧を取得します...');
      const data = await getClients({});
      console.log('取得したクライアントデータ:', data);
      
      // APIレスポンスの構造が変わっているため、resultsプロパティがあればそれを使用
      // ない場合はデータ自体が配列か確認し、どちらでもない場合は空配列を設定
      if (data && data.results) {
        console.log('results配列を使用します:', data.results);
        setClients(data.results);
      } else if (Array.isArray(data)) {
        console.log('データを直接配列として使用します:', data);
        setClients(data);
      } else {
        console.error('Unexpected API response format:', data);
        setClients([]);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('クライアント情報の取得に失敗しました');
      toast.error('クライアント情報の取得に失敗しました');
      setClients([]); // エラー時は空配列を設定
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    return (
      // 検索条件
      (client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       client.client_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      // ステータスフィルター
      (statusFilter === 'All' || client.contract_status === statusFilter) &&
      // 法人/個人フィルター
      (entityFilter === 'All' || client.corporate_individual === entityFilter)
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
            placeholder="名前、コード、メールで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">契約状況</label>
          <select
            className="select select-bordered w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">すべての契約状況</option>
            <option value="active">契約中</option>
            <option value="suspended">休止中</option>
            <option value="terminated">解約</option>
            <option value="preparing">契約準備中</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">法人/個人</label>
          <select
            className="select select-bordered w-full"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="All">すべて</option>
            <option value="corporate">法人</option>
            <option value="individual">個人</option>
          </select>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Clients Table */}
      {!loading && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="table w-full">
            <thead>
              <tr>
                <th>クライアント名</th>
                <th>クライアントコード</th>
                <th>契約状況</th>
                <th>法人/個人</th>
                <th>電話番号</th>
                <th>メールアドレス</th>
                <th>決算期</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length > 0 ? (
                filteredClients.map(client => (
                  <tr 
                    key={client.id} 
                    className="hover cursor-pointer" 
                    onClick={() => navigate(`/clients/${client.id}/edit`)}
                  >
                    <td className="font-medium">{client.name}</td>
                    <td>{client.client_code || '-'}</td>
                    <td>
                      <span className={`badge ${
                        client.contract_status === 'active' ? 'badge-success' :
                        client.contract_status === 'suspended' ? 'badge-warning' :
                        client.contract_status === 'terminated' ? 'badge-error' :
                        'badge-ghost'
                      }`}>
                        {client.contract_status_display || client.contract_status || '未設定'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        {client.corporate_individual_display || 
                         (client.corporate_individual === 'corporate' ? '法人' : 
                          client.corporate_individual === 'individual' ? '個人' : '-')}
                      </span>
                    </td>
                    <td>{client.phone || '-'}</td>
                    <td>{client.email || '-'}</td>
                    <td>{client.fiscal_year ? `第${client.fiscal_year}期` : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    条件に一致するクライアントが見つかりませんでした。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;