export const toDate = (value) => (value instanceof Date ? value : new Date(value));

export const formatLongDate = (value) => {
  const d = toDate(value);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

export const formatShortDateTime = (value) => {
  const d = toDate(value);
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatTime = (value) => {
  const d = toDate(value);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const isSameDay = (a, b = new Date()) => {
  const d1 = toDate(a);
  const d2 = toDate(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const isWithinDays = (value, days) => {
  const d = toDate(value);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
};