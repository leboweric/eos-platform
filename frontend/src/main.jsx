import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Deployment verification - this will log to console on every page load
console.log('%c🚀 DEPLOYMENT VERSION: 2025-08-07-1430', 'color: #FFD700; font-size: 18px; font-weight: bold;');
console.log('If you see this version number, the deployment is working correctly!');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
