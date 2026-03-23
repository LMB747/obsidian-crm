import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <ToastContainer />
    </ErrorBoundary>
  </React.StrictMode>
);
