import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// キャッシュを制御するためのタイムスタンプを生成
if (process.env.NODE_ENV === 'development') {
  window.BUILD_TIMESTAMP = new Date().getTime();
  console.log(`Build timestamp: ${window.BUILD_TIMESTAMP}`);
}

// 開発環境でのデバッグ情報
if (process.env.NODE_ENV === 'development') {
  // 認証情報の確認（削除はしない）
  const hasToken = !!localStorage.getItem('token');
  const hasBusinessId = !!localStorage.getItem('business_id');
  console.log('認証状態:', {
    hasToken,
    hasBusinessId,
    path: window.location.pathname
  });
  
  // 自動ログイン設定は必要に応じて設定可能
  /*
  // 認証情報が完全に欠けている場合のみ、デバッグ用トークンを設定する
  if (!hasToken && !hasBusinessId) {
    console.log('認証情報がないため、デバッグ用トークンを設定します');
    const devToken = 'e1e0d7936e26b75695cbb2a99c458eacdd70220d'; // adminユーザーのトークン
    const devBusinessId = '3'; // 正しいビジネスID（Admin Business）
    
    localStorage.setItem('token', devToken);
    localStorage.setItem('business_id', devBusinessId);
  }
  */
}

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // StrictModeを無効化して非推奨警告を抑制（開発時のみの対応）
  // 本番環境ではStrictModeを有効に戻すことを推奨
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: '',
          duration: 5000,
          style: {
            background: '#fff',
            color: '#334155',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            padding: '1.2rem',
            fontSize: '1rem',
            fontWeight: '500',
            maxWidth: '400px',
            minWidth: '300px',
          },
          success: {
            iconTheme: {
              primary: '#36D399',
              secondary: 'white',
            },
            style: {
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#064E3B',
            },
          },
          error: {
            iconTheme: {
              primary: '#F87272',
              secondary: 'white',
            },
            style: {
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#7F1D1D',
            },
          },
        }}
      />
    </BrowserRouter>
  </QueryClientProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();