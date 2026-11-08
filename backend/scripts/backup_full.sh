#!/bin/bash
# Backup completo: PostgreSQL + media
# Requiere: pg_dump, gpg (opcional), tar, aws cli (opcional para S3)
# Variables: DATABASE_URL, BACKUP_DIR, BACKUP_PASSPHRASE, MEDIA_DIR, S3_BUCKET, S3_PREFIX,
#   RETENTION_DAYS, WEBHOOK_URL, REQUIRE_ENCRYPTION, REQUIRE_OFFSITE

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
MEDIA_DIR="${MEDIA_DIR:-/app/media}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_PREFIX="${S3_PREFIX:-focussia/backups}"
# Controles opcionales para endurecer prod sin romper despliegues existentes.
REQUIRE_ENCRYPTION="${REQUIRE_ENCRYPTION:-0}"
REQUIRE_OFFSITE="${REQUIRE_OFFSITE:-0}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="$BACKUP_DIR/db_$DATE.dump"
MEDIA_FILE="$BACKUP_DIR/media_$DATE.tar.gz"
LOG_FILE="$BACKUP_DIR/backup_$DATE.log"

mkdir -p "$BACKUP_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

fail() {
  log "ERROR: $1"
  if [ -n "${WEBHOOK_URL:-}" ]; then
    curl -s -X POST "$WEBHOOK_URL" -H 'Content-Type: application/json' \
      -d "{\"text\":\"Backup Focussia FAILED: $1 ($DATE)\"}" || true
  fi
  exit 1
}

trap 'fail "Backup interrumpido"' ERR

log "Iniciando backup completo..."

if [ "$REQUIRE_ENCRYPTION" = "1" ] && [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  fail "REQUIRE_ENCRYPTION=1 pero BACKUP_PASSPHRASE no está configurado"
fi
if [ "$REQUIRE_OFFSITE" = "1" ] && [ -z "${S3_BUCKET:-}" ]; then
  fail "REQUIRE_OFFSITE=1 pero S3_BUCKET no está configurado"
fi
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  log "AVISO: backup sin cifrado (defina BACKUP_PASSPHRASE; use REQUIRE_ENCRYPTION=1 en prod)"
fi

# 1. Backup PostgreSQL
log "Respaldando base de datos..."
if [ -z "${DATABASE_URL:-}" ]; then
  fail "DATABASE_URL no configurado"
fi
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" -f "$DB_FILE"
if [ ! -s "$DB_FILE" ]; then
  fail "El dump de BD está vacío"
fi
pg_restore --list "$DB_FILE" > /dev/null 2>&1 || fail "El dump de BD no es válido"

# 2. Backup media
if [ -d "$MEDIA_DIR" ]; then
  log "Respaldando media desde $MEDIA_DIR..."
  tar -czf "$MEDIA_FILE" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")" 2>/dev/null || true
else
  log "Directorio media no encontrado: $MEDIA_DIR (omitido)"
  MEDIA_FILE=""
fi

# 3. Cifrar (opcional)
encrypt_file() {
  local f="$1"
  if [ -n "${BACKUP_PASSPHRASE:-}" ] && command -v gpg >/dev/null 2>&1; then
    log "Cifrando $f..."
    gpg --symmetric --cipher-algo AES256 --batch --yes --passphrase "$BACKUP_PASSPHRASE" -o "$f.gpg" "$f"
    rm -f "$f"
    echo "$f.gpg"
  else
    echo "$f"
  fi
}

DB_OUT=$(encrypt_file "$DB_FILE")
MEDIA_OUT=""
if [ -n "$MEDIA_FILE" ] && [ -f "$MEDIA_FILE" ]; then
  MEDIA_OUT=$(encrypt_file "$MEDIA_FILE")
fi

# 4. Subir a S3 (opcional)
if [ -n "${S3_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
  log "Subiendo a s3://$S3_BUCKET/$S3_PREFIX/..."
  aws s3 cp "$DB_OUT" "s3://$S3_BUCKET/$S3_PREFIX/$(basename "$DB_OUT")" --only-show-errors
  if [ -n "$MEDIA_OUT" ]; then
    aws s3 cp "$MEDIA_OUT" "s3://$S3_BUCKET/$S3_PREFIX/$(basename "$MEDIA_OUT")" --only-show-errors
  fi
  aws s3 cp "$LOG_FILE" "s3://$S3_BUCKET/$S3_PREFIX/logs/$(basename "$LOG_FILE")" --only-show-errors || true
fi

# 5. Retención local
log "Aplicando retención local: $RETENTION_DAYS días..."
find "$BACKUP_DIR" -name "db_*.dump*" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "media_*.tar.gz*" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "backup_*.log" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

checksum_file() {
  local f="$1"
  if [ -f "$f" ] && command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$f" > "$f.sha256"
    log "Checksum: $f.sha256"
  fi
}

checksum_file "$DB_OUT"
[ -n "$MEDIA_OUT" ] && checksum_file "$MEDIA_OUT"
checksum_file "$LOG_FILE"

# 6. Notificación éxito
if [ -n "${WEBHOOK_URL:-}" ]; then
  curl -s -X POST "$WEBHOOK_URL" -H 'Content-Type: application/json' \
    -d "{\"text\":\"Backup Focussia OK: $DATE (DB: $(basename "$DB_OUT"), Media: ${MEDIA_OUT:+$(basename "$MEDIA_OUT")})\"}" || true
fi

log "Backup completado: $DB_OUT ${MEDIA_OUT:+$MEDIA_OUT}"
