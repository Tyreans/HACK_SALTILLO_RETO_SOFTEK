# Levantar Otzo desde cero (Windows)

Guía para quien no tiene nada instalado. Al final tendrás la base `otzo` con todos los datos y la API en http://localhost:5000/api/docs.

Todos los comandos son de **PowerShell**. Donde dice `17`, pon tu versión de PostgreSQL.

---

## 0. Instalar (una sola vez)

| Programa | Dónde | Nota |
|---|---|---|
| Git | git-scm.com | |
| Node.js **22 LTS** | nodejs.org | Con versiones viejas (18.x) el chatbot no arranca |
| PostgreSQL 16 o 17 | postgresql.org → Download → Windows | Puerto **5432**. Anota la contraseña del usuario `postgres`. Deja marcado pgAdmin |

Después de instalar, **cierra y vuelve a abrir** VS Code o la terminal. Revisa:

```powershell
node -v        # v22.x
git --version
```

---

## 1. Clonar el repo

```powershell
cd $HOME\Documents
git clone https://github.com/Tyreans/HACK_SALTILLO_RETO_SOFTEK.git
cd HACK_SALTILLO_RETO_SOFTEK
```

Si vas a trabajar en tu rama: `git checkout -b TuNombre` (o `git checkout TuRama` si ya existe).

---

## 2. Crear la base de datos vacía

Guarda la ruta de `psql` en una variable (así no la escribes cada vez):

```powershell
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
& $psql -U postgres -c "CREATE DATABASE otzo;"
```

Te pide la contraseña de `postgres`. Debe responder `CREATE DATABASE`.
(Si dice que ya existe, no pasa nada.)

> También se puede desde pgAdmin: clic derecho en *Databases* → *Create* → *Database* → nombre `otzo`.

---

## 3. Configurar el backend

```powershell
cd backend
npm install
copy .env.example .env
```

Abre `backend\.env` y cambia **solo** esta línea con tu contraseña:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/otzo
```

- Si tu contraseña tiene `@ # / : %`, cámbiala por una solo con letras y números (esos símbolos rompen la URL).
- `GEMINI_API_KEY` y las de ElevenLabs son opcionales: sin ellas todo funciona menos el chat y la voz.
- El `.env` **nunca** se sube a GitHub (ya está en `.gitignore`).

---

## 4. Copiar los CSV del hackathon

Copia los 14 CSV (`sites.csv`, `sales_daily.csv`, …) a:

```
backend\db\datos\
```

Con sus nombres exactos (no `sites (1).csv`). Revisa con `dir db\datos`: deben salir 14 archivos.

> Los CSV no están en el repo porque el reglamento pide no redistribuirlos. Pídelos al equipo.

---

## 5. Limpiar y cargar los datos

Desde `backend`:

```powershell
npm run db:limpiar     # ~20 s: corrige el dataset → db\datos_limpios\
npm run db:cargar      # ~1 min: crea las tablas y carga 1.3 M filas
```

`db:cargar` debe terminar con algo como:

```
  migración 002_recomendaciones.sql aplicada
  migración 003_recomendaciones_tablas.sql aplicada
  migración 004_promociones_aplicadas.sql aplicada
  migración 005_rivales.sql aplicada
Listo. 589132 ventas cargadas, total $26,295,392 USD
```

El aviso `TimescaleDB no disponible: se usan tablas normales` es normal en Postgres local.

### ¿No salieron las líneas de "migración … aplicada"?

Tu `cargar.js` es una versión anterior que solo aplica la 001. Corre las demás a mano, **en orden**, desde la raíz del repo:

```powershell
cd ..
Get-ChildItem backend\db\migrations\0*.sql |
  Where-Object Name -ne "001_schema_otzo.sql" |
  Sort-Object Name |
  ForEach-Object { Write-Host "Aplicando $($_.Name)"; & $psql -U postgres -d otzo -v ON_ERROR_STOP=1 -f $_.FullName }
cd backend
```

O una por una:

```powershell
& $psql -U postgres -d otzo -f db\migrations\002_recomendaciones.sql
& $psql -U postgres -d otzo -f db\migrations\003_recomendaciones_tablas.sql
& $psql -U postgres -d otzo -f db\migrations\004_promociones_aplicadas.sql
& $psql -U postgres -d otzo -f db\migrations\005_rivales.sql
```

Las migraciones 002 en adelante se pueden correr varias veces sin romper nada.
**La 001 no la corras a mano**: borra y recrea todas las tablas (la usa `db:cargar`).

> En pgAdmin también funciona: *Query Tool* sobre `otzo`, pegar el archivo y **F5**.
> No uses la extensión "SQL Server (mssql)" de VS Code: es para otro motor y marca errores falsos.

---

## 6. Datos de competencia (opcionales, para la demo)

```powershell
npm run db:rivales                 # base de tiendas rivales (ficticias) en los mismos sitios
npm run db:competencia -- --demo   # precios generales de competencia (ficticios)
```

Sin esto la API funciona, pero las sugerencias de precio no tendrán contra qué comparar.

---

## 7. Arrancar

```powershell
npm start          # o npm run dev para que se reinicie al guardar
```

Debe decir:

```
Conectado a PostgreSQL
API Otzo lista en http://localhost:5000/api
```

Prueba en el navegador:

- http://localhost:5000/api/docs — Swagger con todos los endpoints
- http://localhost:5000/api/health
- http://localhost:5000/api/dashboard/S001

---

## Atajo: copiar la base de un compañero

Si alguien ya la tiene cargada, puede exportarla y tú solo la restauras (sin CSV ni scripts):

```powershell
# Quien la tiene:
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U postgres -Fc -f otzo.dump otzo

# Tú (después del paso 2):
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -U postgres -d otzo --clean --if-exists otzo.dump
```

El archivo `otzo.dump` se pasa por privado (trae datos del hackathon). Luego sigue en el paso 3 (sin el 4 ni el 5).

---

## Al traer cambios del equipo

```powershell
git pull origin main
cd backend
npm install                       # por si alguien agregó librerías
```

Si llegó una migración nueva (`backend\db\migrations\00X_*.sql`), córrela con `& $psql -U postgres -d otzo -f ...` o recarga todo con `npm run db:cargar`.

---

## Errores comunes

| Mensaje | Qué hacer |
|---|---|
| `password authentication failed for user "postgres"` | La contraseña del `DATABASE_URL` en `.env` no es la de tu Postgres |
| `database "otzo" does not exist` | Falta el paso 2 |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres no está corriendo: Win+R → `services.msc` → `postgresql-x64-17` → Iniciar |
| `Cannot find package '...'` / `ERR_MODULE_NOT_FOUND` | `npm install` dentro de `backend` |
| `node: bad option: --watch` | Node viejo: instala Node 22 o usa `npm start` |
| `ENOENT ... package.json` | No estás en `backend`: `cd backend` |
| `ENOENT ... datos\sites.csv` | Faltan los CSV en `backend\db\datos\` (paso 4) |
| `relation "recomendaciones" does not exist` / `rivales.precios` | Faltan migraciones: paso 5, sección "¿No salieron…?" |
| `psql : El término 'psql' no se reconoce` | Usa la variable `$psql` del paso 2 (con la ruta completa) |
| `EADDRINUSE :::5000` | Ya tienes la API abierta en otra terminal: ciérrala o `Ctrl+C` |
