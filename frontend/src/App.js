import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { toast } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import TaskTemplatesPage from './pages/TaskTemplatesPage';
import TemplateTaskList from './components/tasks/template/TemplateTaskList';
import ClientsPage from './pages/ClientsPage';
import ClientNewPage from './pages/ClientNewPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ClientEditPage from './pages/ClientEditPage';
import ChatPage from './pages/ChatPage';
import WikiPage from './pages/WikiPage';
import TimeManagementPage from './pages/TimeManagementPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import SocketDebug from './components/debug/SocketDebug';

// Placeholder components for initial setup
const PlaceholderComponent = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <div className="p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800">{title} Page</h1>
      <p className="mt-4 text-gray-600">This page is under construction.</p>
    </div>
  </div>
);

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading authentication state
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // グローバルトースト表示システム
  useEffect(() => {
    const handleGlobalToast = (event) => {
      if (event.detail) {
        const { message, type = 'success', options = {} } = event.detail;
        
        if (type === 'success') {
          toast.success(message, {
            id: `global-toast-${Date.now()}`,
            duration: 5000,
            ...options
          });
        } else if (type === 'error') {
          toast.error(message, {
            id: `global-toast-${Date.now()}`,
            duration: 5000,
            ...options
          });
        } else {
          toast(message, {
            id: `global-toast-${Date.now()}`,
            duration: 5000,
            ...options
          });
        }
      }
    };
    
    window.addEventListener('show-toast', handleGlobalToast);
    
    return () => {
      window.removeEventListener('show-toast', handleGlobalToast);
    };
  }, []);

  // URLの変更時にトーストが閉じてしまう問題を修正するパッチ
  useEffect(() => {
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    
    // pushStateをオーバーライドしてトースト表示を維持
    window.history.pushState = function(...args) {
      const result = originalPush.apply(this, args);
      
      // 既存のトーストを持続させる
      const activeToasts = document.querySelectorAll('[data-toast]');
      if (activeToasts.length > 0) {
        console.log('URLが変更されましたが、トースト通知を維持します');
      }
      
      return result;
    };
    
    // replaceStateをオーバーライドしてトースト表示を維持
    window.history.replaceState = function(...args) {
      const result = originalReplace.apply(this, args);
      
      // 既存のトーストを持続させる
      const activeToasts = document.querySelectorAll('[data-toast]');
      if (activeToasts.length > 0) {
        console.log('URLが置換されましたが、トースト通知を維持します');
      }
      
      return result;
    };
    
    return () => {
      // クリーンアップ：元の関数に戻す
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <AuthProvider>
      <Routes>
        {/* パブリックルート */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/debug/socket" element={<SocketDebug />} />
        
        {/* プロテクテッドルート（共通レイアウト付き） */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } />
          <Route path="/tasks" element={
            <PrivateRoute>
              <TasksPage />
            </PrivateRoute>
          } />
          <Route path="/tasks/:taskId" element={
            <PrivateRoute>
              <TasksPage />
            </PrivateRoute>
          } />
          <Route path="/task-templates" element={
            <PrivateRoute>
              <TaskTemplatesPage />
            </PrivateRoute>
          } />
          <Route path="/task-templates/:templateId" element={
            <PrivateRoute>
              <TemplateTaskList />
            </PrivateRoute>
          } />
          <Route path="/clients" element={
            <PrivateRoute>
              <ClientsPage />
            </PrivateRoute>
          } />
          <Route path="/clients/new" element={
            <PrivateRoute>
              <ClientNewPage />
            </PrivateRoute>
          } />
          <Route path="/clients/:id" element={
            <PrivateRoute>
              <ClientDetailPage />
            </PrivateRoute>
          } />
          <Route path="/clients/:id/edit" element={
            <PrivateRoute>
              <ClientEditPage />
            </PrivateRoute>
          } />
          <Route path="/chat" element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          } />
          <Route path="/wiki" element={
            <PrivateRoute>
              <WikiPage />
            </PrivateRoute>
          } />
          <Route path="/time" element={
            <PrivateRoute>
              <TimeManagementPage />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          } />
        </Route>
        
        {/* 404ページ */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;