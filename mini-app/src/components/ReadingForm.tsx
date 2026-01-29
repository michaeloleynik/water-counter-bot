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

  const handleSubmit = async () => {
    if (!counterValue || !photo) {
      WebApp.showAlert('Заполните все поля и сделайте фото!');
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

      WebApp.showConfirm('Показания сохранены локально и будут отправлены при наличии интернета.', () => {
        onSuccess();
      });
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      WebApp.showAlert('Ошибка при сохранении данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reading-form">
      <button className="button" style={{ backgroundColor: '#666', marginBottom: '16px' }} onClick={onCancel}>
        ◀️ К списку аппаратов
      </button>
      
      <div className="card">
        <h3>{device.name}</h3>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>{device.location}</p>
      </div>

      <div className="card">
        <h4>Ввод показаний</h4>
        <div className="input-group">
          <label className="input-label">Значение счетчика</label>
          <input 
            type="number" 
            className="input" 
            placeholder="Введите цифры..." 
            value={counterValue}
            onChange={(e) => setCounterValue(e.target.value)}
            disabled={isSubmitting}
          />
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
        >
          {isSubmitting ? 'Сохранение...' : '✅ Отправить'}
        </button>
      </div>
    </div>
  );
};

export default ReadingForm;
