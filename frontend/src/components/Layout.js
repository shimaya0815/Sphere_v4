import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-base-200 text-base-content transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-5 flex items-center justify-between">
          <h1 className={`font-bold text-xl transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            Sphere
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-base-300"
          >
            {isSidebarOpen ? '←' : '→'}
          </button>
        </div>
        <nav className="mt-5">
          <ul>
            <NavItem to="/dashboard" label="Dashboard" icon="📊" isSidebarOpen={isSidebarOpen} />
            <NavItem to="/tasks" label="Tasks" icon="✅" isSidebarOpen={isSidebarOpen} />
            <NavItem to="/clients" label="Clients" icon="👥" isSidebarOpen={isSidebarOpen} />
            <NavItem to="/chat" label="Chat" icon="💬" isSidebarOpen={isSidebarOpen} />
            <NavItem to="/wiki" label="Wiki" icon="📝" isSidebarOpen={isSidebarOpen} />
            <NavItem to="/time-management" label="Time" icon="⏱️" isSidebarOpen={isSidebarOpen} />
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-semibold">Sphere</h1>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <>
                  <div className="text-sm text-gray-600">
                    {currentUser.email}
                  </div>
                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                      <div className="w-10 rounded-full bg-primary text-white flex items-center justify-center">
                        {currentUser.email.charAt(0).toUpperCase()}
                      </div>
                    </label>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                      <li><Link to="/profile">Profile</Link></li>
                      <li><a>Settings</a></li>
                      <li><a onClick={handleLogout}>Logout</a></li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ to, label, icon, isSidebarOpen }) => (
  <li className="mb-2">
    <Link 
      to={to} 
      className="flex items-center px-4 py-3 hover:bg-base-300 rounded-lg transition-colors duration-200"
    >
      <span className="text-xl">{icon}</span>
      <span className={`ml-3 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
        {label}
      </span>
    </Link>
  </li>
);

export default Layout;