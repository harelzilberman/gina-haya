import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n'; // Must import before App to initialise i18next
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
        <App />
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
