import React, { useEffect, useState } from 'react';
import usersApi from '../api/users';

const UserApiDebug = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [businessUsers, setBusinessUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user = await usersApi.getCurrentUser();
        setCurrentUser(user);
        
        console.log('Current user:', user);
        
        if (user && user.business) {
          const users = await usersApi.getBusinessUsers(user.business);
          setBusinessUsers(users);
          console.log('Business users:', users);
        }
      } catch (err) {
        console.error('Error in debug component:', err);
        setError(err.message || 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">User API Debug</h2>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {currentUser && (
        <div className="mb-4">
          <h3 className="font-bold">Current User:</h3>
          <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto">
            {JSON.stringify(currentUser, null, 2)}
          </pre>
        </div>
      )}
      
      {businessUsers.length > 0 && (
        <div>
          <h3 className="font-bold">Business Users ({businessUsers.length}):</h3>
          <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-96">
            {JSON.stringify(businessUsers, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UserApiDebug;
