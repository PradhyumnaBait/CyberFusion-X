import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// The old browser-side "standalone fallback engine" (a second, fake backend in
// the browser) was removed in the two-portal redesign: one real Java backend,
// honest offline behaviour instead of silently fabricated data.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
