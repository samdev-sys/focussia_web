#!/bin/bash
# Restauración integral Focussia: PostgreSQL + media.
# Uso:
#   RESTORE_CONFIRM=YES ./restore_full.sh --db /backups/db_YYYYMMDD.dump[.gpg] [--media /backups/media_YYYYMMDD.tar.gz[.gpg]]
#   ./restore_full.sh --help
#
# Requiere: pg_restore, gpg (si hay .gpg), tar.
# Variables: DATABASE_URL, BACKUP_PASSPHRASE (si descifra), MEDIA_DIR, RESTORE_CONFIRM.

set -euo pipefail

DB_FILE=""
MEDIA_FILE=""
MEDIA_DIR="${MEDIA_DIR:-/app/media}"

usage() {
  cat <<'EOF'
Restaura backup de Focussia (BD y opcionalmente media).

  --db <archivo>      Dump PostgreSQL (.dump o .dump.gpg). Obligatorio.
  --media <archivo>   Archivo media (.tar.gz o .tar.gz.gpg). Opcional.
  --media-dir <dir>   Directorio media destino (default: MEDIA_DIR o /app/media).
  --help              Muestra esta ayuda.

Seguridad: esta operación SOBRESCRIBE datos. Debe definir RESTORE_CONFIRM=YES.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --db) DB_FILE="${2:-}"; shift 2 ;;
    --media) MEDIA_FILE="${2:-}"; shift 2 ;;
    --media-dir) MEDIA_DIR="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Argumento desconocido: $1" >&2; usage; exit 1 ;;
  esac
done

if [ -z "$DB_FILE" ]; then
  echo "Falta --db <archivo>" >&2
  usage
  exit 1
fi

if [ "${RESTORE_CONFIRM:-}" != "YES" ]; then
  echo "ERROR: defina RESTORE_CONFIRM=YES para confirmar que entiende que se sobrescribirán datos." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL no configurado" >&2
  exit 1
fi

decrypt_if_needed() {
  local src="$1"
  if [[ "$src" == *.gpg ]]; then
    if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
      echo "ERROR: BACKUP_PASSPHRASE requerido para descifrar $src" >&2
      exit 1
    fi
    local out
    out="$(mktemp "${TMPDIR:-/tmp}/restore.XXXXXX")"
    gpg --decrypt --batch --yes --passphrase "$BACKUP_PASSPHRASE" -o "$out" "$src" >&2
    echo "$out"
  else
    echo "$src"
  fi
}

cleanup_files=()
trap 'for f in "${cleanup_files[@]:-}"; do [ -n "$f" ] && rm -f "$f"; done' EXIT

echo "[restore] Validando dump: $DB_FILE"
PLAIN_DB="$(decrypt_if_needed "$DB_FILE")"
[[ "$PLAIN_DB" != "$DB_FILE" ]] && cleanup_files+=("$PLAIN_DB")
pg_restore --list "$PLAIN_DB" > /dev/null

echo "[restore] Restaurando base de datos (pg_restore --clean --if-exists)..."
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$PLAIN_DB"
echo "[restore] Base de datos restaurada."

if [ -n "$MEDIA_FILE" ]; then
  echo "[restore] Restaurando media desde: $MEDIA_FILE -> $MEDIA_DIR"
  mkdir -p "$(dirname "$MEDIA_DIR")"
  PLAIN_MEDIA="$(decrypt_if_needed "$MEDIA_FILE")"
  [[ "$PLAIN_MEDIA" != "$MEDIA_FILE" ]] && cleanup_files+=("$PLAIN_MEDIA")
  tar -xzf "$PLAIN_MEDIA" -C "$(dirname "$MEDIA_DIR")"
  echo "[restore] Media restaurada."
else
  echo "[restore] Sin archivo --media; solo se restauró BD."
fi

echo "[restore] Completado. Verifique la aplicación, /api/health/ y archivos media clave."
