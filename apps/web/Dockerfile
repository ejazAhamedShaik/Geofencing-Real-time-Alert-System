FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --include-workspace-root --workspace=@geofence/web --workspace=@geofence/contracts

COPY apps/web ./apps/web
COPY packages/contracts ./packages/contracts

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace=@geofence/contracts \
  && npm run build --workspace=@geofence/web

FROM nginx:stable-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
