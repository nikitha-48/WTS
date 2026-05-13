import React, { useState, useRef } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const FileUpload = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please choose or drop a file to upload.');
      return;
    }

    if (!onUpload) return;

    try {
      setUploading(true);
      const maybePromise = onUpload(file, description);
      if (maybePromise instanceof Promise) {
        await maybePromise;
      }
      setFile(null);
      setDescription('');
      if (inputRef.current) inputRef.current.value = '';
      if (e.target?.reset) e.target.reset();
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-3">
        <h2 className="text-lg font-bold text-slate-900">
          Add to your workspace
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload files you&apos;re working on. You can drag them here or use the button below.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ' +
            (isDragging
              ? 'border-indigo-500 bg-white'
              : 'border-slate-300 bg-white hover:border-indigo-500')
          }
        >
          <ArrowUpTrayIcon className="h-6 w-6 text-slate-500" />
          <div className="text-sm font-semibold text-slate-800">
            Drag &amp; drop files here
          </div>
          <div className="text-xs text-slate-500">
            or click to browse from your device
          </div>
          {file && (
            <div className="mt-2 max-w-[260px] truncate text-xs text-slate-600">
              Selected: {file.name}
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Notes (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Short note about this file..."
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-600">
            You can share your work later from the list using the &quot;Share&quot; action.
          </span>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-full bg-slate-900 px-5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default FileUpload;