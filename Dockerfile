FROM node:20-slim AS builder

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG URL_PREFIX=""
ENV BASE_URL="${URL_PREFIX}/v2"

RUN corepack enable

COPY . /app

WORKDIR /app

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install -g nx

RUN BASE_URL="$BASE_URL" nx run bublik:build:docker --base="${BASE_URL}" --outDir="/dist/bublik-docker" --sourcemap="true"

FROM nginx:latest as production

ARG URL_PREFIX=""
ENV URL_PREFIX=${URL_PREFIX}
ARG NGINX_PORT="80"
ENV NGINX_PORT=${NGINX_PORT}
ENV API_URL="django:8000"
ENV FLOWER_URL="flower:5555"
ENV NGINX_PORT=${NGINX_PORT}
ENV DOLLAR="$"
ENV NGINX_ENVSUBST_OUTPUT_DIR="/etc/nginx/conf.d"

COPY --from=builder /dist/bublik-docker /etc/nginx/html
COPY ./templates/prod /etc/nginx/templates

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
