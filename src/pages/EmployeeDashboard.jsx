// src/pages/EmployeeDashboard.jsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  FunnelIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { useFiles } from '../context/FilesContext';
import { useTasks } from '../context/TasksContext';

import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import PreviewModal from '../components/PreviewModal';
import ShareModal from '../components/ShareModal';
import StatusBadge from '../components/StatusBadge';

import {
  formatLongDate,
  formatTime,
  isSameDay,
  isWithinDays,
} from '../utils/dateUtils';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const getType = (name = '') => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return 'other';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext))
    return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv', 'tsv', 'json'].includes(ext)) return 'data';
  return 'other';
};

const upsertById = (arr, item) => {
  if (!item?.id) return arr;
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...arr];
  const copy = [...arr];
  copy[idx] = { ...copy[idx], ...item };
  return copy;
};

/* ─── status visual config ────────────────────────────────────────────── */
const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Pending review',
    note: 'Your file is waiting for admin review.',
  },
  reviewing: {
    icon: EyeIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Under review',
    note: 'An admin is currently reviewing your file.',
  },
  approved: {
    icon: CheckCircleIcon,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'Approved',
    note: 'Your file has been approved.',
  },
  rejected: {
    icon: XCircleIcon,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    label: 'Rejected',
    note: 'Your file was rejected. See admin note below.',
  },
};

/* ─── task status config ──────────────────────────────────────────────── */
const taskStatusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
    icon: ClockIcon,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
    icon: EyeIcon,
  },
  done: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-400',
    icon: CheckCircleIcon,
  },
};

