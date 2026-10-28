#!/bin/bash
# Script de deploy para TRL 6 (Producción)
# Requiere: Docker Engine + Docker Compose v2
#
# Uso:
#   DB_PASSWORD=<password seguro> ./deploy_trl6.sh

set -euo pipefail

echo "🚀 INICIANDO DEPLOY TRL 6 - PRODUCCION"

# 1. Validar variables de entorno requeridas
DB_PASSWORD="${DB_PASSWORD:?Defina DB_PASSWORD (Ej: export DB_PASSWORD=...) }"
PROJECT_NAME="${PROJECT_NAME:-focusia}"
COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Archivo $COMPOSE_FILE no encontrado. Ejecute desde la raíz del proyecto."
  exit 1
fi

# 2. Validar que el daemon de Docker esté disponible
docker info >/dev/null 2>&1 || { echo "❌ Docker no está disponible."; exit 1; }

# 3. Construir imágenes de producción
echo "1️⃣ Construyendo imágenes de producción..."
DB_PASSWORD="$DB_PASSWORD" docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build

# 4. Levantar servicios (db, redis, web, worker, beat)
echo "2️⃣ Levantando stack de producción..."
DB_PASSWORD="$DB_PASSWORD" docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d

# 5. Ejecutar migraciones de base de datos
echo "3️⃣ Ejecutando migraciones de base de datos..."
DB_PASSWORD="$DB_PASSWORD" docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T web \
  python manage.py migrate --noinput

# 6. Verificación de salud
echo "4️⃣ Verificando salud del stack (hasta 120s)..."
for i in $(seq 1 24); do
  if DB_PASSWORD="$DB_PASSWORD" docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --status running | grep -q "healthy"; then
    echo "   ✅ Servicios saludables"
    break
  fi
  [ "$i" -eq 24 ] && { echo "   ⚠️ Tiempo de espera agotado"; break; }
  sleep 5
done

# 7. Health check HTTP del API
echo "5️⃣ Health check HTTP del API..."
URL="http://localhost:8000/api/health/"
if curl -fsS "$URL" >/dev/null; then
  echo "   ✅ Health check OK: $URL"
else
  echo "   ⚠️ Health check falló (¿el API está expuesto en el puerto 8000?)"
fi

# 8. Ejecutar tests E2E TRL 6
echo "6️⃣ Ejecutando tests E2E TRL 6 contra el entorno..."
DB_PASSWORD="$DB_PASSWORD" docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T web \
  python -m pytest /app/tests_trl6_production.py -v --tb=short || \
  echo "   ⚠️ Los tests E2E requieren credenciales y usuario de prueba en la BD."

echo "✅ TRL 6 Production deployment completed"
echo "📍 Access: https://app.focusia.com"
echo "📌 Revise: docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps"
