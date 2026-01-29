import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db, LocalReading } from '../db/schema';
import WebApp from '@twa-dev/sdk';
import ThemeToggle from './ThemeToggle';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ServerReading {
  id: number;
  device_name: string;
  counter_value: number;
  reading_date: string;
  user_name: string;
  photo_path?: string;
  notes?: string;
}

interface MyReadingsProps {
  onBack: () => void;
  userId: number;
}

const MyReadings: React.FC<MyReadingsProps> = ({ onBack, userId }) => {
  const [localReadings, setLocalReadings] = useState<LocalReading[]>([]);
  const [serverReadings, setServerReadings] = useState<ServerReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'local'>('all');

  useEffect(() => {
    loadReadings();
  }, []);

  const loadReadings = async () => {
    try {
      // Получаем локальные показания
      const local = await db.readings.toArray();
      setLocalReadings(local.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));

      // Получаем показания с сервера
      try {
        const response = await axios.get(`${API_BASE_URL}/readings/my`, {
          headers: { 'X-Telegram-User-Id': userId.toString() }
        });
        setServerReadings(response.data);
      } catch (error) {
        console.error('Ошибка загрузки показаний с сервера:', error);
      }
    } catch (error) {
      console.error('Ошибка загрузки показаний:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <span className="badge badge-synced">✓ Отправлено</span>;
      case 'pending':
        return <span className="badge badge-pending">⏳ В очереди</span>;
      case 'syncing':
        return <span className="badge badge-pending">↻ Отправка...</span>;
      case 'error':
        return <span className="badge badge-error">✗ Ошибка</span>;
      default:
        return <span className="badge">{status}</span>;
    }
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

  const displayReadings = tab === 'all' ? serverReadings : localReadings;
  const totalCount = tab === 'all' ? serverReadings.length : localReadings.length;

  return (
    <>
      <ThemeToggle />
      <div className="container">
        <button className="button button-secondary mb-2" onClick={onBack}>
          ← Назад
        </button>

      <div className="card">
        <h2 style={{ marginBottom: '8px' }}>📊 Мои показания</h2>
        <p className="text-muted" style={{ fontSize: '14px' }}>
          Всего загружено: {serverReadings.length} | В локальной очереди: {localReadings.filter(r => r.syncStatus !== 'synced').length}
        </p>
      </div>

      {/* Табы */}
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          🌐 Все показания ({serverReadings.length})
        </button>
        <button 
          className={`nav-tab ${tab === 'local' ? 'active' : ''}`}
          onClick={() => setTab('local')}
        >
          💾 Локальные ({localReadings.length})
        </button>
      </div>

      {totalCount === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Нет показаний</div>
          <div className="empty-state-text">
            {tab === 'all' 
              ? 'Вы еще не загрузили ни одного показания счетчика'
              : 'Нет локально сохраненных показаний'
            }
          </div>
        </div>
      ) : tab === 'local' ? (
        <div className="readings-list">
          {localReadings.map((reading) => (
            <div key={reading.id} className="reading-item">
              <div className="reading-header">
                <div>
                  <div className="reading-device">{reading.deviceName}</div>
                  <div className="reading-date">
                    {formatDate(reading.timestamp)}
                  </div>
                </div>
                <div className="reading-value">{reading.counterValue}</div>
              </div>
              
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {getSyncStatusBadge(reading.syncStatus)}
                
                {reading.photoBase64 && (
                  <button 
                    className="button button-sm" 
                    style={{ width: 'auto', marginTop: 0 }}
                    onClick={() => {
                      const win = window.open();
                      win?.document.write(`<img src="${reading.photoBase64}" style="max-width: 100%; height: auto;" />`);
                    }}
                  >
                    📷 Фото
                  </button>
                )}
              </div>

              {reading.errorMessage && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)' }}>
                  Ошибка: {reading.errorMessage}
                </div>
              )}

              {reading.notes && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--tg-theme-hint-color)' }}>
                  Примечание: {reading.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="readings-list">
          {serverReadings.map((reading) => (
            <div key={reading.id} className="reading-item">
              <div className="reading-header">
                <div>
                  <div className="reading-device">{reading.device_name}</div>
                  <div className="reading-date">
                    {formatDate(new Date(reading.reading_date))}
                  </div>
                </div>
                <div className="reading-value">{reading.counter_value}</div>
              </div>
              
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-synced">✓ На сервере</span>
                
                {reading.photo_path && (
                  <button 
                    className="button button-sm" 
                    style={{ width: 'auto', marginTop: 0 }}
                    onClick={() => {
                      const photoUrl = `${API_BASE_URL.replace('/api', '')}/uploads/${reading.photo_path}`;
                      WebApp.openLink(photoUrl);
                    }}
                  >
                    📷 Фото
                  </button>
                )}
              </div>

              {reading.notes && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--tg-theme-hint-color)' }}>
                  Примечание: {reading.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
};

export default MyReadings;
