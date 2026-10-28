#!/bin/bash
# Script de deploy para TRL 5 (Staging)
# Ejecutar: ./deploy_trl5.sh

echo "🚀 INICIANDO DEPLOY TRL 5 - STAGING"

# 1. Build Docker image
echo "1️⃣ Building Docker image..."
docker build -t focusia:staging -f backend/Dockerfile .

# 2. Run docker-compose
echo "2️⃣ Starting staging environment..."
docker-compose -f docker-compose.staging.yml up -d

# 3. Wait for services
echo "3️⃣ Waiting for services to start..."
sleep 15

# 4. Run migrations
echo "4️⃣ Running database migrations..."
docker-compose -f docker-compose.staging.yml exec web python manage.py migrate

# 5. Run seeds
echo "5️⃣ Loading initial data..."
docker-compose -f docker-compose.staging.yml exec web python manage.py loaddata initial_categorias

# 6. Create superuser
echo "6️⃣ Creating admin user..."
docker-compose -f docker-compose.staging.yml exec web python manage.py createsuperuser \
  --noinput --username admin --email admin@focusia.app

echo "✅ TRL 5 Staging environment deployed successfully!"
echo "📍 Access: http://localhost:8000"
echo "🔧 Admin: http://localhost:8000/admin"