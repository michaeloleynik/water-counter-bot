import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ReadingWithDetails } from '../models/Reading';
import { Device } from '../models/Device';
import { formatDate } from '../utils/formatters';
import { fileHelper } from '../utils/fileHelper';

export class PdfService {
  async generateDeviceReport(
    device: Device,
    readings: ReadingWithDetails[],
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        
        // Регистрация шрифта для поддержки кириллицы
        const fontPath = '/usr/share/fonts/dejavu/DejaVuSans.ttf';
        if (fs.existsSync(fontPath)) {
          doc.font(fontPath);
        }
        
        const fileName = `report_${device.id}_${Date.now()}.pdf`;
        const filePath = path.join(process.env.UPLOAD_DIR || './uploads', 'reports', fileName);

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Заголовок
        doc.fontSize(20).text('Отчет по показаниям аппарата', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Аппарат: ${device.name}`);
        doc.text(`Расположение: ${device.location || 'Не указано'}`);
        doc.text(`Период: ${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`);
        doc.moveDown();

        doc.fontSize(12).text('История показаний и фото:', { underline: true });
        doc.moveDown();

        for (let i = 0; i < readings.length; i++) {
          const r = readings[i];
          
          // Проверяем, не закончилось ли место на странице
          if (doc.y > 600) {
            doc.addPage();
          }

          doc.fontSize(11).text(`${i + 1}. Дата: ${formatDate(r.reading_date)}`);
          doc.text(`   Значение: ${r.counter_value}`);
          doc.text(`   Сотрудник: ${r.user_name}`);
          
          if (r.photo_path) {
            const photoFullPath = fileHelper.getFullPath(r.photo_path);
            if (fs.existsSync(photoFullPath)) {
              try {
                doc.moveDown(0.5);
                doc.image(photoFullPath, {
                  fit: [250, 250],
                  align: 'center'
                });
                doc.moveDown();
              } catch (imgError) {
                console.error(`Ошибка при вставке фото в PDF: ${photoFullPath}`, imgError);
                doc.fillColor('red').text('   [Ошибка при загрузке фото]').fillColor('black');
              }
            } else {
              doc.fillColor('gray').text('   [Фото отсутствует]').fillColor('black');
            }
          }
          
          doc.moveDown();
          doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#eeeeee').stroke();
          doc.moveDown();
        }

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const pdfService = new PdfService();
