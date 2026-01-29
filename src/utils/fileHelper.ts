import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class FileHelper {
  private uploadDir: string;

  constructor(uploadDir: string = './uploads') {
    this.uploadDir = uploadDir;
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Создаем поддиректории по годам и месяцам
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dirPath = path.join(this.uploadDir, String(year), month);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  generateFileName(extension: string = 'jpg'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = uuidv4();
    
    return path.join(String(year), month, `${uuid}.${extension}`);
  }

  getFullPath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  async saveFile(buffer: Buffer, extension: string = 'jpg'): Promise<string> {
    const relativePath = this.generateFileName(extension);
    const fullPath = this.getFullPath(relativePath);
    
    await fs.promises.writeFile(fullPath, buffer);
    return relativePath;
  }

  fileExists(relativePath: string): boolean {
    const fullPath = this.getFullPath(relativePath);
    return fs.existsSync(fullPath);
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(relativePath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ошибка при удалении файла:', error);
      return false;
    }
  }
}

export const fileHelper = new FileHelper(process.env.UPLOAD_DIR || './uploads');
