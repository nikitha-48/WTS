import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  FunnelIcon,
  DocumentTextIcon,
  UsersIcon,
  ClockIcon,
  PlusCircleIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  XCircleIcon,
  EyeIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';

import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { useFiles } from '../context/FilesContext';
import { useTasks } from '../context/TasksContext';

import FileList from '../components/FileList';
import PreviewModal from '../components/PreviewModal';
import ShareModal from '../components/ShareModal';
import ReviewModal from '../components/ReviewModal';
import StatusBadge from '../components/StatusBadge';
import { isSameDay, isWithinDays } from '../utils/dateUtils';

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
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'doc';
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

const taskStatusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
  },
  done: {
    label: 'Done',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-400',
  },
};

const StatCard = ({ icon: Icon, label, value, sub, gradient }) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-5 shadow-sm border border-white/20 ${gradient}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/70">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        {sub && <p className="mt-1 text-[11px] text-white/60">{sub}</p>}
      </div>
      <div className="rounded-xl bg-white/10 p-2.5">
        <Icon className="h-5 w-5 text-white/80" />
      </div>
    </div>
    <div className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/5" />
  </div>
);

// ── Pending review row ──────────────────────────────────────────────────────
const PendingRow = ({ file, onReview }) => (
  <li className="flex items-center justify-between gap-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 hover:bg-amber-50 hover:shadow-sm transition-all">
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
        <DocumentTextIcon className="h-4 w-4 text-amber-600" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">
          {file.originalName}
        </p>
        <p className="text-[11px] text-slate-500">
          {file.userName} · {file.userEmail}
        </p>
      </div>
    </div>
    <div className="flex flex-shrink-0 items-center gap-2">
      <StatusBadge status={file.status} size="sm" />
      <button
        onClick={() => onReview(file)}
        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all"
        type="button"
      >
        <EyeIcon className="h-3 w-3" />
        Review
      </button>
    </div>
  </li>
);

