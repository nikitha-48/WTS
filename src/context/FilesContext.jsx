// src/context/FilesContext.jsx
import React, { createContext, useContext, useState } from 'react';

const FilesContext = createContext(null);

export const FilesProvider = ({ children }) => {
  const [files, setFiles] = useState([]);

  const addFile = ({ userId, userName, userEmail, file, description }) => {
    const url = URL.createObjectURL(file);

    const newFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId,
      userName,
      userEmail,
      originalName: file.name,
      description: description || '',
      createdAt: new Date().toISOString(),
      mimeType: file.type,
      size: file.size,
      url,
      downloadUrl: url,
      file: file, // ← KEEP THE ACTUAL FILE OBJECT
      status: 'pending',
      adminNote: '',
      reviewedAt: null,
      shared: false,
    };

    setFiles((prev) => [newFile, ...prev]);
  };

  const updateFileStatus = (id, status, adminNote = '') => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status,
              adminNote,
              reviewedAt: new Date().toISOString(),
            }
          : f
      )
    );
  };

  const toggleShared = (id, value) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, shared: value } : f))
    );
  };

  const value = { files, addFile, updateFileStatus, toggleShared };

  return (
    <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
  );
};

export const useFiles = () => useContext(FilesContext);