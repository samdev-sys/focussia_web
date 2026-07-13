# 🚀 FOCUSSIA WEB - DESPLIEGUE EN NETLIFY Y RAILWAY

## 📌 Lee Esto Primero

Esta documentación te guiará para desplegar **Focussia Web** en **Netlify** (frontend) y **Railway** (backend).

**Tiempo estimado:** 30-60 minutos

---

## 📚 Documentación Disponible

| Archivo | Contenido | Ideal Para |
|---------|----------|-----------|
| **[DESPLIEGUE.md](./DESPLIEGUE.md)** | Resumen rápido | Empezar aquí |
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | Guía completa paso a paso | Seguir el proceso |
| **[CHECKLIST_DESPLIEGUE.md](./CHECKLIST_DESPLIEGUE.md)** | Checklist interactivo | Ir marcando pasos ✅ |
| **[COMANDOS_DESPLIEGUE.md](./COMANDOS_DESPLIEGUE.md)** | Todos los comandos listos | Copy-paste de comandos |
| **[BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md)** | Configuración Django | Setup del backend |
| **[ESTRUCTURA_DESPLIEGUE.md](./ESTRUCTURA_DESPLIEGUE.md)** | Diagramas y estructura | Entender la arquitectura |

---

## 🎯 Ruta Rápida (10 minutos)

### 1. Preparar Backend
```bash
cd backend
pip freeze > requirements.txt
echo "web: gunicorn focusia_api.wsgi --log-file -" > Procfile
echo "python-3.11.7" > runtime.txt
git add .
git commit -m "feat: preparar backend"
git push origin main
```

### 2. Conectar Netlify
- Abre https://netlify.com
- "New site from Git" → GitHub → focussia-web
- Netlify detecta `netlify.toml` automáticamente
- Deployment en <2 minutos ✅

### 3. Conectar Railway
- Abre https://railway.app
- "New Project" → Deploy from GitHub → focussia-web
- Agrega PostgreSQL
- Configura variables (ver [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md))
- Deployment en <10 minutos ✅

### 4. Conectar Frontend ↔ Backend
- En Netlify: agrega `VITE_API_URL = https://tudominio-api.railway.app`
- Redeploy
- ¡Listo! 🎉

---

## 🔍 Si Algo No Está Claro

1. ¿**Qué es Netlify?** → Frontend (React) hosting en CDN
2. ¿**Qué es Railway?** → Backend (Django) hosting + base de datos
3. ¿**CORS?** → Seguridad para que frontend llame a backend
4. ¿**Variables de entorno?** → Configuración segura sin hardcodear

---

## ✅ Checklist Pre-Despliegue

- [ ] Frontend: `npm run build` sin errores
- [ ] Backend: `requirements.txt`, `Procfile`, `runtime.txt` creados
- [ ] `.env` está en `.gitignore` (no subir credenciales)
- [ ] `.env.example` documentado
- [ ] `git push origin main` completado
- [ ] Cuenta en Netlify creada
- [ ] Cuenta en Railway creada

---

## 📦 Lo Que Se Despliega

### Netlify (Frontend)
```
✅ index.html
✅ JavaScript compilado (React)
✅ CSS compilado (Tailwind)
✅ Assets estáticos (imágenes, fuentes)
```

### Railway (Backend)
```
✅ API REST (Django)
✅ Base de datos PostgreSQL
✅ Admin panel
```

---

## 🌐 URLs Después del Despliegue

```
Frontend:  https://focussia-web.netlify.app   (o tu dominio custom)
Backend:   https://focussia-web-api.railway.app (o tu dominio custom)
Admin:     https://focussia-web-api.railway.app/admin
```

---

## 🎓 Recursos por Experiencia

### 👶 Principiante
1. Lee [DESPLIEGUE.md](./DESPLIEGUE.md)
2. Sigue [CHECKLIST_DESPLIEGUE.md](./CHECKLIST_DESPLIEGUE.md) paso a paso
3. Copia comandos de [COMANDOS_DESPLIEGUE.md](./COMANDOS_DESPLIEGUE.md)

### 👨‍💻 Intermedio
1. Lee [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Usa [ESTRUCTURA_DESPLIEGUE.md](./ESTRUCTURA_DESPLIEGUE.md) como referencia
3. Personaliza variables de entorno según necesites

### 🚀 Avanzado
1. [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md) - Entender configuración
2. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Troubleshooting avanzado
3. Personaliza `netlify.toml` y `settings.py` según necesites

---

## 🔒 Seguridad

⚠️ **IMPORTANTE:**
- [ ] `DEBUG=False` en producción
- [ ] `SECRET_KEY` es único y aleatorio
- [ ] Variables sensibles en Railway/Netlify, NO en código
- [ ] `.env` NO se sube a GitHub (ver `.gitignore`)
- [ ] CORS limitado a tu dominio

---

## 📞 Ayuda

| Problema | Solución |
|----------|----------|
| ¿Qué archivo debo leer? | [DESPLIEGUE.md](./DESPLIEGUE.md) |
| ¿Qué comandos debo ejecutar? | [COMANDOS_DESPLIEGUE.md](./COMANDOS_DESPLIEGUE.md) |
| ¿Cómo avanzo paso a paso? | [CHECKLIST_DESPLIEGUE.md](./CHECKLIST_DESPLIEGUE.md) |
| ¿Tengo un error? | Ve a [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → Troubleshooting |
| ¿Quiero entender la arquitectura? | [ESTRUCTURA_DESPLIEGUE.md](./ESTRUCTURA_DESPLIEGUE.md) |

---

## 🚀 ¡Comencemos!

### Opción A: Guía Rápida (para apurados)
→ [DESPLIEGUE.md](./DESPLIEGUE.md)

### Opción B: Paso a Paso (recomendado)
→ [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### Opción C: Checklist (más visual)
→ [CHECKLIST_DESPLIEGUE.md](./CHECKLIST_DESPLIEGUE.md)

---

## 📊 Estado del Proyecto

```
✅ Frontend (React + TypeScript + Vite)
   - netlify.toml configurado
   - package.json con scripts correctos
   - LISTO para Netlify

⚠️  Backend (Django + PostgreSQL)
   - Necesita: requirements.txt, Procfile, runtime.txt
   - Necesita: Actualizar settings.py
   - Ver: BACKEND_DEPLOYMENT.md

✅ Configuración
   - .env.example documentado
   - .gitignore completo
   - Variables de entorno listas
```

---

## 📈 Próximos Pasos

1. **Hoy:**
   - [ ] Leer [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
   - [ ] Ejecutar comandos de [COMANDOS_DESPLIEGUE.md](./COMANDOS_DESPLIEGUE.md)

2. **Esta semana:**
   - [ ] Desplegar en Netlify
   - [ ] Desplegar en Railway
   - [ ] Verificar que frontend + backend se comunican

3. **Mantenimiento:**
   - [ ] Revisar logs regularmente
   - [ ] Hacer backups
   - [ ] Actualizar dependencias

---

**¿Listo? 👉 [Comienza aquí](./DEPLOYMENT_GUIDE.md)**

---

## 📝 Historial de Cambios

- **2026-06-12**: Creación de documentación de despliegue
  - ✅ netlify.toml configurado
  - ✅ Documentación completa
  - ✅ Checklists y guías
  - ✅ Ejemplos de comandos

---

**Preguntas? Revisar [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#troubleshooting) → Troubleshooting**
