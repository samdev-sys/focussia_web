# Backups y restauración - Focussia

## Resumen
Respaldo de PostgreSQL + archivos `media/`, con verificación del dump, cifrado GPG opcional, subida opcional a S3, retención local, checksums SHA-256 y notificaciones por webhook. La política de cifrado/off-site es **recomendable en producción** y puede hacerse obligatoria por variables de entorno.

## Componentes

### Scripts
- `backend/scripts/backup_full.sh`: backup completo (BD + media), `pg_restore --list` para validar dump, cifrado opcional (AES256/GPG), S3 opcional, retención, checksums `.sha256`, alertas webhook.
- `backend/scripts/restore_full.sh`: **restauración integral** (BD + media opcional), descifra `.gpg` si aplica, requiere `RESTORE_CONFIRM=YES`.
- `backend/scripts/backup_db.sh` / `backup_db.bat`: backups simples de BD (legado/alternativo).
- `backend/scripts/restore_db.sh`: restauración básica solo BD (legado; preferir `restore_full.sh`).

### Docker (producción)
- Servicio `backup` en `docker-compose.prod.yml` (`backend/Dockerfile.backup`, Alpine + `pg_dump`/`pg_restore` + `gpg` + `aws-cli` + `crond`).
- Cron diario **02:00** (zona `TZ`). Monta `./backups:/backups` y `media_data:/media:ro`.
- El contenedor de backup se ejecuta con `crond` (requiere privilegios de root en Alpine); es una **excepción operativa**. El contenedor `web` sí usa usuario no-root.

## Variables de entorno
| Variable | Descripción | Default |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL (compose la arma) | — |
| `BACKUP_DIR` | Directorio de salida | `/backups` |
| `MEDIA_DIR` | Media origen (backup) / destino base (restore) | `/media` o `/app/media` |
| `BACKUP_RETENTION_DAYS` | Retención local (días) | `30` |
| `BACKUP_PASSPHRASE` | Passphrase GPG simétrica | vacío (sin cifrado) |
| `REQUIRE_ENCRYPTION` | `1` = falla si no hay passphrase | `0` |
| `REQUIRE_OFFSITE` | `1` = falla si no hay `S3_BUCKET` | `0` |
| `S3_BUCKET` / `S3_PREFIX` | Destino off-site (S3 compatible) | vacío |
| `BACKUP_WEBHOOK_URL` | Alertas éxito/fallo | vacío |
| `TZ` | Zona horaria del cron | `America/Bogota` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_DEFAULT_REGION` | Credenciales S3 | — |

## Operación (producción, Docker Compose)
```bash
export DB_PASSWORD='...'
export BACKUP_PASSPHRASE='...'
export S3_BUCKET='...'
export BACKUP_WEBHOOK_URL='...'
# Recomendado en prod cuando ya configuraste secretos/destino:
# export REQUIRE_ENCRYPTION=1
# export REQUIRE_OFFSITE=1

docker compose -p focusia -f docker-compose.prod.yml up -d --build backup
docker compose -p focusia -f docker-compose.prod.yml logs -f backup
docker compose -p focusia -f docker-compose.prod.yml exec backup /scripts/backup_full.sh
ls -lah ./backups
```

## Restauración integral
> **Destructivo**: `pg_restore --clean --if-exists` y la extracción de media sobrescriben datos. Ejecutar en ventana controlada, idealmente tras confirmar el backup origen.

```bash
# Ejemplo dentro del contenedor backup (tiene pg_restore/gpg/tar)
docker compose -p focusia -f docker-compose.prod.yml exec \
  -e RESTORE_CONFIRM=YES \
  -e BACKUP_PASSPHRASE='...' \
  -e MEDIA_DIR=/media \
  backup /scripts/restore_full.sh \
    --db /backups/db_YYYYMMDD_HHMMSS.dump.gpg \
    --media /backups/media_YYYYMMDD_HHMMSS.tar.gz.gpg
```

Solo BD:
```bash
RESTORE_CONFIRM=YES /scripts/restore_full.sh --db /backups/db_YYYYMMDD_HHMMSS.dump.gpg
```

Verificación post-restore:
1. `docker compose ... ps` / healthchecks en verde.
2. `curl -fsS https://<API_DOMAIN>/api/health/`.
3. Login y recorrido funcional mínimo (reportes, media/archivos, admin).
4. Revisar logs de `web`, `worker` y migraciones si aplica.

## RPO/RTO (objetivo inicial, ajustar con negocio)
- **RPO objetivo**: 24 h (backup diario 02:00). Si se requiere menor RPO, evaluar WAL archiving/PITR o mayor frecuencia.
- **RTO objetivo**: 2–4 h para restauración estándar (BD+media) en entorno preparado. Medir en drills reales.

## Checklist operativo
- [ ] `BACKUP_PASSPHRASE` fuerte, almacenado en gestor de secretos.
- [ ] Off-site configurado (S3 compatible) con credenciales de mínimo privilegio y lifecycle/retención.
- [ ] `BACKUP_WEBHOOK_URL` activo y alertas monitoreadas.
- [ ] `REQUIRE_ENCRYPTION=1` y `REQUIRE_OFFSITE=1` habilitados en prod cuando aplique.
- [ ] Primer backup manual verificado (`.dump` válido, checksum, archivos presentes).
- [ ] **Drill de restauración** (BD+media) ejecutado en entorno aislado y documentado (fecha, resultado, tiempo).
- [ ] Permisos revisados en `./backups` y bucket; acceso auditado.
- [ ] Procedimiento ante incidente (quién ejecuta, orden, rollback, comunicación).
