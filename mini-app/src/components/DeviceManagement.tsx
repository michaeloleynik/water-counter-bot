import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WebApp from '@twa-dev/sdk';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Device {
  id: number;
  name: string;
  location?: string;
  serial_number?: string;
  description?: string;
}

interface DeviceManagementProps {
  onBack: () => void;
  userId: number;
}

const DeviceManagement: React.FC<DeviceManagementProps> = ({ onBack, userId }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    serial_number: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/devices`, {
        headers: { 'X-Telegram-User-Id': userId.toString() }
      });
      setDevices(response.data);
    } catch (error) {
      console.error('Ошибка загрузки аппаратов:', error);
      WebApp.showAlert('Ошибка загрузки аппаратов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      WebApp.showAlert('Введите название аппарата');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/admin/devices`,
        {
          name: formData.name,
          location: formData.location || undefined,
          serial_number: formData.serial_number || undefined,
          description: formData.description || undefined
        },
        {
          headers: { 'X-Telegram-User-Id': userId.toString() }
        }
      );

      WebApp.showAlert('✅ Аппарат успешно добавлен!');
      setFormData({ name: '', location: '', serial_number: '', description: '' });
      setShowAddForm(false);
      loadDevices();
    } catch (error: any) {
      console.error('Ошибка создания аппарата:', error);
      WebApp.showAlert(error.response?.data?.error || 'Ошибка при создании аппарата');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="container">
      <button className="button button-secondary mb-2" onClick={onBack}>
        ← Назад
      </button>

      <div className="card">
        <div className="flex justify-between items-center">
          <div>
            <h2 style={{ marginBottom: '4px' }}>🔧 Управление аппаратами</h2>
            <p className="text-muted" style={{ fontSize: '14px' }}>
              Всего аппаратов: {devices.length}
            </p>
          </div>
          <button 
            className="button button-sm" 
            style={{ width: 'auto', marginTop: 0 }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '✕' : '+ Добавить'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>➕ Новый аппарат</h3>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Название *</label>
              <input 
                type="text"
                className="input"
                placeholder="Например: Счетчик №1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={submitting}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Местоположение</label>
              <input 
                type="text"
                className="input"
                placeholder="Например: Подвал, корпус А"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={submitting}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Серийный номер</label>
              <input 
                type="text"
                className="input"
                placeholder="Например: SN-12345"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                disabled={submitting}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Описание</label>
              <textarea 
                className="input"
                placeholder="Дополнительная информация..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={submitting}
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div className="action-buttons">
              <button 
                type="button"
                className="button button-secondary" 
                onClick={() => setShowAddForm(false)}
                disabled={submitting}
              >
                Отмена
              </button>
              <button 
                type="submit"
                className="button button-success" 
                disabled={submitting}
              >
                {submitting ? 'Создание...' : '✓ Создать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔧</div>
          <div className="empty-state-title">Нет аппаратов</div>
          <div className="empty-state-text">
            Добавьте первый аппарат для начала работы
          </div>
        </div>
      ) : (
        <div className="device-list">
          {devices.map((device) => (
            <div key={device.id} className="card">
              <div className="device-name">{device.name}</div>
              {device.location && (
                <div className="device-location">📍 {device.location}</div>
              )}
              {device.serial_number && (
                <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>
                  S/N: {device.serial_number}
                </div>
              )}
              {device.description && (
                <div style={{ fontSize: '14px', marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                  {device.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
