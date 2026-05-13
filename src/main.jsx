// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { FilesProvider } from './context/FilesContext.jsx';
import { TasksProvider } from './context/TasksContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <FilesProvider>
        <TasksProvider>
          <App />
        </TasksProvider>
      </FilesProvider>
    </AuthProvider>
  </BrowserRouter>
);