// src/components/PreviewModal.jsx
import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const PreviewModal = ({ file, open, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!open || !file) {
      setLoading(true);
      setContent('');
      setPreviewError(false);
      return;
    }

    loadPreview();
  }, [open, file]);

  const loadPreview = async () => {
    setLoading(true);
    setPreviewError(false);
    setContent('');

    try {
      const { mimeType, originalName, file: fileObj, url } = file;
      const type = mimeType?.toLowerCase() || '';
      const name = originalName?.toLowerCase() || '';

      // Text files - use FileReader if we have the File object
      if (
        type.includes('text') ||
        type.includes('plain') ||
        type.includes('json') ||
        type.includes('csv') ||
        type.includes('xml') ||
        type.includes('html') ||
        name.match(/\.(txt|csv|json|xml|html|log)$/)
      ) {
        if (fileObj instanceof File) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setContent(e.target.result);
            setLoading(false);
          };
          reader.onerror = () => {
            setPreviewError(true);
            setLoading(false);
          };
          reader.readAsText(fileObj);
          return;
        }
      }

      // For images and PDFs, just wait for them to load
      setLoading(false);
    } catch (error) {
      console.error('Error loading preview:', error);
      setPreviewError(true);
      setLoading(false);
    }
  };

  if (!open || !file) return null;

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = file.mimeType?.toLowerCase().includes('image');
  const isPdf =
    file.mimeType?.toLowerCase().includes('pdf') ||
    file.originalName?.toLowerCase().endsWith('.pdf');
  const isText =
    file.mimeType?.toLowerCase().includes('text') ||
    file.mimeType?.toLowerCase().includes('plain') ||
    file.mimeType?.toLowerCase().includes('json') ||
    file.mimeType?.toLowerCase().includes('csv') ||
    file.mimeType?.toLowerCase().includes('xml') ||
    file.mimeType?.toLowerCase().includes('html') ||
    file.originalName?.toLowerCase().match(/\.(txt|csv|json|xml|html|log)$/);

  const canPreview = isImage || isPdf || isText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <DocumentTextIcon className="h-5 w-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900">
                {file.originalName}
              </h2>
              <p className="truncate text-xs text-slate-500">
                {file.description || 'No description'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  Loading preview...
                </p>
              </div>
            </div>
          )}

          {!loading && !previewError && (
            <>
              {/* Image Preview */}
              {isImage && (
                <div className="flex items-center justify-center bg-white rounded-xl p-4 border border-slate-200">
                  <img
                    src={file.url}
                    alt={file.originalName}
                    className="max-h-[600px] max-w-full rounded-lg object-contain"
                    onError={() => setPreviewError(true)}
                  />
                </div>
              )}

              {/* PDF Preview */}
              {isPdf && (
                <div className="w-full h-[700px] rounded-xl overflow-hidden bg-white border border-slate-200">
                  <iframe
                    src={file.url}
                    className="w-full h-full border-0"
                    title={file.originalName}
                    onError={() => setPreviewError(true)}
                  />
                </div>
              )}

              {/* Text Preview */}
              {isText && content && (
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-auto max-h-[600px] border border-slate-800">
                  <pre className="whitespace-pre-wrap break-words">
                    {content}
                  </pre>
                </div>
              )}

              {/* Unsupported Type */}
              {!canPreview && (
                <div className="flex flex-col items-center justify-center bg-white rounded-xl p-8 text-center border-2 border-dashed border-slate-300">
                  <DocumentTextIcon className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-700 font-semibold mb-2">
                    Cannot preview {file.originalName}
                  </p>
                  <p className="text-slate-500 text-sm mb-6">
                    This file type cannot be previewed online. Please download
                    it to view.
                  </p>
                  <button
                    onClick={downloadFile}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download instead
                  </button>
                </div>
              )}
            </>
          )}

          {previewError && (
            <div className="flex flex-col items-center justify-center bg-white rounded-xl p-8 text-center border-2 border-dashed border-slate-300">
              <DocumentTextIcon className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-700 font-semibold mb-2">
                Could not load preview
              </p>
              <p className="text-slate-500 text-sm mb-6">
                There was an error loading the file preview.
              </p>
              <button
                onClick={downloadFile}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download instead
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            {file.size
              ? (() => {
                  const sizes = ['B', 'KB', 'MB', 'GB'];
                  let sizeIndex = 0;
                  let sizeValue = file.size;
                  while (
                    sizeValue >= 1024 &&
                    sizeIndex < sizes.length - 1
                  ) {
                    sizeValue /= 1024;
                    sizeIndex++;
                  }
                  return `${sizeValue.toFixed(1)} ${sizes[sizeIndex]}`;
                })()
              : 'Unknown size'}
          </p>
          <button
            onClick={downloadFile}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;