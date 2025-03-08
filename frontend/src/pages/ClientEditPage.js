import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ClientForm from '../components/clients/ClientForm';

const ClientEditPage = () => {
  const { clientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // URLにクエリパラメータがある場合は、現在のURLを再度訪問して
  // クエリパラメータを取り除く
  React.useEffect(() => {
    if (location.search) {
      navigate(`/clients/${clientId}/edit`, { replace: true });
    }
  }, [location.search, clientId, navigate]);
  
  return (
    <div className="p-4">
      <ClientForm clientId={clientId} />
    </div>
  );
};

export default ClientEditPage;