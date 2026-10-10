# Guía de Ejecución en WSL2 (Debian)
**Proyecto:** Otzo – Tienda Inteligente (Gestión de Inventario y Red de Sucursales)  
**Entorno objetivo:** Windows 10/11 con WSL2 corriendo Debian GNU/Linux  
**Stack:** PostgreSQL (Base de Datos) + Express.js (Backend) + React + Vite (Frontend)

---

## 📋 Resumen Rápido de Puertos y Servicios

| Componente | Carpeta | Puerto / URL por Defecto | Comando Principal |
|---|---|---|---|
| **Base de Datos** | N/A (Servicio local o Cloud) | `localhost:5432` | `sudo service postgresql start` |
| **Backend (API)** | `backend/` | `http://localhost:5000` | `npm run dev` |
| **Frontend (Web)**| `frontend/` | `http://localhost:5173` | `npm run dev -- --host` |
| **Swagger Docs** | Backend | `http://localhost:5000/api/docs` | Navegador web |

---

## 🗄️ Paso 1: Configurar y Levantar la Base de Datos (PostgreSQL)

Tienes dos alternativas: **Opción A (Local en tu Debian de WSL2)** u **Opción B (Tiger Cloud / Externa)**.

### Opción A: PostgreSQL Local en Debian (WSL2)

1. **Instalar PostgreSQL (si aún no lo tienes instalado):**
   ```bash
   sudo apt update
   sudo apt install -y postgresql postgresql-contrib
   ```

2. **Iniciar el servicio de PostgreSQL en WSL2:**
   > En WSL2, Debian suele gestionar los servicios con `service` o `/etc/init.d/`:
   ```bash
   sudo service postgresql start
   ```
   *Para verificar que está corriendo:*
   ```bash
   sudo service postgresql status
   ```

3. **Crear usuario y base de datos `otzo`:**
   Entra a la consola interactiva de Postgres como superusuario:
   ```bash
   sudo -u postgres psql
   ```
   Dentro del prompt de `psql` (`postgres=#`), ejecuta:
   ```sql
   ALTER USER postgres WITH PASSWORD 'postgres';
   CREATE DATABASE otzo;
   \q
   ```

4. **Cargar el esquema, migraciones y datos de prueba:**
   Desde la raíz del proyecto (`/home/tyreans/hacktec`):
   ```bash
   cd backend
   
   # 1. Crear el esquema base
   psql -U postgres -d otzo -h localhost -f db/migrations/001_schema_otzo.sql
   
   # 2. Aplicar migraciones del panel de IA
   psql -U postgres -d otzo -h localhost -f db/migrations/002_recomendaciones.sql
   psql -U postgres -d otzo -h localhost -f db/migrations/003_recomendaciones_tablas.sql
   
   # 3. Poblar datos de prueba (ventas, catálogo, inventario y competencia)
   npm run db:limpiar
   npm run db:cargar
   npm run db:competencia -- --demo
   
   cd ..
   ```

---

### Opción B: Base de Datos Tiger Cloud / Externa

Si utilizas una base de datos en la nube (Tiger Console):
1. Obtén tu **Service URL** de conexión (termina en `?sslmode=require`).
2. La usaremos en el archivo `backend/.env` con `DB_SSL=true`.

---

## ⚙️ Paso 2: Configurar y Ejecutar el Backend (Express.js)

1. **Entrar a la carpeta del backend e instalar dependencias:**
   ```bash
   cd /home/tyreans/hacktec/backend
   npm install
   ```

2. **Crear el archivo de configuración `.env`:**
   Copia la plantilla de ejemplo:
   ```bash
   cp .env.example .env
   ```
   Edita el archivo (`nano .env` o con tu editor):
   ```ini
   PORT=5000
   NODE_ENV=development
   CLIENT_ORIGIN=http://localhost:5173

   # Si usas Postgres local en WSL2:
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/otzo
   DB_SSL=false

   # Si usas Tiger Cloud:
   # DATABASE_URL=postgresql://tu_usuario:tu_clave@tu_host.tiger:5432/otzo?sslmode=require
   # DB_SSL=true

   # Llave de Google AI Studio para las respuestas de IA y el Chatbot:
   GEMINI_API_KEY=tu_api_key_aqui
   GEMINI_MODEL=gemini-2.0-flash
   ```

