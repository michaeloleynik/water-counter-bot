#!/bin/sh

# Скрипт автоматического бэкапа PostgreSQL

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}

echo "$(date) - Начало бэкапа базы данных..."

# Создаем директорию если её нет
mkdir -p ${BACKUP_DIR}

# Выполняем бэкап
pg_dump -h ${PGHOST} -U ${POSTGRES_USER} -d ${POSTGRES_DB} | gzip > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "$(date) - Бэкап успешно создан: ${BACKUP_FILE}"
    
    # Удаляем старые бэкапы
    find ${BACKUP_DIR} -name "backup_*.sql.gz" -type f -mtime +${KEEP_DAYS} -delete
    echo "$(date) - Старые бэкапы (старше ${KEEP_DAYS} дней) удалены"
    
    # Показываем размер бэкапа
    BACKUP_SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
    echo "$(date) - Размер бэкапа: ${BACKUP_SIZE}"
else
    echo "$(date) - ОШИБКА при создании бэкапа!" >&2
    exit 1
fi

echo "$(date) - Бэкап завершен"
