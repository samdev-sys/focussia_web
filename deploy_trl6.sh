#!/bin/bash
# Script de deploy para TRL 6 (Producción)
# Requiere: Docker Engine + Docker Compose v2
#
# Uso:
#   DB_PASSWORD=<password seguro> API_DOMAIN=api.tudominio.com ./deploy_trl6.sh
#
# Importante: el puerto 8000 del servicio `web` ya NO se publica; el único
# acceso es a través del proxy Caddy (TLS). Por eso el script siempre levanta
# el overlay `docker-compose.proxy.yml` y comprueba la salud contra el dominio.

set -euo pipefail

echo "🚀 INICIANDO DEPLOY TRL 6 - PRODUCCION"

# 1. Validar variables de entorno requeridas
DB_PASSWORD="${DB_PASSWORD:?Defina DB_PASSWORD (Ej: export DB_PASSWORD=...) }"
API_DOMAIN="${API_DOMAIN:?Defina API_DOMAIN (Ej: export API_DOMAIN=api.tudominio.com) }"
PROJECT_NAME="${PROJECT_NAME:-focusia}"

for f in docker-compose.prod.yml docker-compose.proxy.yml; do
  if [ ! -f "$f" ]; then
    echo "❌ Archivo $f no encontrado. Ejecute desde la raíz del proyecto."
    exit 1
  fi
done

# Wrapper: todos los comandos usan el mismo proyecto y los mismos overlays.
compose() {
  DB_PASSWORD="$DB_PASSWORD" API_DOMAIN="$API_DOMAIN" \
    docker compose -f docker-compose.prod.yml -f docker-compose.proxy.yml \
    -p "$PROJECT_NAME" "$@"
}

# 2. Validar que el daemon de Docker esté disponible
docker info >/dev/null 2>&1 || { echo "❌ Docker no está disponible."; exit 1; }

# 3. Construir imágenes de producción
echo "1️⃣ Construyendo imágenes de producción..."
compose build

# 4. Levantar servicios (db, redis, web, worker, proxy)
echo "2️⃣ Levantando stack de producción..."
compose up -d

# 5. Ejecutar migraciones de base de datos
echo "3️⃣ Ejecutando migraciones de base de datos..."
compose exec -T web python manage.py migrate --noinput

# 6. Verificación de salud
echo "4️⃣ Verificando salud del stack (hasta 120s)..."
for i in $(seq 1 24); do
  if compose ps --status running | grep -q "healthy"; then
    echo "   ✅ Servicios saludables"
    break
  fi
  [ "$i" -eq 24 ] && { echo "   ⚠️ Tiempo de espera agotado"; break; }
  sleep 5
done

# 7. Health check HTTP a través del proxy (TLS), no contra localhost:8000
echo "5️⃣ Health check HTTPS del API..."
URL="https://${API_DOMAIN}/api/health/"
if curl -fsS "$URL" >/dev/null; then
  echo "   ✅ Health check OK: $URL"
else
  echo "   ❌ Health check falló en $URL"
  echo "      Revise DNS del dominio, certificado de Caddy y logs del proxy:"
  echo "      compose logs proxy"
  exit 1
fi

# 8. Comprobar que los crons quedaron registrados (los registra el worker)
echo "6️⃣ Verificando tareas programadas..."
CRONS=$(compose exec -T web python manage.py shell -c \
  "from django_q.models import Schedule; print(Schedule.objects.count())" 2>/dev/null | tail -n 1 | tr -d '\r')
echo "   Tareas registradas: ${CRONS:-0} (esperado 7 con croniter instalado)"
if [ "${CRONS:-0}" -lt 7 ]; then
  echo "   ⚠️ Faltan tareas: revise 'compose logs worker' (suele ser croniter ausente)."
fi

echo "✅ TRL 6 Production deployment completed"
echo "📍 Access: https://app.focusia.com  ·  API: https://${API_DOMAIN}"
echo "📌 Revise: docker compose -p ${PROJECT_NAME} ps"