3. **⚠️ Verificación importante en `backend/src/routes/index.js`:**
   Si al arrancar el servidor obtienes el error `ReferenceError: limitar is not defined`, asegúrate de que las siguientes líneas estén importadas en la parte superior de `backend/src/routes/index.js`:
   ```javascript
   import * as Recs from "../controllers/recomendacion.controller.js";
   import * as Asistente from "../controllers/asistente.controller.js";
   import * as Competencia from "../controllers/competencia.controller.js";
   import { limitar, limitarSi, requiereClaveAdmin } from "../middlewares/rateLimit.middleware.js";
   ```

4. **Iniciar el servidor en modo desarrollo (con auto-reload):**
   ```bash
   npm run dev
   ```
   *Deberías ver:*
   ```
   [info] Servidor corriendo en http://localhost:5000
   [info] Documentación Swagger en http://localhost:5000/api/docs
   ```

5. **Comprobar que responde correctamente:**
   Abre otra terminal o pruébalo con `curl`:
   ```bash
   curl http://localhost:5000/api/health
   # Respuesta esperada: {"success":true,"data":{"status":"ok","db":"conectada"}}
   ```

---

## 💻 Paso 3: Configurar y Ejecutar el Frontend (React + Vite)

El frontend ya ha sido integrado en la carpeta `frontend/` listo para ejecutarse.

1. **Entrar a la carpeta del frontend:**
   ```bash
   cd /home/tyreans/hacktec/frontend
   ```

2. **Verificar dependencias instaladas:**
   ```bash
   npm install
   ```

3. **Verificar el archivo de entorno `frontend/.env`:**
   Asegúrate de que tenga la URL apuntando al backend Express:
   ```ini
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_APP_TITLE=Otzo Tienda Inteligente
   ```

4. **Iniciar el servidor de desarrollo de Vite:**
   > **Nota para WSL2:** Se recomienda agregar `-- --host` para permitir que el navegador de Windows se conecte sin problemas a la red virtual de WSL2.
   ```bash
   npm run dev -- --host
   ```
   *Deberías ver:*
   ```
   VITE v8.x.x  ready in 150 ms

   ➜  Local:   http://localhost:5173/
   ➜  Network: http://172.x.x.x:5173/
   ```

5. **Abrir en el navegador:**
   Abre tu navegador habitual en Windows y navega a:  
   👉 **http://localhost:5173**

---

## 🔍 Solución de Problemas Frecuentes en WSL2 con Debian

### 1. ¿No se puede conectar a PostgreSQL (`Connection refused`)?
- En WSL2 los servicios no siempre inician automáticamente con el arranque de Windows. Ejecuta:
  ```bash
  sudo service postgresql start
  ```
- Revisa el archivo `/etc/postgresql/*/main/postgresql.conf` para asegurar que `listen_addresses = 'localhost'` o `'*'`.

### 2. ¿El navegador de Windows no abre `http://localhost:5173`?
- WSL2 mapea los puertos automáticamente a Windows (`localhost`), pero si no responde:
  1. Corre Vite con: `npm run dev -- --host`
  2. Puedes usar la IP de WSL2 (obténla con `hostname -I | awk '{print $1}'`).
  3. Asegúrate de que el firewall de Windows no esté bloqueando Node.js.

### 3. ¿El Backend falla con `DATABASE_URL is missing`?
- Revisa que hayas creado el archivo `.env` en la raíz de `backend/` (no en la raíz del monorepo).
- Verifica que el archivo se llame exactamente `.env` (con punto al inicio).

### 4. ¿Error 429 en las sugerencias de IA o Chatbot?
- El rate limit está configurado en 10 peticiones por minuto. Espera 60 segundos si estuviste recargando intensivamente.
