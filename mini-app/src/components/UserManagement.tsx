import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WebApp from '@twa-dev/sdk';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'employee';
  is_active: boolean;
}

interface UserManagementProps {
  onBack: () => void;
  userId: number;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack, userId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLinks, setInviteLinks] = useState<{ employee?: string; admin?: string }>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: { 'X-Telegram-User-Id': userId.toString() }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      WebApp.showAlert('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async (role: 'admin' | 'employee') => {
    try {
      console.log('Создание приглашения для роли:', role);
      const response = await axios.post(
        `${API_BASE_URL}/admin/invitations`,
        { role },
        {
          headers: { 'X-Telegram-User-Id': userId.toString() }
        }
      );

      console.log('Ответ сервера:', response.data);

      // Получаем bot username из Telegram или из .env
      let botUsername = '';
      try {
        // Пытаемся получить из initDataUnsafe
        const tgData = WebApp.initDataUnsafe as any;
        botUsername = tgData?.bot?.username || tgData?.bot_username;
        
        console.log('Bot username из Telegram:', botUsername);
      } catch (e) {
        console.log('Не удалось получить bot username из Telegram');
      }
      
      // Fallback: просим пользователя ввести или используем дефолтный
      if (!botUsername) {
        botUsername = 'kaskad_auqa_bot'; // Замените на имя вашего бота
      }
      
      const link = `https://t.me/${botUsername}?start=${response.data.invite_code}`;
      
      setInviteLinks({ ...inviteLinks, [role]: link });
      
      // Копируем в буфер обмена
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(link);
          WebApp.showAlert('✅ Ссылка скопирована в буфер обмена!\n\nОтправьте её новому пользователю.');
        } else {
          WebApp.showAlert(`✅ Ссылка для приглашения создана!\n\n${link}\n\nСкопируйте и отправьте её новому пользователю.`);
        }
      } catch (clipError) {
        console.log('Ошибка копирования в буфер:', clipError);
        WebApp.showAlert(`✅ Ссылка создана:\n\n${link}\n\nСкопируйте её вручную.`);
      }
    } catch (error: any) {
      console.error('Ошибка создания приглашения:', error);
      console.error('Детали ошибки:', error.response?.data);
      WebApp.showAlert(`❌ Ошибка создания ссылки-приглашения\n\n${error.response?.data?.error || error.message}`);
    }
  };

  const deactivateUser = async (userToDeactivate: User) => {
    if (userToDeactivate.telegram_id === userId) {
      WebApp.showAlert('❌ Вы не можете удалить самого себя');
      return;
    }

    WebApp.showConfirm(
      `Деактивировать пользователя ${userToDeactivate.first_name || 'без имени'}?`,
      async (confirmed) => {
        if (!confirmed) return;

        try {
          await axios.delete(`${API_BASE_URL}/admin/users/${userToDeactivate.id}`, {
            headers: { 'X-Telegram-User-Id': userId.toString() }
          });
          WebApp.showAlert('✅ Пользователь деактивирован');
          loadUsers();
        } catch (error) {
          console.error('Ошибка деактивации пользователя:', error);
          WebApp.showAlert('Ошибка деактивации пользователя');
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="button button-secondary mb-2" onClick={onBack}>
        ← Назад
      </button>

      <div className="card">
        <h2 style={{ marginBottom: '4px' }}>👥 Управление пользователями</h2>
        <p className="text-muted" style={{ fontSize: '14px' }}>
          Всего пользователей: {users.length}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>🔗 Пригласить пользователя</h3>
        
        <button 
          className="button"
          onClick={() => generateInviteLink('employee')}
        >
          👷 Пригласить сотрудника
        </button>

        {inviteLinks.employee && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px', fontSize: '12px', wordBreak: 'break-all' }}>
            <strong>Ссылка для сотрудника:</strong><br/>
            {inviteLinks.employee}
          </div>
        )}

        <button 
          className="button"
          onClick={() => generateInviteLink('admin')}
        >
          👑 Пригласить администратора
        </button>

        {inviteLinks.admin && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(103, 126, 234, 0.1)', borderRadius: '8px', fontSize: '12px', wordBreak: 'break-all' }}>
            <strong>Ссылка для администратора:</strong><br/>
            {inviteLinks.admin}
          </div>
        )}

        <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
          ⚠️ Ссылки действительны 7 дней
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Список пользователей</h3>
        
        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">Нет пользователей</div>
          </div>
        ) : (
          <div className="user-list">
            {users.map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-info">
                  <div className="user-name">
                    {user.first_name || 'Без имени'} {user.last_name || ''}
                  </div>
                  <div className="user-role">
                    {user.username && `@${user.username} • `}
                    {user.role === 'admin' ? (
                      <span className="badge badge-admin">👑 Администратор</span>
                    ) : (
                      <span className="badge badge-employee">👷 Сотрудник</span>
                    )}
                  </div>
                </div>
                
                {user.telegram_id !== userId && (
                  <button 
                    className="button button-danger button-sm" 
                    style={{ width: 'auto', marginTop: 0 }}
                    onClick={() => deactivateUser(user)}
                  >
                    🗑️ Удалить
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
