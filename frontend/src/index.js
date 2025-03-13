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

// 開発モードのデバッグ支援：デモトークンを自動的に設定
if (process.env.NODE_ENV === 'development') {
  const demoToken = '039542700dd3bcf213ff82e652f6b396d2775049';
  if (!localStorage.getItem('token')) {
    console.log('Setting demo token for development:', demoToken);
    localStorage.setItem('token', demoToken);
  }
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
        position="top-right" 
        toastOptions={{
          className: '',
          duration: 5000,
          style: {
            background: '#fff',
            color: '#334155',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08)',
            padding: '1rem',
          },
          success: {
            iconTheme: {
              primary: '#36D399',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#F87272',
              secondary: 'white',
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