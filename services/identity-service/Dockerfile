# Identity & Access service — NestJS on Node 20
FROM node:20-alpine

WORKDIR /app

# Install deps first (layer cache)
COPY package*.json ./
RUN npm install

# App source
COPY . .

# Dev mode: nest watch (src is bind-mounted in docker-compose for hot reload)
CMD ["npm", "run", "start:dev"]
