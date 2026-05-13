import React, { useState } from 'react';
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';

const ShareModal = ({ file, open, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!open || !file) return null;

  const shareUrl = `https://your-company.example.com/share/${file.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70">
      <div className="w-[90vw] max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Share this document
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Generate a share link to send this file to HR or your manager.
              (Actual access control will be handled in backend.)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-indigo-500" />
            <span className="font-medium text-slate-800">
              {file.originalName}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {file.description || 'No description provided.'}
          </p>
        </div>

        <div className="mt-3 text-xs">
          <label className="mb-1 block text-[11px] font-medium text-slate-700">
            Shareable link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700"
            />
            <button
              onClick={copyLink}
              className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          In a real deployment you can extend this panel to send the link by
          email, restrict access per user, or set expiry dates.
        </p>
      </div>
    </div>
  );
};

export default ShareModal;