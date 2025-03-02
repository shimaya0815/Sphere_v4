import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
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
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();