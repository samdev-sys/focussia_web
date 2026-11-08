#!/bin/bash
# Script de restauración PostgreSQL para Focussia
# Uso: ./restore_db.sh backup_YYYYMMDD_HHMMSS.dump.gpg

set -e

if [ -z "$1" ]; then
    echo "Uso: $0 <archivo_backup.gpg>"
    exit 1
fi

ENCRYPTED_FILE="$1"
BACKUP_FILE="${ENCRYPTED_FILE%.gpg}"

echo "Descifrando backup..."
gpg --decrypt --batch --passphrase "$BACKUP_PASSPHRASE" -o "$BACKUP_FILE" "$ENCRYPTED_FILE"

echo "Restaurando base de datos..."
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$BACKUP_FILE"

rm "$BACKUP_FILE"

echo "Restauración completada"
