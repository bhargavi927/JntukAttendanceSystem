import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import jntukLogo from './jntukimages/jntuk-logo.png';

function setFavicon(href) {
  if (!href || typeof document === 'undefined') return;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;

  const existing = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  const link = existing || document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = href;
  if (!existing) head.appendChild(link);
}

setFavicon(jntukLogo);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
