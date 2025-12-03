import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  };
  
  const Icon = icons[type];

  return (
    <div className={`fixed bottom-6 right-6 z-[70] flex items-center p-4 rounded-xl border shadow-lg max-w-md animate-slide-up ${styles[type]}`}>
      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
      <span className="font-medium mr-4 text-sm">{message}</span>
      <button onClick={onClose} className="hover:opacity-60 transition-opacity"><X className="w-4 h-4" /></button>
    </div>
  );
};