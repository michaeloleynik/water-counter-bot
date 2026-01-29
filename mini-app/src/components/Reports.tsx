import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WebApp from '@twa-dev/sdk';
import { LocalDevice } from '../db/schema';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Reading {
  id: number;
  device_id: number;
  device_name: string;
  counter_value: number;
  reading_date: string;
  user_name: string;
}

interface ReportsProps {
  onBack: () => void;
  userId: number;
}

const Reports: React.FC<ReportsProps> = ({ onBack, userId }) => {
  const [devices, setDevices] = useState<LocalDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/devices`, {
        headers: { 'X-Telegram-User-Id': userId.toString() }
      });
      setDevices(response.data);
      if (response.data.length > 0) {
        setSelectedDeviceId(response.data[0].id);
      }
    } catch (error) {
      console.error('Ошибка загрузки аппаратов:', error);
      WebApp.showAlert('Ошибка загрузки аппаратов');
    } finally {
      setLoading(false);
    }
  };

  const loadReadings = async () => {
    if (!selectedDeviceId) return;

    setLoadingReadings(true);
    try {
      console.log('Загрузка показаний для аппарата:', selectedDeviceId);
      console.log('Диапазон дат:', dateRange);
      
      const response = await axios.get(
        `${API_BASE_URL}/admin/readings/device/${selectedDeviceId}`,
        {
          params: {
            start_date: dateRange.start,
            end_date: dateRange.end
          },
          headers: { 'X-Telegram-User-Id': userId.toString() }
        }
      );
      
      console.log('Получены показания:', response.data);
      setReadings(response.data);
    } catch (error: any) {
      console.error('Ошибка загрузки показаний:', error);
      console.error('Детали ошибки:', error.response?.data);
      
      // Пробуем загрузить без фильтра по датам
      try {
        const response = await axios.get(
          `${API_BASE_URL}/readings/device/${selectedDeviceId}`,
          {
            headers: { 'X-Telegram-User-Id': userId.toString() }
          }
        );
        setReadings(response.data);
      } catch (fallbackError) {
        console.error('Запасной запрос тоже не удался:', fallbackError);
        WebApp.showAlert('Ошибка загрузки показаний. Проверьте подключение к интернету.');
      }
    } finally {
      setLoadingReadings(false);
    }
  };

  useEffect(() => {
    if (selectedDeviceId) {
      loadReadings();
    }
  }, [selectedDeviceId, dateRange]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatistics = () => {
    if (readings.length === 0) return null;

    const values = readings.map(r => r.counter_value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const consumption = max - min;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return { min, max, consumption, avg, count: readings.length };
  };

  const stats = getStatistics();

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
        <h2 style={{ marginBottom: '8px' }}>📊 Отчеты и статистика</h2>
        <p className="text-muted" style={{ fontSize: '14px' }}>
          Просмотр показаний и анализ данных
        </p>
      </div>

      <div className="card">
        <div className="input-group">
          <label className="input-label">Аппарат</label>
          <select 
            className="input"
            value={selectedDeviceId || ''}
            onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="input-group">
            <label className="input-label">С даты</label>
            <input 
              type="date"
              className="input"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">По дату</label>
            <input 
              type="date"
              className="input"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-1">
          <button 
            className="button button-sm" 
            style={{ marginTop: 0 }}
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setDateRange({ start: today, end: today });
            }}
          >
            Сегодня
          </button>
          <button 
            className="button button-sm" 
            style={{ marginTop: 0 }}
            onClick={() => {
              const end = new Date().toISOString().split('T')[0];
              const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              setDateRange({ start, end });
            }}
          >
            7 дней
          </button>
          <button 
            className="button button-sm" 
            style={{ marginTop: 0 }}
            onClick={() => {
              const end = new Date().toISOString().split('T')[0];
              const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              setDateRange({ start, end });
            }}
          >
            30 дней
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="stat-card">
            <div className="stat-label">Показаний</div>
            <div className="stat-value">{stats.count}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <div className="stat-label">Расход</div>
            <div className="stat-value">{stats.consumption.toFixed(1)}</div>
          </div>
        </div>
      )}

      {loadingReadings ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : readings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Нет данных</div>
          <div className="empty-state-text">
            За выбранный период нет показаний
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>
            История показаний ({readings.length})
          </h3>
          <div className="readings-list">
            {readings.map((reading) => (
              <div key={reading.id} className="reading-item">
                <div className="reading-header">
                  <div>
                    <div className="reading-device">{reading.user_name}</div>
                    <div className="reading-date">
                      {formatDate(reading.reading_date)}
                    </div>
                  </div>
                  <div className="reading-value">{reading.counter_value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
