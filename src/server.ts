import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Статические файлы для загруженных фото (опционально)
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({
    name: 'Water Counter Bot API',
    version: '1.0.0',
    status: 'running',
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
