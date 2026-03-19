// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global styles — order matters:
// 1. tokens.css  — custom properties (must be first, everything references these)
// 2. reset.css   — zero out browser defaults
// 3. global.css  — base element styles + utilities
import './styles/tokens.css';
import './styles/reset.css';
import './styles/global.css';

// Initialise auth store so the 'efiko:logout' listener is attached
// before any component renders and tries to make authenticated requests.
import './store/authStore';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
