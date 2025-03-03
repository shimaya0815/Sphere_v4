import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDetail from '../components/clients/ClientDetail';
import { useEffect } from 'react';

const ClientDetailPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('ClientDetailPage - clientId from params:', clientId);
    if (!clientId) {
      console.error('Missing clientId in URL params');
      navigate('/clients');
    }
  }, [clientId, navigate]);
  
  return clientId ? <ClientDetail id={clientId} /> : null;
};

export default ClientDetailPage;