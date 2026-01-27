
import React from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  return (
    <div className={`px-6 py-3 rounded-lg shadow-xl border flex items-center space-x-3 animate-in slide-in-from-right-full duration-300 ${
      type === 'success' 
        ? 'bg-arial-orange text-white border-arial-orange' 
        : 'bg-red-600 text-white border-red-800'
    }`}>
      {type === 'success' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )}
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
};

export default Toast;
