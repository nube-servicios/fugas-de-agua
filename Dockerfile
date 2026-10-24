# ---------- 1) Compilacion ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- 2) Dependencias de produccion ----------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- 3) Imagen final ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY frontend ./frontend

# Las variables (BD, SMTP, AWS) llegan en tiempo de ejecucion; nada se hornea en la imagen.
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
