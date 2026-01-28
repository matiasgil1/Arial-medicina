
import React from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  return (
    <div className={`px-6 py-4 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.15)] border-2 flex items-center space-x-4 animate-in slide-in-from-right-full duration-500 backdrop-blur-sm ${
      type === 'success' 
        ? 'bg-arial-orange/95 text-white border-white/20' 
        : 'bg-red-600/95 text-white border-white/20'
    }`}>
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
        {type === 'success' ? (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        )}
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest">{message}</span>
    </div>
  );
};

export default Toast;
