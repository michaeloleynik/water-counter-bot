import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import axios from 'axios';
import { db, LocalDevice, LocalUser } from './db/schema';
import { syncService } from './services/syncService';
import DeviceList from './components/DeviceList';
import ReadingForm from './components/ReadingForm';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [devices, setDevices] = useState<LocalDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<LocalDevice | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        const tgUser = WebApp.initDataUnsafe.user;
        const telegramId = tgUser?.id || 5294958157; // Ваш ID для тестов в браузере

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

    initApp();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const syncInterval = setInterval(async () => {
      const count = await syncService.getPendingReadingsCount();
      setPendingCount(count);
      const tgUserId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || user?.telegramId;
      if (count > 0 && isOnline && tgUserId) {
        await syncService.syncReadings(tgUserId);
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [isOnline, user?.telegramId]);

  if (loading) {
    return <div className="container">Загрузка...</div>;
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <h3>Доступ ограничен</h3>
          <p>Пожалуйста, используйте официальный бот для доступа.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="status-bar">
        <span>Сеть: <span className={isOnline ? 'online' : 'offline'}>{isOnline ? '● В сети' : '○ Оффлайн'}</span></span>
        {pendingCount > 0 && <span>На очереди: {pendingCount}</span>}
      </div>

      <header style={{ marginBottom: '20px', marginTop: '10px' }}>
        <h2 style={{ margin: '0' }}>Привет, {user.firstName}!</h2>
        <p style={{ color: 'var(--tg-theme-hint-color)', margin: '4px 0 0', fontSize: '14px' }}>
          {user.role === 'admin' ? '👑 Администратор' : '👷 Сотрудник'}
        </p>
      </header>

      {selectedDevice ? (
        <ReadingForm 
          device={selectedDevice} 
          onSuccess={() => setSelectedDevice(null)} 
          onCancel={() => setSelectedDevice(null)} 
        />
      ) : (
        <DeviceList 
          devices={devices} 
          onSelect={(device) => setSelectedDevice(device)} 
        />
      )}
    </div>
  );
}

export default App;
