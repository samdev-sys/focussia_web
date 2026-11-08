#!/bin/bash
# Script de backup PostgreSQL para Focussia
# Uso: ./backup_db.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/focussia_$DATE.dump"
ENCRYPTED_FILE="$BACKUP_FILE.gpg"

mkdir -p "$BACKUP_DIR"

echo "Iniciando backup de base de datos..."
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$BACKUP_FILE"

echo "Cifrando backup..."
gpg --symmetric --cipher-algo AES256 --batch --passphrase "$BACKUP_PASSPHRASE" -o "$ENCRYPTED_FILE" "$BACKUP_FILE"

rm "$BACKUP_FILE"

echo "Backup completado: $ENCRYPTED_FILE"
echo "Recuerda copiar a almacenamiento off-site (S3/Object Storage)"
