import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './api/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Статические файлы для загруженных фото
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Раздача Mini App
const miniAppDistPath = path.join(__dirname, '../mini-app/dist');
app.use(express.static(miniAppDistPath));

// Корневой маршрут (для SPA)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(miniAppDistPath, 'index.html'), (err) => {
    if (err) {
      // Если папка dist еще не создана, отдаем JSON
      res.json({
        name: 'Water Counter Bot API',
        version: '1.0.0',
        status: 'running',
        note: 'Mini App dist folder not found. Run npm run build in mini-app directory.'
      });
    }
  });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
export const startServer = () => {
  return app.listen(PORT, () => {
    console.log(`🌐 API сервер запущен на порту ${PORT}`);
    console.log(`📡 API доступно по адресу: http://localhost:${PORT}/api`);
  });
};

export default app;
