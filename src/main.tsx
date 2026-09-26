import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { LauncherProvider } from './context/LauncherContext';
import { VictusCloudProvider } from './context/VictusCloudContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LauncherProvider>
        <VictusCloudProvider>
          <App />
        </VictusCloudProvider>
      </LauncherProvider>
    </ThemeProvider>
  </React.StrictMode>
);
