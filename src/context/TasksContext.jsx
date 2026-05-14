import React, { createContext, useContext, useState } from 'react';

const TasksContext = createContext(null);

export const TasksProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);

  const addTask = ({ title, description, assignedToEmail, assignedToName, adminFile }) => {
    const newTask = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      title,
      description,
      assignedToEmail,
      assignedToName,
      adminFile,
      status: 'pending', // 'pending' | 'in_progress' | 'done'
      createdAt: new Date().toISOString()
    };

    setTasks((prev) => [newTask, ...prev]);
  };

  const updateTaskStatus = (id, status) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  };

  const value = { tasks, addTask, updateTaskStatus };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};

export const useTasks = () => useContext(TasksContext);