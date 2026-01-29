import React, { useState } from 'react';
import DeviceManagement from './DeviceManagement';
import UserManagement from './UserManagement';
import Reports from './Reports';
import ThemeToggle from './ThemeToggle';

interface AdminDashboardProps {
  onBack: () => void;
  userId: number;
}

type AdminPage = 'menu' | 'devices' | 'users' | 'reports';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, userId }) => {
  const [currentPage, setCurrentPage] = useState<AdminPage>('menu');

  if (currentPage === 'devices') {
    return <DeviceManagement onBack={() => setCurrentPage('menu')} userId={userId} />;
  }

  if (currentPage === 'users') {
    return <UserManagement onBack={() => setCurrentPage('menu')} userId={userId} />;
  }

  if (currentPage === 'reports') {
    return <Reports onBack={() => setCurrentPage('menu')} userId={userId} />;
  }

  return (
    <>
      <ThemeToggle />
      <div className="container">
        <button className="button button-secondary mb-2" onClick={onBack}>
          ← Назад
        </button>

      <div className="card stat-card">
        <div className="stat-label">👑 Панель администратора</div>
        <div style={{ fontSize: '16px', marginTop: '8px', opacity: 0.9 }}>
          Управление системой учета показаний
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>🛠 Управление</h3>
        
        <button 
          className="button" 
          onClick={() => setCurrentPage('devices')}
        >
          🔧 Управление аппаратами
        </button>

        <button 
          className="button" 
          onClick={() => setCurrentPage('users')}
        >
          👥 Управление пользователями
        </button>

        <button 
          className="button" 
          onClick={() => setCurrentPage('reports')}
        >
          📊 Отчеты и статистика
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>ℹ️ Информация</h3>
        <p style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)', lineHeight: '1.6' }}>
          В панели администратора вы можете управлять всеми аспектами системы: 
          добавлять новые аппараты, приглашать пользователей и просматривать отчеты.
        </p>
      </div>
      </div>
    </>
  );
};

export default AdminDashboard;
