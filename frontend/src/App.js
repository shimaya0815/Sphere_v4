import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import TaskTemplatesPage from './pages/TaskTemplatesPage';
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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/debug/socket" element={<SocketDebug />} />
        
        {/* Protected routes with shared layout */}
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
          <Route path="/tasks/templates" element={
            <PrivateRoute>
              <TaskTemplatesPage />
            </PrivateRoute>
          } />
          <Route path="/tasks/:taskId" element={
            <PrivateRoute>
              <TasksPage view="detail" />
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
          <Route path="/clients/:clientId" element={
            <PrivateRoute>
              <ClientDetailPage />
            </PrivateRoute>
          } />
          <Route path="/clients/:clientId/edit" element={
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
          <Route path="/time-management" element={
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
        
        {/* Catch all for 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;