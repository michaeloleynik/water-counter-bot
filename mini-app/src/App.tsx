import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import axios from 'axios';
import { db, LocalDevice, LocalUser } from './db/schema';
import { syncService } from './services/syncService';
import DeviceList from './components/DeviceList';
import ReadingForm from './components/ReadingForm';
import MyReadings from './components/MyReadings';
import AdminDashboard from './components/AdminDashboard';
import Toast from './components/Toast';
import ThemeToggle from './components/ThemeToggle';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Page = 'home' | 'addReading' | 'myReadings' | 'admin';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [devices, setDevices] = useState<LocalDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<LocalDevice | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    initApp();

    const handleOnline = () => {
      setIsOnline(true);
      showToast('🌐 Интернет подключен! Синхронизация...', 'success');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      showToast('📡 Нет интернета. Работаем в оффлайн режиме', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const syncInterval = setInterval(async () => {
      const count = await syncService.getPendingReadingsCount();
      const oldCount = pendingCount;
      setPendingCount(count);
      
      const tgUserId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || user?.telegramId;
      if (count > 0 && isOnline && tgUserId && !isSyncing) {
        setIsSyncing(true);
        const result = await syncService.syncReadings(tgUserId);
        setIsSyncing(false);
        
        // Обновляем счетчик после синхронизации
        const newCount = await syncService.getPendingReadingsCount();
        setPendingCount(newCount);
        
        // Показываем уведомление если что-то синхронизировалось
        if (result.success > 0) {
          showToast(`✅ Отправлено ${result.success} показаний на сервер!`, 'success');
        }
        if (result.failed > 0) {
          showToast(`⚠ Не удалось отправить ${result.failed} показаний`, 'error');
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [isOnline, user?.telegramId, pendingCount, isSyncing]);

  const initApp = async () => {
    try {
      const tgUser = WebApp.initDataUnsafe.user;
      const telegramId = tgUser?.id || 496386410;  // 5294958157; // Ваш ID для тестов в браузере

      // 1. Получаем инфо о пользователе
      try {
        const userResponse = await axios.get(`${API_BASE_URL}/me`, {
          headers: { 'X-Telegram-User-Id': telegramId.toString() }
        });
        const userData: LocalUser = {
          telegramId: telegramId,
          firstName: userResponse.data.first_name,
          lastName: userResponse.data.last_name,
          username: userResponse.data.username,
          role: userResponse.data.role,
          lastSyncedAt: new Date()
        };
        setUser(userData);
        await db.users.put(userData);
      } catch (e) {
        const localUser = await db.users.get(telegramId);
        if (localUser) setUser(localUser);
      }

      // 2. Получаем список аппаратов
      try {
        const devicesResponse = await axios.get(`${API_BASE_URL}/devices`, {
          headers: { 'X-Telegram-User-Id': telegramId.toString() }
        });
        const devicesData: LocalDevice[] = devicesResponse.data;
        setDevices(devicesData);
        await db.devices.clear();
        await db.devices.bulkPut(devicesData);
      } catch (e) {
        const localDevices = await db.devices.toArray();
        setDevices(localDevices);
      }

      const count = await syncService.getPendingReadingsCount();
      setPendingCount(count);

    } catch (error) {
      console.error('Ошибка инициализации:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReadingSuccess = async () => {
    const count = await syncService.getPendingReadingsCount();
    setPendingCount(count);
    
    // Сначала показываем toast
    if (isOnline) {
      showToast('✅ Показание сохранено и отправляется на сервер...', 'success');
    } else {
      showToast('💾 Показание сохранено локально. Будет отправлено при подключении к интернету', 'info');
    }
    
    // Затем перенаправляем на главную
    setSelectedDevice(null);
    setCurrentPage('home');
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

  if (!user) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">🔐</div>
          <div className="empty-state-title">Доступ ограничен</div>
          <div className="empty-state-text">
            Пожалуйста, используйте официальный бот для доступа
          </div>
        </div>
      </div>
    );
  }

  // Страница добавления показания
  if (currentPage === 'addReading') {
    if (selectedDevice) {
      return (
        <ReadingForm 
          device={selectedDevice} 
          onSuccess={handleReadingSuccess} 
          onCancel={() => {
            setSelectedDevice(null);
            setCurrentPage('home');
          }} 
        />
      );
    }
    return (
      <div className="container">
        <button 
          className="button button-secondary mb-2" 
          onClick={() => setCurrentPage('home')}
        >
          ← Назад
        </button>
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>📝 Загрузка показаний</h2>
          <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
            Выберите аппарат для загрузки показаний
          </p>
        </div>
        <DeviceList 
          devices={devices} 
          onSelect={(device) => setSelectedDevice(device)} 
        />
      </div>
    );
  }

  // Страница моих показаний
  if (currentPage === 'myReadings') {
    return (
      <MyReadings 
        onBack={() => setCurrentPage('home')} 
        userId={user.telegramId}
      />
    );
  }

  // Админ-панель
  if (currentPage === 'admin') {
    if (user.role !== 'admin') {
      return (
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <div className="empty-state-title">Доступ запрещен</div>
            <div className="empty-state-text">
              Эта функция доступна только администраторам
            </div>
            <button className="button mt-3" onClick={() => setCurrentPage('home')}>
              ← Вернуться на главную
            </button>
          </div>
        </div>
      );
    }
    return (
      <AdminDashboard 
        onBack={() => setCurrentPage('home')} 
        userId={user.telegramId}
      />
    );
  }

  // Главная страница
  return (
    <>
      <ThemeToggle />
      
      <div className="container">
        {/* Тосты */}
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}

      {/* Приветствие */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
          👋 Привет, {user.firstName}!
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
          {user.role === 'admin' ? '👑 Администратор' : '👷 Сотрудник'}
        </p>
      </div>

      {/* Статус бар */}
      <div className="status-bar" style={{
        background: isOnline 
          ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.2))' 
          : 'linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.2))',
        border: `2px solid ${isOnline ? 'var(--success)' : 'var(--warning)'}`,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            fontSize: '20px',
            animation: !isOnline ? 'pulse 2s infinite' : 'none'
          }}>
            {isOnline ? '🌐' : '📡'}
          </span>
          <span className={isOnline ? 'online' : 'offline'}>
            {isOnline ? 'Онлайн' : 'Оффлайн режим'}
          </span>
        </span>
        {pendingCount > 0 && (
          <span className="badge badge-warning" style={{
            animation: isSyncing ? 'pulse 1s infinite' : 'none'
          }}>
            {isSyncing ? '↻ Отправка...' : `⏳ В очереди: ${pendingCount}`}
          </span>
        )}
        {pendingCount === 0 && isOnline && (
          <span className="badge badge-synced">✓ Синхронизировано</span>
        )}
      </div>

      {/* Навигационные табы */}
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentPage('home')}
        >
          🏠 Главная
        </button>
        <button 
          className="nav-tab"
          onClick={() => setCurrentPage('addReading')}
        >
          📝 Показания
        </button>
        <button 
          className="nav-tab"
          onClick={() => setCurrentPage('myReadings')}
        >
          📊 История
        </button>
        {user.role === 'admin' && (
          <button 
            className="nav-tab"
            onClick={() => setCurrentPage('admin')}
          >
            ⚙️ Админ
          </button>
        )}
      </div>

      {/* Быстрые действия */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>🚀 Быстрые действия</h3>
        
        <button 
          className="button"
          onClick={() => setCurrentPage('addReading')}
        >
          📝 Загрузить показания
        </button>

        <button 
          className="button button-secondary"
          onClick={() => setCurrentPage('myReadings')}
        >
          📊 Мои показания
        </button>

        {user.role === 'admin' && (
          <button 
            className="button"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            onClick={() => setCurrentPage('admin')}
          >
            👑 Панель администратора
          </button>
        )}
      </div>

      {/* Статистика */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>📈 Информация</h3>
        <div className="grid grid-cols-2 gap-2">
          <div style={{ 
            padding: '16px', 
            background: 'rgba(33, 150, 243, 0.1)', 
            borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)' }}>
              {devices.length}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>
              Аппаратов
            </div>
          </div>
          <div style={{ 
            padding: '16px', 
            background: `${isOnline ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 72, 0, 0.1)'}`, 
            borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: `${isOnline ? 'var(--success)' : 'var(--danger)'}` }}>
              {isOnline ? '✓' : '○'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>
              {isOnline ? 'Онлайн' : 'Оффлайн'}
            </div>
          </div>
        </div>
      </div>

      {/* Информация о приложении */}
      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>💡 О приложении</h3>
        <p style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)', lineHeight: '1.6' }}>
          Это приложение позволяет загружать показания счетчиков водных аппаратов. 
          Все данные сохраняются локально и автоматически отправляются на сервер при наличии интернета.
        </p>
      </div>
      </div>
    </>
  );
}

export default App;
