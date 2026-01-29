import { db, LocalReading } from '../db/schema';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class SyncService {
  private isSyncing = false;

  // Проверка наличия интернета
  async checkConnection(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Синхронизация всех несинхронизированных показаний
  async syncReadings(userId: number): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('Синхронизация уже выполняется');
      return { success: 0, failed: 0 };
    }

    const hasConnection = await this.checkConnection();
    if (!hasConnection) {
      console.log('Нет подключения к интернету');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      // Получаем все несинхронизированные показания
      const pendingReadings = await db.readings
        .where('syncStatus')
        .equals('pending')
        .toArray();

      console.log(`Найдено ${pendingReadings.length} показаний для синхронизации`);

      for (const reading of pendingReadings) {
        try {
          // Помечаем как синхронизирующееся
          await db.readings.update(reading.id!, { syncStatus: 'syncing' });

          // Конвертируем base64 обратно в blob
          const blob = await this.base64ToBlob(reading.photoBase64);

          // Создаем FormData для отправки
          const formData = new FormData();
          formData.append('device_id', reading.deviceId.toString());
          formData.append('counter_value', reading.counterValue.toString());
          formData.append('photo', blob, 'photo.jpg');
          formData.append('client_timestamp', reading.timestamp.toISOString());
          
          if (reading.notes) {
            formData.append('notes', reading.notes);
          }

          // Отправляем на сервер
          const response = await axios.post(
            `${API_BASE_URL}/readings`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                // Добавьте авторизацию через Telegram Web App
                'X-Telegram-User-Id': userId.toString(),
              },
            }
          );

          // Обновляем запись - помечаем как синхронизированную
          await db.readings.update(reading.id!, {
            syncStatus: 'synced',
            serverReadingId: response.data.id,
          });

          successCount++;
          console.log(`Показание ${reading.id} успешно синхронизировано`);
        } catch (error: any) {
          failedCount++;
          console.error(`Ошибка синхронизации показания ${reading.id}:`, error);

          // Помечаем как ошибку
          await db.readings.update(reading.id!, {
            syncStatus: 'error',
            errorMessage: error.message || 'Неизвестная ошибка',
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { success: successCount, failed: failedCount };
  }

  // Сохранение показания локально
  async saveReadingLocally(reading: Omit<LocalReading, 'id' | 'syncStatus'>): Promise<number> {
    const id = await db.readings.add({
      ...reading,
      syncStatus: 'pending',
    });

    console.log(`Показание сохранено локально с ID ${id}`);

    // Пытаемся синхронизировать сразу
    setTimeout(() => {
      // Получаем userId из Telegram Web App
      if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        this.syncReadings(window.Telegram.WebApp.initDataUnsafe.user.id);
      }
    }, 100);

    return id;
  }

  // Получение несинхронизированных показаний
  async getPendingReadingsCount(): Promise<number> {
    return await db.readings
      .where('syncStatus')
      .anyOf(['pending', 'error'])
      .count();
  }

  // Конвертация base64 в Blob
  private async base64ToBlob(base64: string): Promise<Blob> {
    const response = await fetch(base64);
    return await response.blob();
  }

  // Конвертация File/Blob в base64
  static async fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const syncService = new SyncService();
