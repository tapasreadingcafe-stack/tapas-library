import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import { ThemeProvider } from './components/ThemeProvider';
import { DevModeProvider } from './components/DevMode';
import { AuthProvider } from './context/AuthContext';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <DevModeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </DevModeProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
);