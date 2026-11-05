import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import '@/sidepanel/index.css';

const rootElement = document.getElementById('popup-root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