const AdminDashboard = () => {
  const {
    user,
    getAllEmployees,
    getPendingEmployees,
    approveEmployee,
    deactivateEmployee,
    reactivateEmployee,
  } = useAuth();
  const { files, updateFileStatus } = useFiles();
  const { tasks, addTask, updateTaskStatus } = useTasks();

  /* local file list for realtime websocket updates */
  const [fileList, setFileList] = useState(files || []);
  useEffect(() => {
    setFileList(files || []);
  }, [files]);

  /* employee directory state */
  const [employees, setEmployees] = useState([]);
  const [adminError, setAdminError] = useState('');
  const refreshEmployees = useCallback(() => {
    setEmployees(getAllEmployees ? getAllEmployees() : []);
  }, [getAllEmployees]);
  useEffect(() => { refreshEmployees(); }, [refreshEmployees]);

  const pendingEmployees = employees.filter((e) => !e.isApproved);
  const activeEmployees = employees.filter((e) => e.isApproved && e.isActive);
  const inactiveEmployees = employees.filter((e) => e.isApproved && !e.isActive);

  const handleApprove = (id) => {
    const approved = approveEmployee(id);
    if (!approved) {
      setAdminError('Cannot approve accounts with non-company email addresses.');
    } else {
      setAdminError('');
    }
    refreshEmployees();
  };
  const handleDeactivate = (id) => {
    deactivateEmployee(id);
    refreshEmployees();
  };
  const handleReactivate = (id) => {
    reactivateEmployee(id);
    refreshEmployees();
  };

  /* WebSocket: real-time file updates */
  useWebSocket(
    'ws://localhost:8000/ws/files/',
    (data) => {
      if (!data?.type) return;

      if (data.type === 'file_notification' && data.file) {
        console.log('📄 New file:', data.file);
        setFileList((prev) => upsertById(prev, data.file));
      }

      if (data.type === 'file_status_update') {
        console.log('📊 Status updated:', data.fileId, data.status);
        setFileList((prev) =>
          prev.map((f) =>
            f.id === data.fileId ? { ...f, status: data.status } : f
          )
        );
      }

      // optional: if your backend sends full list snapshots
      if (data.type === 'file_list' && Array.isArray(data.files)) {
        setFileList(data.files);
      }
    },
    (error) => console.error('WebSocket error:', error)
  );

  /* filters */
  const [range, setRange] = useState('30d');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');

  /* modals */
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [reviewFile, setReviewFile] = useState(null);

  /* task form */
  const [taskFormOpen, setTaskFormOpen] = useState(true);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedToEmail: '',
    adminFile: null,
  });

  /* Active section tab */
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'tasks'

  const handleTaskChange = (e) => {
    if (e.target.name === 'adminFile') {
      setTaskForm((prev) => ({ ...prev, adminFile: e.target.files[0] }));
    } else {
      setTaskForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.assignedToEmail.trim()) return;
    addTask({
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      assignedToEmail: taskForm.assignedToEmail.trim(),
      assignedToName: taskForm.assignedToEmail.trim(),
      adminFile: taskForm.adminFile,
    });
    setTaskForm({ title: '', description: '', assignedToEmail: '', adminFile: null });
  };

  /* wrap updateFileStatus for optimistic UI */
  const handleUpdateFileStatus = (...args) => {
    // try to support common signatures:
    // (fileId, status) OR (fileId, status, adminNote) OR ({id,status,...})
    if (typeof args[0] === 'object' && args[0]?.id) {
      const payload = args[0];
      setFileList((prev) => upsertById(prev, payload));
      return updateFileStatus(payload);
    }

    const [fileId, status, adminNote] = args;
    setFileList((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status, ...(adminNote ? { adminNote } : {}) } : f
      )
    );
    return updateFileStatus(fileId, status, adminNote);
  };

  const stats = useMemo(() => {
    const totalFiles = fileList.length;
    const totalSize = fileList.reduce((sum, f) => sum + (f.size || 0), 0);
    const employees = new Set(
      fileList.map((f) => f.userEmail || f.user?.email || f.userId)
    );
    const pending = fileList.filter((f) => f.status === 'pending').length;
    const approved = fileList.filter((f) => f.status === 'approved').length;
    const rejected = fileList.filter((f) => f.status === 'rejected').length;
    const reviewing = fileList.filter((f) => f.status === 'reviewing').length;
    const todayCount = fileList.filter((f) => isSameDay(f.createdAt)).length;

    return {
      totalFiles,
      totalSize,
      employeeCount: employees.size,
      pending,
      approved,
      rejected,
      reviewing,
      todayCount,
    };
  }, [fileList]);

  const needsAttention = useMemo(
    () =>
      fileList
        .filter((f) => f.status === 'pending' || f.status === 'reviewing')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [fileList]
  );

  const filteredFiles = useMemo(() => {
    let list = [...fileList];

    if (range === 'today') list = list.filter((f) => isSameDay(f.createdAt));
    else if (range === '7d') list = list.filter((f) => isWithinDays(f.createdAt, 7));
    else if (range === '30d') list = list.filter((f) => isWithinDays(f.createdAt, 30));
    // range === 'all' => no filtering

    if (typeFilter !== 'all')
      list = list.filter((f) => getType(f.originalName) === typeFilter);

    if (statusFilter !== 'all')
      list = list.filter((f) => f.status === statusFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((f) => {
        const name = (f.userName || f.user?.name || '').toLowerCase();
        const email = (f.userEmail || f.user?.email || '').toLowerCase();
        const fileName = (f.originalName || '').toLowerCase();
        const desc = (f.description || '').toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          fileName.includes(q) ||
          desc.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name')
        return (a.originalName || '').localeCompare(b.originalName || '');
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      return 0;
    });

    return list;
  }, [fileList, range, typeFilter, statusFilter, sortBy, search]);

  const tabs = [
    {
      id: 'pending',
      label: 'Needs review',
      icon: ClockIcon,
      badge: needsAttention.length,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'all',
      label: 'All files',
      icon: DocumentTextIcon,
      badge: fileList.length,
      badgeColor: 'bg-indigo-500',
    },
    {
      id: 'tasks',
      label: 'Task manager',
      icon: CheckCircleIcon,
      badge: tasks.length,
      badgeColor: 'bg-slate-400',
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: UsersIcon,
      badge: pendingEmployees.length || null,
      badgeColor: 'bg-rose-500',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 space-y-6 p-4 md:p-6">
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 shadow-xl">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-0.5 text-[11px] font-medium uppercase tracking-widest text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Admin workspace
            </span>
            <h1 className="mt-3 text-2xl font-bold text-white md:text-3xl">
              Employee File Overview
            </h1>
            <p className="max-w-md text-sm text-slate-400 leading-relaxed">
              Review uploads, approve or reject documents, assign tasks, and
              audit files across the organisation.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/30 text-xs font-bold text-indigo-200">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <p className="text-xs text-slate-400">
                Signed in as{' '}
                <span className="font-semibold text-white">{user?.name}</span>
                <span className="ml-1 text-slate-500">({user?.email})</span>
              </p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={DocumentTextIcon}
              label="Total Files"
              value={stats.totalFiles}
              sub={`${stats.todayCount} added today`}
              gradient="bg-gradient-to-br from-indigo-600 to-indigo-800"
            />
            <StatCard
              icon={ClockIcon}
              label="Pending"
              value={stats.pending}
              sub={`${stats.reviewing} under review`}
              gradient="bg-gradient-to-br from-amber-500 to-amber-700"
            />
            <StatCard
              icon={ShieldCheckIcon}
              label="Approved"
              value={stats.approved}
              sub={`${stats.rejected} rejected`}
              gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
            />
            <StatCard
              icon={UsersIcon}
              label="Employees"
              value={stats.employeeCount}
              sub={formatBytes(stats.totalSize) + ' total'}
              gradient="bg-gradient-to-br from-violet-600 to-violet-800"
            />
          </div>
        </div>
      </section>

      {/* ── TABS ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${active
                  ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                }`}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${tab.badgeColor}`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── NEEDS REVIEW TAB ─────────────────────────────────── */}
      {activeTab === 'pending' && (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                <ClockIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Files needing review
                </h2>
                <p className="text-[11px] text-slate-500">
                  Approve, reject, or mark files under review
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
              {needsAttention.length} pending
            </span>
          </div>

          <div className="px-6 py-5">
            {needsAttention.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-14 text-center">
                <CheckCircleIcon className="h-10 w-10 text-emerald-400" />
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  All caught up!
                </p>
                <p className="text-xs text-slate-400">
                  No files are waiting for review.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {needsAttention.map((file) => (
                  <PendingRow
                    key={file.id}
                    file={file}
                    onReview={setReviewFile}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50">
            {[
              {
                label: 'Approved',
                value: stats.approved,
                color: 'text-emerald-600',
                icon: CheckCircleIcon,
              },
              {
                label: 'Rejected',
                value: stats.rejected,
                color: 'text-rose-600',
                icon: XCircleIcon,
              },
              {
                label: 'Reviewing',
                value: stats.reviewing,
                color: 'text-blue-600',
                icon: EyeIcon,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1 py-3"
                >
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className={`text-base font-bold ${item.color}`}>
                    {item.value}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── ALL FILES TAB ─────────────────────────────────────── */}
      {activeTab === 'all' && (
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                  <FunnelIcon className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Filter employee files
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {filteredFiles.length} file
                    {filteredFiles.length === 1 ? '' : 's'} match current
                    filters
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All time</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                >
                  <option value="all">All types</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Images</option>
                  <option value="doc">Office docs</option>
                  <option value="other">Other</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">File name</option>
                  <option value="size">File size</option>
                </select>

                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search files, employees…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full min-w-[200px] rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                {(search ||
                  typeFilter !== 'all' ||
                  range !== '30d' ||
                  sortBy !== 'newest' ||
                  statusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setTypeFilter('all');
                        setRange('30d');
                        setSortBy('newest');
                        setStatusFilter('all');
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                      type="button"
                    >
                      Clear
                    </button>
                  )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <FileList
              files={filteredFiles}
              isAdmin
              onPreview={setPreviewFile}
              onShare={setShareFile}
              onStatusChange={handleUpdateFileStatus}
              onReview={setReviewFile}
            />
          </div>
        </section>
      )}

      {/* ── TASK MANAGER TAB ─────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                <PlusCircleIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Task Assignment
                </h2>
                <p className="text-[11px] text-slate-500">
                  Create & track tasks for your team
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-600">
                {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </span>
              <button
                onClick={() => setTaskFormOpen((p) => !p)}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                type="button"
              >
                {taskFormOpen ? 'Collapse' : 'New task'}
                <ChevronDownIcon
                  className={`h-3 w-3 transition-transform ${taskFormOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>
            </div>
          </div>

          {taskFormOpen && (
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Task title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={taskForm.title}
                      onChange={handleTaskChange}
                      placeholder="e.g. Upload April payslip"
                      required
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Assign to <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="assignedToEmail"
                      value={taskForm.assignedToEmail}
                      onChange={handleTaskChange}
                      placeholder="employee@company.com"
                      required
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Description{' '}
                      <span className="font-normal normal-case text-slate-400">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={taskForm.description}
                      onChange={handleTaskChange}
                      placeholder="Short note for the employee…"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Attach File (optional)
                    </label>
                    <input
                      type="file"
                      name="adminFile"
                      onChange={handleTaskChange}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    <PlusCircleIcon className="h-4 w-4" />
                    Send task
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="px-6 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              All tasks
            </h3>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <ExclamationCircleIcon className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-400">
                  No tasks yet
                </p>
                <p className="text-xs text-slate-400">
                  Create your first task above.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => {
                  const cfg = taskStatusConfig[t.status] || taskStatusConfig.pending;
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-white hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {t.title}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {t.assignedToEmail}
                          </p>
                          {t.adminFile && (
                            <div className="mt-1 flex items-center gap-1">
                              <DocumentTextIcon className="h-3 w-3 text-indigo-500" />
                              <a
                                href={typeof t.adminFile === 'string' ? t.adminFile : URL.createObjectURL(t.adminFile)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-medium text-indigo-600 hover:underline"
                              >
                                View attached file
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.color}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <select
                          value={t.status}
                          onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ── EMPLOYEES TAB ─────────────────────────────────── */}
      {activeTab === 'employees' && (
        <section className="space-y-5">

          {/* ── Pending Approval ── */}
          <div className="rounded-3xl border border-amber-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/60 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                  <ClockIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Pending Approval</h2>
                  <p className="text-[11px] text-slate-500">New registrations awaiting your review</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                {pendingEmployees.length} pending
              </span>
            </div>

            {adminError && (
              <div className="mx-6 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {adminError}
              </div>
            )}

            <div className="px-6 py-5">
              {pendingEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <CheckCircleIcon className="h-9 w-9 text-emerald-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-600">All caught up!</p>
                  <p className="text-xs text-slate-400">No pending registrations.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {pendingEmployees.map((emp) => (
                    <li key={emp.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 hover:bg-amber-50 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-700">
                          {(emp.name || emp.username || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{emp.name || emp.username}</p>
                          <p className="truncate text-[11px] text-slate-500">{emp.email}</p>
                          {emp.department && (
                            <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                              {emp.department}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          Pending
                        </span>
                        <button
                          onClick={() => handleApprove(emp.id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 active:scale-95 transition-all"
                          type="button"
                        >
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Active Employees ── */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <UsersIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Active Employees</h2>
                  <p className="text-[11px] text-slate-500">Approved and can log in</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                {activeEmployees.length} active
              </span>
            </div>

            <div className="px-6 py-5">
              {activeEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <UsersIcon className="h-9 w-9 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-400">No active employees yet.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {activeEmployees.map((emp) => (
                    <li key={emp.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                          {(emp.name || emp.username || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{emp.name || emp.username}</p>
                          <p className="truncate text-[11px] text-slate-500">{emp.email}</p>
                          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {emp.department && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                                {emp.department}
                              </span>
                            )}
                            {emp.createdAt && (
                              <span className="text-[10px] text-slate-400">
                                Joined {new Date(emp.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Active
                        </span>
                        <button
                          onClick={() => handleDeactivate(emp.id)}
                          className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all"
                          type="button"
                        >
                          <NoSymbolIcon className="h-3.5 w-3.5" />
                          Deactivate
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Deactivated Employees ── */}
          {inactiveEmployees.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                    <NoSymbolIcon className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Deactivated</h2>
                    <p className="text-[11px] text-slate-500">Cannot log in — click Reactivate to restore</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {inactiveEmployees.length}
                </span>
              </div>
              <div className="px-6 py-5">
                <ul className="space-y-2">
                  {inactiveEmployees.map((emp) => (
                    <li key={emp.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 opacity-70 hover:opacity-100 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-500">
                          {(emp.name || emp.username || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-600">{emp.name || emp.username}</p>
                          <p className="truncate text-[11px] text-slate-400">{emp.email}</p>
                          {emp.department && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-500">{emp.department}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                          Deactivated
                        </span>
                        <button
                          onClick={() => handleReactivate(emp.id)}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all"
                          type="button"
                        >
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          Reactivate
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </section>
      )}

      {/* ── MODALS ───────────────────────────────────────────── */}
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
      <ReviewModal
        file={reviewFile}
        open={!!reviewFile}
        onClose={() => setReviewFile(null)}
        onUpdateStatus={handleUpdateFileStatus}
      />
    </div>
  );
};

export default AdminDashboard;