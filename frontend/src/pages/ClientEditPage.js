import React from 'react';
import { useParams } from 'react-router-dom';
import ClientForm from '../components/clients/ClientForm';

const ClientEditPage = () => {
  const { clientId } = useParams();
  
  return (
    <div className="p-4">
      <ClientForm clientId={clientId} />
    </div>
  );
};

export default ClientEditPage;