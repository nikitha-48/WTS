// src/components/TaskRow.jsx
import React, { useState } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

const TaskRow = ({ task, onStatusChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const statusConfig = {
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
      icon: PlayIcon,
    },
    done: {
      label: 'Done',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-400',
      icon: CheckCircleIcon,
    },
  };

  const cfg = statusConfig[task?.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;

  const setStatus = (status) => {
    setMenuOpen(false);
    onStatusChange?.(task.id, status);
  };

  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-white hover:shadow-sm transition-all group">
      {/* left */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-100 shadow-sm flex-shrink-0">
          <StatusIcon
            className={`h-4 w-4 ${cfg.dot.replace('bg-', 'text-')}`}
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {task?.title || '(Untitled task)'}
          </p>
          {task?.description ? (
            <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
              {task.description}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-slate-400">
              No description
            </p>
          )}
        </div>
      </div>

      {/* right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* status pill */}
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}
          title={cfg.label}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>

        {/* menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
            aria-label="Task actions"
          >
            <EllipsisVerticalIcon className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              {/* click-away backdrop */}
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              />
              <div className="absolute right-0 mt-2 w-44 z-40 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Mark as Pending
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('in_progress')}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Mark In Progress
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('done')}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  Mark Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
};

export default TaskRow;