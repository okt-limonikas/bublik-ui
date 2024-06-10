FROM node:20-slim AS builder

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ENV BASE_URL="/v2"
ARG URL_PREFIX=""

RUN corepack enable

COPY . /app

WORKDIR /app

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install -g nx

RUN nx run bublik:build:docker --base="${URL_PREFIX}/v2" --outDir="/dist/bublik-docker" --sourcemap="true"

FROM nginxinc/nginx-unprivileged:latest as production

ARG URL_PREFIX=""
ENV URL_PREFIX=${URL_PREFIX}
ARG NGINX_PORT="80"
ENV NGINX_PORT=${NGINX_PORT}
ENV DOLLAR="$"

COPY --from=builder /dist/bublik-docker /etc/nginx/html
COPY ./templates/prod /etc/nginx/templates

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
