import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { LocalDevice } from '../db/schema';
import { syncService, SyncService } from '../services/syncService';

interface ReadingFormProps {
  device: LocalDevice;
  onSuccess: () => void;
  onCancel: () => void;
}

const ReadingForm: React.FC<ReadingFormProps> = ({ device, onSuccess, onCancel }) => {
  const [counterValue, setCounterValue] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastReading, setLastReading] = useState<number | null>(null);
  const [loadingLastReading, setLoadingLastReading] = useState(true);
  const [error, setError] = useState<string>('');

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    // Загружаем последнее показание для этого аппарата
    const loadLastReading = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const tgUserId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || 5294958157;
        
        const response = await fetch(`${API_BASE_URL}/devices/${device.id}/last-reading`, {
          headers: { 'X-Telegram-User-Id': tgUserId.toString() }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.counter_value) {
            setLastReading(data.counter_value);
          }
        }
      } catch (error) {
        console.log('Не удалось загрузить последнее показание:', error);
      } finally {
        setLoadingLastReading(false);
      }
    };

    loadLastReading();
  }, [device.id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCounterValueChange = (value: string) => {
    // Разрешаем только цифры, точку и запятую
    const sanitized = value.replace(/[^\d.,]/g, '');
    
    // Заменяем запятую на точку для консистентности
    const normalized = sanitized.replace(',', '.');
    
    // Проверяем, что не больше одной точки
    const parts = normalized.split('.');
    if (parts.length > 2) {
      return; // Игнорируем ввод, если больше одной точки
    }
    
    setCounterValue(normalized);
    setError('');
  };

  const validateCounterValue = (value: string): boolean => {
    if (!value) {
      setError('Введите показание счетчика');
      return false;
    }

    const numValue = parseFloat(value);

    // Проверка на отрицательное значение
    if (numValue < 0) {
      setError('Показание не может быть отрицательным');
      return false;
    }

    // Проверка, что больше или равно предыдущему
    if (lastReading !== null && numValue < lastReading) {
      setError(`Показание должно быть не меньше предыдущего (${lastReading})`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!counterValue || !photo) {
      WebApp.showAlert('Заполните все поля и сделайте фото!');
      return;
    }

    // Валидация показания
    if (!validateCounterValue(counterValue)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const base64 = await SyncService.fileToBase64(photo);
      
      await syncService.saveReadingLocally({
        deviceId: device.id,
        deviceName: device.name,
        counterValue: parseFloat(counterValue),
        photoBase64: base64,
        timestamp: new Date()
      });

      // Просто вызываем onSuccess, который покажет toast и перенаправит
      onSuccess();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      WebApp.showAlert('❌ Ошибка при сохранении данных\n\nПопробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reading-form">
      <button className="button" style={{ backgroundColor: '#666', marginBottom: '16px' }} onClick={onCancel}>
        ◀️ К списку аппаратов
      </button>

      {/* Индикатор статуса интернета */}
      <div style={{
        padding: '12px 16px',
        marginBottom: '16px',
        borderRadius: 'var(--radius-md)',
        background: isOnline 
          ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.2))' 
          : 'linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.2))',
        border: `2px solid ${isOnline ? 'var(--success)' : 'var(--warning)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <span style={{ fontSize: '24px' }}>
          {isOnline ? '🌐' : '📡'}
        </span>
        <div style={{ flex: 1 }}>
          {isOnline ? (
            <>
              <div style={{ color: 'var(--success)' }}>✓ Онлайн</div>
              <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>
                Показания будут отправлены сразу на сервер
              </div>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--warning)' }}>⚠ Оффлайн режим</div>
              <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>
                Показания сохранятся локально и отправятся автоматически при появлении интернета
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="card">
        <h3>{device.name}</h3>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>{device.location}</p>
      </div>

      <div className="card">
        <h4>Ввод показаний</h4>
        <div className="input-group">
          <label className="input-label">Значение счетчика</label>
          {loadingLastReading ? (
            <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>
              Загрузка предыдущего показания...
            </div>
          ) : lastReading !== null ? (
            <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>
              📊 Предыдущее показание: <strong>{lastReading}</strong>
            </div>
          ) : null}
          <input 
            type="text" 
            inputMode="decimal"
            className="input" 
            placeholder="Например: 123.45" 
            value={counterValue}
            onChange={(e) => handleCounterValueChange(e.target.value)}
            disabled={isSubmitting}
            style={{
              borderColor: error ? 'var(--danger)' : undefined
            }}
          />
          {error && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              fontSize: '14px'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
        
        <div className="input-group">
          <label className="input-label">Фотография счетчика</label>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            onChange={handlePhotoChange}
            disabled={isSubmitting}
            style={{ display: 'none' }}
            id="hidden-photo-input"
          />
          <button 
            className="button" 
            style={{ backgroundColor: '#f0f0f0', color: '#000', border: '1px solid #ccc' }}
            onClick={() => document.getElementById('hidden-photo-input')?.click()}
          >
            {photo ? '📸 Сменить фото' : '📷 Сделать фото'}
          </button>
          
          {preview && (
            <img src={preview} alt="Preview" className="photo-preview" />
          )}
        </div>

        <button 
          className="button" 
          onClick={handleSubmit}
          disabled={isSubmitting || !counterValue || !photo}
          style={{
            background: navigator.onLine 
              ? 'var(--tg-theme-button-color)' 
              : 'linear-gradient(135deg, #FF9800, #F57C00)'
          }}
        >
          {isSubmitting 
            ? '💾 Сохранение...' 
            : navigator.onLine 
              ? '✅ Отправить на сервер' 
              : '💾 Сохранить локально (оффлайн)'}
        </button>
      </div>
    </div>
  );
};

export default ReadingForm;
