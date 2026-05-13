// src/components/StatusBadge.jsx
import React from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const config = {
  pending: {
    label: 'Pending Review',
    icon: ClockIcon,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
    iconColor: 'text-amber-500',
  },
  reviewing: {
    label: 'Under Review',
    icon: EyeIcon,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
    iconColor: 'text-blue-500',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircleIcon,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-400',
    iconColor: 'text-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircleIcon,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-400',
    iconColor: 'text-rose-500',
  },
};

const StatusBadge = ({ status, size = 'md' }) => {
  const cfg = config[status] || config.pending;
  const Icon = cfg.icon;

  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : 'px-3 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${cfg.className} ${sizeClass}`}
    >
      <Icon className={`h-3 w-3 ${cfg.iconColor}`} />
      {cfg.label}
    </span>
  );
};

export default StatusBadge;