'use client';

import { Toast } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const getBgColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getBgColor(toast.type)} max-w-sm rounded-lg p-4 text-white shadow-lg cursor-pointer animate-fade-in`}
          onClick={() => removeToast(toast.id)}
        >
          <div className="text-sm">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}
