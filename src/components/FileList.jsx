// src/components/FileList.jsx
import React, { useEffect, useState } from 'react';
import {
  DocumentTextIcon,
  EyeIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Helper to get a friendly name for the file type
const getFriendlyFileType = (mimeType = '', fileName = '') => {
  const type = mimeType.toLowerCase();
  const name = fileName.toLowerCase();

  if (type.includes('pdf') || name.endsWith('.pdf')) return 'PDF Document';
  if (type.includes('word') || name.match(/\.(doc|docx)$/)) return 'Word Document';
  if (type.includes('sheet') || type.includes('excel') || name.match(/\.(xls|xlsx)$/)) return 'Excel Sheet';
  if (type.includes('presentation') || name.match(/\.(ppt|pptx)$/)) return 'PowerPoint';
  if (type.includes('image')) return 'Image File';
  if (name.endsWith('.csv')) return 'CSV File';
  if (name.endsWith('.json')) return 'JSON File';
  if (type.includes('zip') || name.match(/\.(zip|rar|7z)$/)) return 'Archive';
  
  return 'Generic File';
};

const getFileIcon = (mimeType = '', fileName = '') => {
  const type = mimeType.toLowerCase();
  const name = fileName.toLowerCase();
  
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
        <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
          <text x="4" y="14" fontSize="7" fontWeight="bold" fill="white">PDF</text>
        </svg>
      </div>
    );
  }
  
  if (type.includes('word') || name.match(/\.(doc|docx)$/)) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
        </svg>
      </div>
    );
  }
  
  if (type.includes('sheet') || name.match(/\.(xls|xlsx)$/)) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
        <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
        </svg>
      </div>
    );
  }
  
  if (type.includes('presentation') || name.match(/\.(ppt|pptx)$/)) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
        <svg className="h-5 w-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
        </svg>
      </div>
    );
  }
  
  if (type.includes('image')) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
      <DocumentTextIcon className="h-5 w-5 text-slate-500" />
    </div>
  );
};

const FileList = ({
  files = [],
  isAdmin = false,
  onPreview,
  onShare,
  onStatusChange,
  onReview,
}) => {
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, [showToast]);

  const handleDownload = (file) => {
    if (!file?.url) {
      setToastMessage('Download failed: file unavailable');
      setShowToast(true);
      return;
    }

    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage('Successfully downloaded');
    setShowToast(true);
  };

  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">
            No files found
          </p>
          <p className="text-xs text-slate-400">
            Files will appear here once uploaded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-5 py-3 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                User
              </span>
            </th>
            <th className="px-5 py-3 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                File
              </span>
            </th>
            <th className="px-5 py-3 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Description
              </span>
            </th>
            <th className="px-5 py-3 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Date
              </span>
            </th>
            <th className="px-5 py-3 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Time
              </span>
            </th>
            <th className="px-5 py-3 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Size
              </span>
            </th>
            {isAdmin && (
              <th className="px-5 py-3 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Status
                </span>
              </th>
            )}
            <th className="px-5 py-3 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Actions
              </span>
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-slate-100">
          {files.map((file) => {
            const fileDate = file.createdAt
              ? new Date(file.createdAt).toLocaleDateString('en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—';

            const fileTime = file.createdAt
              ? new Date(file.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : '—';

            const fileSize = file.size
              ? (() => {
                  const sizes = ['B', 'KB', 'MB', 'GB'];
                  let sizeIndex = 0;
                  let sizeValue = file.size;
                  while (sizeValue >= 1024 && sizeIndex < sizes.length - 1) {
                    sizeValue /= 1024;
                    sizeIndex++;
                  }
                  return `${sizeValue.toFixed(1)} ${sizes[sizeIndex]}`;
                })()
              : '—';

            return (
              <tr
                key={file.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                {/* User Info */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
                      {file.userName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {file.userName || 'Unknown'}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {file.userEmail || 'N/A'}
                      </p>
                    </div>
                  </div>
                </td>

                {/* File Name with Icon */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.mimeType, file.originalName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {file.originalName || 'Unnamed'}
                      </p>
                      {/* === CHANGED LINE HERE === */}
                      <p className="truncate text-[10px] text-slate-500">
                        {getFriendlyFileType(file.mimeType, file.originalName)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Description */}
                <td className="px-5 py-3">
                  <p className="max-w-xs truncate text-xs text-slate-700">
                    {file.description || '—'}
                  </p>
                </td>

                {/* Date */}
                <td className="px-5 py-3">
                  <p className="text-xs font-semibold text-slate-800">
                    {fileDate}
                  </p>
                </td>

                {/* Time */}
                <td className="px-5 py-3">
                  <p className="text-xs font-semibold text-slate-800">
                    {fileTime}
                  </p>
                </td>

                {/* Size */}
                <td className="px-5 py-3">
                  <p className="text-xs font-semibold text-slate-800">
                    {fileSize}
                  </p>
                </td>

                {/* Status (Admin Only) */}
                {isAdmin && (
                  <td className="px-5 py-3">
                    <div className="inline-flex">
                      {file.status === 'pending' && (
                        <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          <span className="text-[10px] font-semibold text-amber-700">
                            Pending
                          </span>
                        </div>
                      )}
                      {file.status === 'reviewing' && (
                        <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                          <span className="text-[10px] font-semibold text-blue-700">
                            Reviewing
                          </span>
                        </div>
                      )}
                      {file.status === 'approved' && (
                        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-700">
                            Approved
                          </span>
                        </div>
                      )}
                      {file.status === 'rejected' && (
                        <div className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          <span className="text-[10px] font-semibold text-rose-700">
                            Rejected
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                )}

                {/* Actions - Icons Only */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {/* Preview Button - Icon Only */}
                    <button
                      onClick={() => onPreview?.(file)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all active:scale-95"
                      title="Preview file"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>

                    {/* Share Button - Icon Only */}
                    <button
                      onClick={() => onShare?.(file)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-all active:scale-95"
                      title="Share file"
                    >
                      <ShareIcon className="h-4 w-4" />
                    </button>

                    {/* Download Button - Icon Only */}
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-all active:scale-95"
                      title="Download file"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>

                    {/* Review Button - Icon Only (Admin Only) */}
                    {isAdmin && file.status !== 'approved' && (
                      <button
                        onClick={() => onReview?.(file)}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95"
                        title="Review file"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    )}

                    {/* More Actions Dropdown */}
                    <button 
                      className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-all"
                      title="More options"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl ring-1 ring-black/10">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default FileList;