/* ─── Notification Component ───────────────────────────────────────────── */
const TaskNotification = ({ count, onViewTasks, onClose }) => {
  return (
    <div className="fixed top-20 right-4 z-40 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-lg overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <ClockIcon className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                You have {count} pending {count === 1 ? 'task' : 'tasks'}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Admin has assigned you{' '}
                {count === 1 ? 'a task' : `${count} tasks`} to complete
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-lg hover:bg-amber-100 transition-colors text-amber-600 hover:text-amber-700"
            title="Dismiss notification"
            type="button"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-amber-200 bg-amber-100/50 px-5 py-3">
          <button
            onClick={onViewTasks}
            className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            type="button"
          >
            View Tasks
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── small sub-components ────────────────────────────────────────────── */
const ActivityRow = ({ file }) => {
  const cfg = statusConfig[file.status] || statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <li
      className={`rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3 transition-all hover:shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
            <Icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {file.originalName}
            </p>
            <p className="text-[11px] text-slate-500">
              {file.description || 'No description'}
            </p>

            {file.adminNote && (
              <div className="mt-1.5 flex items-start gap-1">
                <ChatBubbleLeftEllipsisIcon
                  className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`}
                />
                <p className={`text-[11px] italic font-medium ${cfg.color}`}>
                  Admin: "{file.adminNote}"
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={file.status} size="sm" />
          <span className="text-[10px] text-slate-400">
            {formatTime(file.createdAt)}
          </span>
        </div>
      </div>
    </li>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, gradient, iconBg }) => (
  <div
    className={`flex h-full flex-col justify-between rounded-2xl px-5 py-4 shadow-md ${gradient}`}
  >
    <div className="flex items-center justify-between">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[11px] font-semibold opacity-70">{sub}</span>
    </div>
    <div className="mt-4">
      <div className="text-3xl font-extrabold leading-tight text-slate-900">
        {value}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-700">{label}</div>
    </div>
  </div>
);

const TaskRow = ({ task, onStatusChange }) => {
  const cfg = taskStatusConfig[task.status] || taskStatusConfig.pending;
  const Icon = cfg.icon;

  const handleStatusChange = (e) => {
    onStatusChange(task.id, e.target.value);
  };

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-white hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
          <Icon className={`h-4 w-4 ${cfg.color.split(' ')[1]}`} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
              {task.description}
            </p>
          )}
          {task.adminFile && (
            <div className="mt-2 flex items-center gap-1.5">
              <DocumentTextIcon className="h-3.5 w-3.5 text-indigo-500" />
              <a
                href={typeof task.adminFile === 'string' ? task.adminFile : URL.createObjectURL(task.adminFile)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
              >
                Download Admin File
              </a>
            </div>
          )}
          <p className="mt-1 text-[10px] text-slate-400">Assigned by admin</p>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        <select
          value={task.status}
          onChange={handleStatusChange}
          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold cursor-pointer transition-all ${cfg.color} focus:outline-none focus:ring-2 focus:ring-offset-1`}
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Completed</option>
        </select>
      </div>
    </li>
  );
};

const TaskSection = ({
  title,
  status,
  tasks,
  count,
  isOpen,
  onToggle,
  onStatusChange,
  bgColor,
  borderColor,
  iconColor,
}) => {
  const Icon = taskStatusConfig[status]?.icon || ClockIcon;

  return (
    <div className={`rounded-2xl border ${borderColor} overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${bgColor} hover:opacity-90`}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/40">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="text-[11px] text-slate-500">
              {count} task{count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/60 px-2 py-1 text-xs font-bold text-slate-700">
            {count}
          </span>
          {isOpen ? (
            <ChevronUpIcon className="h-4 w-4 text-slate-700 transition-transform" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-slate-700 transition-transform" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 py-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <Icon className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-400">
                No {title.toLowerCase()}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── main component ──────────────────────────────────────────────────── */
const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { files, addFile } = useFiles();
  const { tasks, updateTaskStatus } = useTasks();

  // If user is not ready yet, avoid crashing
  if (!user) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Loading dashboard...
      </div>
    );
  }

  /* keep a local task list to support websocket updates */
  const [taskList, setTaskList] = useState(tasks || []);
  useEffect(() => {
    setTaskList(tasks || []);
  }, [tasks]);

  /* ── WebSocket: real-time task updates ───────────────────────────── */
  useWebSocket(
    'ws://localhost:8000/ws/tasks/',
    (data) => {
      // Expected types based on your older component:
      // - task_notification { message, task }
      // - task_status_update { taskId, status }
      // - task_list { tasks: [] }

      if (data?.type === 'task_notification') {
        if (data.task) {
          setTaskList((prev) => upsertById(prev, data.task));
        }
      }

      if (data?.type === 'task_status_update') {
        setTaskList((prev) =>
          prev.map((t) =>
            t.id === data.taskId ? { ...t, status: data.status } : t
          )
        );
      }

      if (data?.type === 'task_list' && Array.isArray(data.tasks)) {
        setTaskList(data.tasks);
      }
    },
    (error) => console.error('WebSocket error:', error)
  );

  /* filter / sort state */
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  /* modals */
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);

  /* active top tab */
  const [topTab, setTopTab] = useState('today');

  /* Task section open/close state */
  const [taskSectionsOpen, setTaskSectionsOpen] = useState({
    pending: true,
    in_progress: true,
    done: false,
  });

  /* Notification state */
  const [showNotification, setShowNotification] = useState(false);
  const [notificationDismissedAt, setNotificationDismissedAt] = useState(
    localStorage.getItem('taskNotificationDismissedAt')
      ? new Date(localStorage.getItem('taskNotificationDismissedAt'))
      : null
  );

  /* ── Effect: Check if notification should show ────────────────────── */
  useEffect(() => {
    const pendingTasksCount = (taskList || []).filter(
      (t) => t.assignedToEmail === user.email && t.status !== 'done'
    ).length;

    if (pendingTasksCount === 0) {
      setShowNotification(false);
      return;
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (!notificationDismissedAt || notificationDismissedAt < oneHourAgo) {
      setShowNotification(true);
    }
  }, [taskList, user.email, notificationDismissedAt]);

  /* ── Handlers ─────────────────────────────────────────────────────── */
  const handleDismissNotification = () => {
    const now = new Date();
    localStorage.setItem('taskNotificationDismissedAt', now.toISOString());
    setNotificationDismissedAt(now);
    setShowNotification(false);
  };

  const handleViewTasks = () => {
    handleDismissNotification();
    setTopTab('tasks');
  };

  const handleTaskStatusChange = (taskId, status) => {
    // optimistic UI
    setTaskList((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    updateTaskStatus(taskId, status);
  };

  /* ── derived data ─────────────────────────────────────────────────── */
  const {
    userFiles,
    stats,
    sortFilterFiles,
    todayFiles,
    myTasks,
    rejectedFiles,
    tasksByStatus,
  } = useMemo(() => {
    const userFilesAll = (files || []).filter((f) => f.userId === user.id);

    const myTasksArr = (taskList || []).filter(
      (t) => t.assignedToEmail === user.email
    );

    const tasksByStatusObj = {
      pending: myTasksArr.filter((t) => t.status === 'pending'),
      in_progress: myTasksArr.filter((t) => t.status === 'in_progress'),
      done: myTasksArr.filter((t) => t.status === 'done'),
    };

    const totalSize = userFilesAll.reduce((s, f) => s + (f.size || 0), 0);
    const todayArr = userFilesAll.filter((f) => isSameDay(f.createdAt));
    const monthArr = userFilesAll.filter((f) => isWithinDays(f.createdAt, 30));
    const approvedArr = userFilesAll.filter((f) => f.status === 'approved');
    const rejectedArr = userFilesAll.filter((f) => f.status === 'rejected');

    const todaySubset = todayArr.slice(0, 8);

    let sf = [...userFilesAll];

    if (selectedDate) {
      const d = new Date(selectedDate);
      sf = sf.filter((f) => isSameDay(f.createdAt, d));
    }
    if (typeFilter !== 'all') {
      sf = sf.filter((f) => getType(f.originalName) === typeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      sf = sf.filter((f) => {
        const name = (f.originalName || '').toLowerCase();
        const desc = (f.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }
    sf.sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest')
        return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name')
        return (a.originalName || '').localeCompare(b.originalName || '');
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      return 0;
    });

    return {
      userFiles: userFilesAll,
      stats: {
        totalFiles: userFilesAll.length,
        totalSize,
        todayCount: todayArr.length,
        monthCount: monthArr.length,
        approvedCount: approvedArr.length,
        rejectedCount: rejectedArr.length,
      },
      sortFilterFiles: sf,
      todayFiles: todaySubset,
      myTasks: myTasksArr,
      rejectedFiles: rejectedArr,
      tasksByStatus: tasksByStatusObj,
    };
  }, [files, taskList, user.id, user.email, typeFilter, sortBy, search, selectedDate]);

  /* ── handlers ─────────────────────────────────────────────────────── */
  const handleUpload = (file, description) => {
    addFile({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      file,
      description,
    });
  };

  const handleTopTabChange = (id) => {
    setTopTab(id);
    if (id === 'filters') {
      setTypeFilter('all');
      setSortBy('newest');
      setSearch('');
      setSelectedDate('');
    }
  };

  const toggleTaskSection = (status) => {
    setTaskSectionsOpen((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  /* ── greeting ─────────────────────────────────────────────────────── */
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? 'Good morning'
      : now.getHours() < 18
        ? 'Good afternoon'
        : 'Good evening';

  /* ── tabs config ──────────────────────────────────────────────────── */
  const topTabs = [
    { id: 'today', label: 'Today', icon: ClockIcon },
    { id: 'filters', label: 'Sort & Filter', icon: FunnelIcon },
    { id: 'stats', label: 'File stats', icon: ChartBarIcon },
    {
      id: 'tasks',
      label: 'Your tasks',
      icon: CheckCircleIcon,
      badge: myTasks.filter((t) => t.status !== 'done').length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── NOTIFICATION ────────────────────────────────────────────── */}
      {showNotification && (
        <TaskNotification
          count={myTasks.filter((t) => t.status !== 'done').length}
          onViewTasks={handleViewTasks}
          onClose={handleDismissNotification}
        />
      )}

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
              {greeting},{' '}
              <span className="text-indigo-600">{user?.name}</span>!{' '}
              <span>👋</span>
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDaysIcon className="h-4 w-4" />
              <span>{formatLongDate(now)}</span>
            </div>

            {rejectedFiles.length > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2">
                <XCircleIcon className="h-4 w-4 flex-shrink-0 text-rose-500" />
                <p className="text-xs font-medium text-rose-700">
                  {rejectedFiles.length} file
                  {rejectedFiles.length > 1 ? 's were' : ' was'} rejected by
                  admin. Check{' '}
                  <button
                    onClick={() => handleTopTabChange('filters')}
                    className="underline font-semibold"
                    type="button"
                  >
                    Sort & Filter
                  </button>{' '}
                  for details.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {topTabs.map((tab) => {
              const Icon = tab.icon;
              const active = topTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTopTabChange(tab.id)}
                  className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TODAY TAB ───────────────────────────────────────────────── */}
      {topTab === 'today' && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <FileUpload onUpload={handleUpload} />

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                  <ClockIcon className="h-4 w-4 text-slate-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Today&apos;s activity
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-xs font-semibold text-slate-600">
                {todayFiles.length} item{todayFiles.length === 1 ? '' : 's'}
              </span>
            </div>

            {todayFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <ArrowUpTrayIcon className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-400">
                  No uploads today yet
                </p>
                <p className="text-xs text-slate-400">
                  New uploads will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {todayFiles.map((f) => (
                  <ActivityRow key={f.id} file={f} />
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
              {Object.entries(statusConfig).map(([key, val]) => {
                const Icon = val.icon;
                return (
                  <span
                    key={key}
                    className="flex items-center gap-1 text-[10px] text-slate-500"
                  >
                    <Icon className={`h-3 w-3 ${val.color}`} />
                    {val.label}
                  </span>
                );
              })}
            </div>
          </aside>
        </section>
      )}

      {/* ── SORT & FILTER TAB ───────────────────────────────────────── */}
      {topTab === 'filters' && (
        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <FunnelIcon className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">
                    Sort &amp; filter your files
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {sortFilterFiles.length} of {userFiles.length} files shown
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                >
                  <option value="all">All types</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Images</option>
                  <option value="doc">Office docs</option>
                  <option value="data">Datasets</option>
                  <option value="other">Others</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">File name</option>
                  <option value="size">File size</option>
                </select>

                {(search ||
                  typeFilter !== 'all' ||
                  sortBy !== 'newest' ||
                  selectedDate) && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setTypeFilter('all');
                        setSortBy('newest');
                        setSelectedDate('');
                      }}
                      className="h-9 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                      type="button"
                    >
                      Clear
                    </button>
                  )}
              </div>
            </div>

            <div className="mt-3">
              <input
                type="text"
                placeholder="Search by file name or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-slate-900">Your files</h2>
              <p className="text-xs font-semibold text-slate-500">
                {sortFilterFiles.length} of {userFiles.length}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <FileList
                files={sortFilterFiles}
                onPreview={setPreviewFile}
                onShare={setShareFile}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── FILE STATS TAB ──────────────────────────────────────────── */}
      {topTab === 'stats' && (
        <section className="space-y-5">
          <h2 className="text-base font-bold text-slate-900">File statistics</h2>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <StatCard
                icon={DocumentTextIcon}
                label="Total files uploaded"
                value={stats.totalFiles}
                sub="All time"
                gradient="bg-gradient-to-br from-indigo-200 to-indigo-300"
                iconBg="bg-white/60 text-indigo-700"
              />
            </div>
            <div className="lg:col-span-2">
              <StatCard
                icon={ArrowUpTrayIcon}
                label="Uploaded today"
                value={stats.todayCount}
                sub="Today"
                gradient="bg-gradient-to-br from-emerald-200 to-emerald-300"
                iconBg="bg-white/60 text-emerald-700"
              />
            </div>
            <div className="lg:col-span-2">
              <StatCard
                icon={ClockIcon}
                label="Files in last 30 days"
                value={stats.monthCount}
                sub="30 days"
                gradient="bg-gradient-to-br from-amber-200 to-amber-300"
                iconBg="bg-white/60 text-amber-700"
              />
            </div>
            <div className="lg:col-span-2">
              <StatCard
                icon={ChartBarIcon}
                label="Total storage used"
                value={formatBytes(stats.totalSize)}
                sub="Size"
                gradient="bg-gradient-to-br from-fuchsia-200 to-purple-300"
                iconBg="bg-white/60 text-purple-700"
              />
            </div>
            <div className="lg:col-span-1">
              <StatCard
                icon={CheckCircleIcon}
                label="Approved"
                value={stats.approvedCount}
                sub="Approved"
                gradient="bg-gradient-to-br from-teal-200 to-teal-300"
                iconBg="bg-white/60 text-teal-700"
              />
            </div>
            <div className="lg:col-span-1">
              <StatCard
                icon={XCircleIcon}
                label="Rejected"
                value={stats.rejectedCount}
                sub="Rejected"
                gradient="bg-gradient-to-br from-rose-200 to-rose-300"
                iconBg="bg-white/60 text-rose-700"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-800">
              File status breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(statusConfig).map(([key, cfg]) => {
                const count = userFiles.filter((f) => f.status === key).length;
                const pct =
                  userFiles.length > 0
                    ? Math.round((count / userFiles.length) * 100)
                    : 0;
                const Icon = cfg.icon;
                const barColor = {
                  pending: 'bg-amber-400',
                  reviewing: 'bg-blue-400',
                  approved: 'bg-emerald-400',
                  rejected: 'bg-rose-400',
                }[key];

                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className="text-xs font-semibold text-slate-700">
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {count} file{count !== 1 ? 's' : ''} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── YOUR TASKS TAB WITH ACCORDIONS ──────────────────────────── */}
      {topTab === 'tasks' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Your tasks from admin
            </h2>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-xs font-semibold text-slate-600">
              {myTasks.length} task{myTasks.length === 1 ? '' : 's'}
            </span>
          </div>

          {myTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <CheckCircleIcon className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                No tasks assigned yet
              </p>
              <p className="text-xs text-slate-400">
                Tasks assigned by admin will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <TaskSection
                title="Pending"
                status="pending"
                tasks={tasksByStatus.pending}
                count={tasksByStatus.pending.length}
                isOpen={taskSectionsOpen.pending}
                onToggle={() => toggleTaskSection('pending')}
                onStatusChange={handleTaskStatusChange}
                bgColor="bg-amber-50"
                borderColor="border-amber-200"
                iconColor="text-amber-600"
              />

              <TaskSection
                title="In Progress"
                status="in_progress"
                tasks={tasksByStatus.in_progress}
                count={tasksByStatus.in_progress.length}
                isOpen={taskSectionsOpen.in_progress}
                onToggle={() => toggleTaskSection('in_progress')}
                onStatusChange={handleTaskStatusChange}
                bgColor="bg-blue-50"
                borderColor="border-blue-200"
                iconColor="text-blue-600"
              />

              <TaskSection
                title="Completed"
                status="done"
                tasks={tasksByStatus.done}
                count={tasksByStatus.done.length}
                isOpen={taskSectionsOpen.done}
                onToggle={() => toggleTaskSection('done')}
                onStatusChange={handleTaskStatusChange}
                bgColor="bg-emerald-50"
                borderColor="border-emerald-200"
                iconColor="text-emerald-600"
              />
            </div>
          )}
        </section>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────── */}
      <PreviewModal
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
      <ShareModal
        file={shareFile}
        open={!!shareFile}
        onClose={() => setShareFile(null)}
      />
    </div>
  );
};

export default EmployeeDashboard;