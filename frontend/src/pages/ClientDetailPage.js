import React from 'react';
import { useParams } from 'react-router-dom';
import ClientDetail from '../components/clients/ClientDetail';

const ClientDetailPage = () => {
  const { clientId } = useParams();
  
  return <ClientDetail id={clientId} />;
};

export default ClientDetailPage;