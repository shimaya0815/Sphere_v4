import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// React Iconsをインポート
import { 
  HiOutlineChartBar, 
  HiOutlineClipboardCheck, 
  HiOutlineUserGroup, 
  HiOutlineChat, 
  HiOutlineDocumentText, 
  HiOutlineClock,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineChevronLeft,
  HiOutlineChevronRight 
} from 'react-icons/hi';

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: 'ダッシュボード', icon: <HiOutlineChartBar className="w-5 h-5" /> },
    { path: '/tasks', label: 'タスク管理', icon: <HiOutlineClipboardCheck className="w-5 h-5" /> },
    { path: '/clients', label: 'クライアント', icon: <HiOutlineUserGroup className="w-5 h-5" /> },
    { path: '/chat', label: 'チャット', icon: <HiOutlineChat className="w-5 h-5" /> },
    { path: '/wiki', label: 'ナレッジ', icon: <HiOutlineDocumentText className="w-5 h-5" /> },
    { path: '/time-management', label: '作業時間', icon: <HiOutlineClock className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Desktop */}
      <div 
        className={`hidden md:block bg-white shadow-card transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-5 flex items-center justify-between">
          <h1 
            className={`font-bold text-xl text-primary-700 transition-opacity duration-300 ${
              isSidebarOpen ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Sphere
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label={isSidebarOpen ? "サイドバーを折りたたむ" : "サイドバーを開く"}
          >
            {isSidebarOpen ? 
              <HiOutlineChevronLeft className="w-5 h-5" /> : 
              <HiOutlineChevronRight className="w-5 h-5" />
            }
          </button>
        </div>

        <nav className="mt-8">
          <ul className="space-y-2 px-3">
            {navItems.map((item) => (
              <NavItem 
                key={item.path}
                to={item.path} 
                label={item.label} 
                icon={item.icon} 
                isSidebarOpen={isSidebarOpen}
                isActive={location.pathname === item.path} 
              />
            ))}
          </ul>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-20 border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2 mr-2 rounded-md text-gray-500 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
              >
                {isMobileMenuOpen ? 
                  <HiOutlineX className="w-6 h-6" /> : 
                  <HiOutlineMenu className="w-6 h-6" />
                }
              </button>
              <h1 className="text-xl font-semibold text-gray-800">Sphere</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {currentUser && (
                <>
                  <div className="hidden md:block text-sm text-gray-600">
                    {currentUser.email}
                  </div>
                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                      {currentUser.profile_image ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <img 
                            src={currentUser.profile_image} 
                            alt="プロフィール" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center">
                          {currentUser.first_name ? currentUser.first_name.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </label>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-30 p-2 shadow-lg bg-white rounded-xl w-52 border border-gray-100">
                      <li>
                        <Link to="/profile" className="px-4 py-3 hover:bg-gray-50 rounded-lg">
                          プロフィール
                        </Link>
                      </li>
                      <li>
                        <Link to="/settings" className="px-4 py-3 hover:bg-gray-50 rounded-lg">
                          設定
                        </Link>
                      </li>
                      <li>
                        <button 
                          onClick={handleLogout}
                          className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg w-full text-left"
                        >
                          ログアウト
                        </button>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile sidebar - overlay */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <div 
          className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-5 flex items-center justify-between border-b border-gray-200">
            <h1 className="font-bold text-xl text-primary-700">Sphere</h1>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
          <nav className="mt-5">
            <ul className="space-y-2 px-3">
              {navItems.map((item) => (
                <li key={item.path} className="mb-2">
                  <Link 
                    to={item.path} 
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                      location.pathname === item.path
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ to, label, icon, isSidebarOpen, isActive }) => (
  <li>
    <Link 
      to={to} 
      className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'hover:bg-gray-100 text-gray-700'
      }`}
    >
      <span>{icon}</span>
      <span 
        className={`ml-3 transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
        }`}
      >
        {label}
      </span>
    </Link>
  </li>
);

export default Layout;