import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { WalletProvider } from './contexts/WalletContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
