# Guía de Despliegue en Netlify

## Requisitos Previos

1. Cuenta en [Netlify](https://netlify.com)
2. Git repositorio configurado
3. Node.js 20+ instalado
4. Variables de entorno configuradas

## Pasos para Despliegue

### 1. Configurar Variables de Entorno en Netlify

1. Ve a tu sitio en Netlify
2. Ve a **Settings** → **Environment variables**
3. Agrega las siguientes variables:

```
VITE_API_URL = https://tu-api-backend.com (o similar)
GEMINI_API_KEY = tu_clave_aqui
```

### 2. Configuración Automática

El archivo `netlify.toml` está configurado para:
- Compilar con `npm run build`
- Servir desde la carpeta `dist`
- Usar Node.js 20
- Redirigir todas las rutas SPA a `index.html`
- Configurar headers de seguridad y cache

### 3. Hacer Deploy

#### Opción A: Netlify CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Autenticarse
netlify login

# Deploy
netlify deploy --prod
```

#### Opción B: GitHub Integration (Recomendado)

1. Push tu código a GitHub
2. En Netlify, selecciona "New site from Git"
3. Conecta tu repositorio de GitHub
4. Netlify automáticamente:
   - Detectará la configuración de `netlify.toml`
   - Compilará automáticamente en cada push
   - Publicará los cambios

### 4. Configuración del Backend

**IMPORTANTE**: El backend Django debe estar alojado en otro servicio:
- [Heroku](https://heroku.com) (ya no gratuito)
- [Railway.app](https://railway.app)
- [Render.com](https://render.com)
- [PythonAnywhere](https://pythonanywhere.com)
- [AWS/Google Cloud/Azure](https://cloud.google.com)

El frontend en Netlify se conectará al backend mediante la URL en `VITE_API_URL`.

### 5. CORS Configuration

Asegúrate de que tu backend Django tenga CORS configurado correctamente:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://tu-sitio-netlify.netlify.app",
    "http://localhost:3000",  # para desarrollo local
]

CORS_ALLOW_CREDENTIALS = True
```

### 6. Verificar Deploy

- Visita tu sitio: `https://tu-sitio-netlify.netlify.app`
- Abre la consola del navegador (F12) y verifica:
  - No hay errores de CORS
  - Las llamadas a API van a la URL correcta
  - Los assets se cargan correctamente

## Troubleshooting

### El sitio se ve blanco o hay errores 404

Netlify ya está configurado para redirigir todas las rutas a `index.html` (archivo `netlify.toml`).

### Error de CORS

Verifica que:
1. La URL `VITE_API_URL` sea correcta
2. El backend tiene CORS habilitado
3. Los headers estén configurados correctamente

### Variables de entorno no se cargan

- Verifica que las variables estén en Netlify **Site settings** → **Build & deploy** → **Environment**
- Redeploy después de agregar variables (`netlify deploy --prod`)

## Estructura de Archivos

```
focussia_web/
├── netlify.toml              # Configuración de Netlify ✅
├── .env.example              # Variables de ejemplo ✅
├── .gitignore                # Archivos a ignorar ✅
├── vite.config.ts
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── ...
├── public/
│   └── ...
└── dist/                      # Se crea al hacer build
```

## Próximos Pasos

1. ✅ Conectar repositorio a GitHub
2. ✅ Crear cuenta en Netlify
3. ✅ Configurar variables de entorno
4. ✅ Desplegar backend en Railway/Render
5. ✅ Hacer deploy en Netlify
6. ✅ Verificar CORS y conexión a API

¡Listo para desplegar! 🚀
