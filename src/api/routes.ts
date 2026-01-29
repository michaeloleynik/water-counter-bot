import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { userService } from '../services/UserService';
import { deviceService } from '../services/DeviceService';
import { readingService } from '../services/ReadingService';
import { invitationService } from '../services/InvitationService';
import { fileHelper } from '../utils/fileHelper';

const router = express.Router();

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Middleware для проверки Telegram User ID
const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const telegramUserId = req.headers['x-telegram-user-id'];

  if (!telegramUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await userService.findByTelegramId(parseInt(telegramUserId as string));

  if (!user || !user.is_active) {
    return res.status(403).json({ error: 'Access denied' });
  }

  (req as any).user = user;
  next();
};

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Получение списка аппаратов
router.get('/devices', authenticateUser, async (req: Request, res: Response) => {
  try {
    const devices = await deviceService.getAll();
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение последнего показания для аппарата
router.get('/devices/:deviceId/last-reading', authenticateUser, async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const lastReading = await readingService.getLatestReading(deviceId);
    
    if (!lastReading) {
      return res.json({ counter_value: null });
    }
    
    res.json(lastReading);
  } catch (error) {
    console.error('Error fetching last reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создание нового показания
router.post(
  '/readings',
  authenticateUser,
  upload.single('photo'),
  async (req: Request, res: Response) => {
    try {
      const { device_id, counter_value, notes, client_timestamp } = req.body;
      const user = (req as any).user;

      if (!device_id || !counter_value) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Photo is required' });
      }

      // Проверяем, существует ли аппарат
      const device = await deviceService.findById(parseInt(device_id));
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Сохраняем фото
      const photoPath = await fileHelper.saveFile(req.file.buffer, 'jpg');

      // Создаем показание
      const reading = await readingService.create({
        device_id: parseInt(device_id),
        user_id: user.id,
        counter_value: parseFloat(counter_value),
        photo_path: photoPath,
        notes: notes || undefined,
        client_timestamp: client_timestamp ? new Date(client_timestamp) : new Date(),
      });

      res.status(201).json(reading);
    } catch (error) {
      console.error('Error creating reading:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Получение показаний пользователя
router.get('/readings/my', authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const readings = await readingService.getByUser(user.id, limit);
    res.json(readings);
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение показаний по аппарату (только для админов)
router.get('/readings/device/:deviceId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const deviceId = parseInt(req.params.deviceId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const readings = await readingService.getByDevice(deviceId, limit);
    res.json(readings);
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение информации о текущем пользователе
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    res.json({
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ADMIN ENDPOINTS =====

// Middleware для проверки прав администратора
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Создание нового аппарата (только для админов)
router.post('/admin/devices', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, location, serial_number, description } = req.body;
    const user = (req as any).user;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const device = await deviceService.create({
      name,
      location: location || undefined,
      serial_number: serial_number || undefined,
      description: description || undefined,
      created_by: user.id
    });

    res.status(201).json(device);
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение списка пользователей (только для админов)
router.get('/admin/users', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создание приглашения (только для админов)
router.post('/admin/invitations', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const user = (req as any).user;

    if (!role || !['admin', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin or employee)' });
    }

    const invitation = await invitationService.create(
      user.id,
      role as 'admin' | 'employee'
    );

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Деактивация пользователя (только для админов)
router.delete('/admin/users/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = (req as any).user;

    if (userId === currentUser.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    await userService.deactivateUser(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение показаний по аппарату с фильтрацией (только для админов)
router.get('/admin/readings/device/:deviceId', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const { start_date, end_date } = req.query;

    const readings = await readingService.getByDeviceWithFilters(
      deviceId,
      start_date as string | undefined,
      end_date as string | undefined
    );

    res.json(readings);
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
