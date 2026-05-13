// src/components/ReviewModal.jsx
import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import StatusBadge from './StatusBadge';

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const ReviewModal = ({ file, open, onClose, onUpdateStatus }) => {
  const [adminNote, setAdminNote] = useState('');
  const [confirming, setConfirming] = useState(null); // 'approved' | 'rejected'

  useEffect(() => {
    if (file) {
      setAdminNote(file.adminNote || '');
      setConfirming(null);
    }
  }, [file]);

  if (!open || !file) return null;

  const handleAction = (status) => {
    if (confirming === status) {
      onUpdateStatus(file.id, status, adminNote.trim());
      onClose();
    } else {
      setConfirming(status);
    }
  };

  const handleReviewing = () => {
    onUpdateStatus(file.id, 'reviewing', adminNote.trim());
    onClose();
  };

  const uploadedAt = file.createdAt
    ? new Date(file.createdAt).toLocaleString()
    : '—';

  const reviewedAt = file.reviewedAt
    ? new Date(file.reviewedAt).toLocaleString()
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
              <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Review File
              </h2>
              <p className="text-[11px] text-slate-500">
                Approve, reject, or mark as under review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
          >
            <XMarkIcon className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* File info card */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-slate-900 break-all leading-snug">
                {file.originalName}
              </p>
              <StatusBadge status={file.status} size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <UserCircleIcon className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{file.userName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DocumentTextIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatBytes(file.size)}</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <CalendarDaysIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Uploaded {uploadedAt}</span>
              </div>
              {reviewedAt && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <EyeIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Last reviewed {reviewedAt}</span>
                </div>
              )}
              {file.description && (
                <div className="flex items-start gap-1.5 col-span-2">
                  <ChatBubbleLeftIcon className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                  <span className="text-slate-500 italic">
                    "{file.description}"
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Admin note */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin note{' '}
              <span className="font-normal normal-case text-slate-400">
                (visible to employee)
              </span>
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Add a note for the employee, e.g. 'Missing page 3' or 'All good, approved!'"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none transition"
            />
          </div>

          {/* Confirm hint */}
          {confirming && (
            <div
              className={`rounded-xl border px-4 py-2.5 text-xs font-medium ${
                confirming === 'approved'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              Click{' '}
              <strong>
                {confirming === 'approved' ? 'Approve' : 'Reject'}
              </strong>{' '}
              again to confirm this action.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 gap-3">
          {/* Mark reviewing */}
          <button
            onClick={handleReviewing}
            disabled={file.status === 'reviewing'}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            Mark reviewing
          </button>

          <div className="flex items-center gap-2">
            {/* Reject */}
            <button
              onClick={() => handleAction('rejected')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                confirming === 'rejected'
                  ? 'bg-rose-600 text-white scale-105 shadow-sm'
                  : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <XCircleIcon className="h-3.5 w-3.5" />
              {confirming === 'rejected' ? 'Confirm reject' : 'Reject'}
            </button>

            {/* Approve */}
            <button
              onClick={() => handleAction('approved')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                confirming === 'approved'
                  ? 'bg-emerald-600 text-white scale-105 shadow-sm'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              {confirming === 'approved' ? 'Confirm approve' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;