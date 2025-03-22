import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ClientForm from '../components/clients/ClientForm';

const ClientEditPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 文字列のIDを数値に変換（数値変換できない場合は元の値を使用）
  const clientId = !isNaN(parseInt(id)) ? parseInt(id) : id;
  
  console.log('ClientEditPage: パラメータID:', id, '変換後ID:', clientId);
  
  // URLにクエリパラメータがある場合は、現在のURLを再度訪問して
  // クエリパラメータを取り除く
  React.useEffect(() => {
    if (location.search) {
      navigate(`/clients/${id}/edit`, { replace: true });
    }
  }, [location.search, id, navigate]);
  
  return (
    <div className="p-4">
      <ClientForm clientId={clientId} />
    </div>
  );
};

export default ClientEditPage;