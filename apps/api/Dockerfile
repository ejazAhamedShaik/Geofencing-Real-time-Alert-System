FROM node:24-bookworm-slim AS build

WORKDIR /app

# Install only the API and shared-contract workspaces from the monorepo.
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --include-workspace-root --workspace=@geofence/api --workspace=@geofence/contracts

COPY apps/api ./apps/api
COPY packages/contracts ./packages/contracts

RUN npm run build --workspace=@geofence/contracts \
  && npm run build --workspace=@geofence/api \
  && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/migrations ./apps/api/migrations
COPY --from=build /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /app/packages/contracts/src ./packages/contracts/src

EXPOSE 3000
CMD ["sh", "-c", "node apps/api/dist/db/migrate.js up && exec node apps/api/dist/server.js"]
