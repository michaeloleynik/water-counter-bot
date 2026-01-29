import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return 'var(--success)';
      case 'error': return 'var(--danger)';
      case 'warning': return 'var(--warning)';
      case 'info': return 'var(--info)';
      default: return 'var(--primary)';
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        left: '20px',
        maxWidth: '400px',
        margin: '0 auto',
        background: 'var(--tg-theme-bg-color)',
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,
        animation: 'slideDown 0.3s ease',
        border: `2px solid ${getColor()}`,
        color: 'var(--tg-theme-text-color)'
      }}
    >
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: getColor(),
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          color: 'var(--tg-theme-hint-color)',
          padding: 0,
          width: '24px',
          height: '24px'
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
