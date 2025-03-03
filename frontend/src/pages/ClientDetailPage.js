import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientsApi } from '../api';
import toast from 'react-hot-toast';
import ClientDetail from '../components/clients/ClientDetail';

const ClientDetailPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    console.log('ClientDetailPage - clientId from params:', clientId);
    if (!clientId) {
      console.error('Missing clientId in URL params');
      navigate('/clients');
      return;
    }
    
    // クライアント情報を取得
    const fetchClient = async () => {
      try {
        const data = await clientsApi.getClient(clientId);
        console.log('Fetched client data:', data);
        setClient(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('クライアント情報の取得に失敗しました');
        toast.error('クライアント情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClient();
  }, [clientId, navigate]);
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
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
    );
  }
  
  return client ? <ClientDetail id={clientId} client={client} /> : null;
};

export default ClientDetailPage;