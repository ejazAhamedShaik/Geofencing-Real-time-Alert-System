FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --include-workspace-root --workspace=@geofence/web --workspace=@geofence/contracts

# The lockfile was generated on Windows and omits Linux optional binaries for
# Rollup and esbuild. Fetch the matching versions directly without changing it.
RUN rollup_version="$(node -p "require('./node_modules/rollup/package.json').version")" \
  && esbuild_version="$(node -p "require('./node_modules/esbuild/package.json').version")" \
  && case "$(uname -m)" in \
    x86_64) rollup_package="@rollup/rollup-linux-x64-gnu"; esbuild_package="@esbuild/linux-x64" ;; \
    aarch64|arm64) rollup_package="@rollup/rollup-linux-arm64-gnu"; esbuild_package="@esbuild/linux-arm64" ;; \
    *) echo "Unsupported build architecture: $(uname -m)" >&2; exit 1 ;; \
  esac \
  && mkdir -p "/tmp/platform-packages" "node_modules/${rollup_package}" "node_modules/${esbuild_package}" \
  && rollup_archive="$(npm pack --silent --pack-destination /tmp/platform-packages "${rollup_package}@${rollup_version}")" \
  && esbuild_archive="$(npm pack --silent --pack-destination /tmp/platform-packages "${esbuild_package}@${esbuild_version}")" \
  && tar -xzf "/tmp/platform-packages/${rollup_archive}" -C "node_modules/${rollup_package}" --strip-components=1 \
  && tar -xzf "/tmp/platform-packages/${esbuild_archive}" -C "node_modules/${esbuild_package}" --strip-components=1 \
  && rm -rf /tmp/platform-packages

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
