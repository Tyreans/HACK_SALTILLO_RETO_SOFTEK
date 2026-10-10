# Despliegue en Vultr (Ubuntu)

El proyecto corre con `docker compose`: `web` (Caddy con el frontend y HTTPS
automático) y `api` (Express). Solo `web` publica los puertos 80 y 443. La base
de datos es PostgreSQL en Tiger Cloud. La generación diaria de recomendaciones
la lanza el cron del servidor dentro del contenedor `api`.

Todos los comandos se ejecutan como root o con `sudo`.

## 1. Instalar Docker y abrir puertos

```bash
curl -fsSL https://get.docker.com | sh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

El registro DNS (A) del dominio debe apuntar a la IP del servidor **antes** del
paso 5; si no, Caddy no podrá sacar el certificado.

## 2. Clonar el repo en /opt/otzo

```bash
git clone -b deploy https://github.com/Tyreans/HACK_SALTILLO_RETO_SOFTEK.git /opt/otzo
cd /opt/otzo
```

## 3. Crear los archivos .env

`.env` de la raíz (lo lee docker compose). Solo el dominio, sin `https://` ni `/` final:

```bash
cp .env.example .env
nano .env
```

```dotenv
DOMAIN=analizaloia.tyreans.dev
```

`backend/.env` (lo carga el contenedor `api`). Llena los valores vacíos en el
servidor; nunca los subas al repo:

```bash
nano backend/.env
chmod 600 .env backend/.env
```

```dotenv
PORT=5000
NODE_ENV=production
CLIENT_ORIGIN=https://analizaloia.tyreans.dev

# "Service URL" de Tiger Cloud, terminando en ?sslmode=require
DATABASE_URL=
DB_SSL=true

GEMINI_API_KEY=
GEMINI_MODEL=
BACKBOARD_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ADMIN_KEY=
```

`docker-compose.yml` fija `PORT=5000` en el contenedor (el puerto al que apunta el
`Caddyfile`), así que el `PORT` de `backend/.env` no afecta en Docker.

## 4. Migraciones en Tiger Cloud

**La base actual ya tiene las migraciones 001 a 006 (verificado el 2026-10-10): sáltate este paso.**

> ⚠️ `001_schema_otzo.sql` empieza con `DROP TABLE IF EXISTS ...`: correrla sobre una base
> con datos **borra todo**. Solo úsala con una base nueva y vacía.

Solo para una base nueva: correr en orden. No hace falta instalar `psql`; se usa la imagen de postgres.
Deja un espacio antes de `export` para que no quede en el historial:

```bash
 export DATABASE_URL='postgresql://...?sslmode=require'
for f in 001_schema_otzo.sql 002_recomendaciones.sql 003_recomendaciones_tablas.sql \
         004_promociones_aplicadas.sql 005_rivales.sql 006_backboard_purchase_orders.sql; do
  docker run --rm -i postgres:16-alpine \
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < "backend/db/migrations/$f" || break
done
unset DATABASE_URL
```

## 5. Levantar los contenedores

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api   # debe decir "Conectado a PostgreSQL"
```

Comprobar: `https://analizaloia.tyreans.dev/api/health`.

## 6. Probar la generación a mano

```bash
docker compose exec -T api npm run recomendaciones:generar
```

Debe imprimir un JSON con el resultado por tienda. Si hay errores, sale con código distinto de 0.

## 7. Instalar el cron

```bash
sudo crontab -e
```

Pega las dos líneas de `deploy/cron.example`, en ese orden:

- 11:30 UTC, `recomendaciones:reposicion`: exporta las órdenes de compra pendientes y regenera reposición y promoción.
- 12:00 UTC (6:00 am en Saltillo), `recomendaciones:generar`: completa lo que falte del día, sin `--regenerar`.

Comparten el mismo `flock`: si la primera sigue corriendo a las 12:00, la segunda se salta ese día.
Revisa el log después de la primera corrida:

```bash
tail /var/log/otzo-recomendaciones.log
```

## Actualizar

```bash
cd /opt/otzo
git pull
docker compose up -d --build
```
