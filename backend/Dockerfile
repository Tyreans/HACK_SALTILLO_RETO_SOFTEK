# API Otzo (Express). Se construye desde la raíz del repo:
#   docker build -f backend/Dockerfile .
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/src ./src
# scripts/ y db/ van en la imagen: el cron del servidor corre
# "docker compose exec -T api npm run recomendaciones:generar"
COPY backend/scripts ./scripts
COPY backend/db ./db

USER node
EXPOSE 5000
CMD ["npm", "start"]
