FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ pkg-config libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
ENV npm_config_build_from_source=true
RUN npm install --build-from-source=sqlite3

COPY . .

RUN npm run build \
  && npm prune --omit=dev \
  && mkdir -p /data

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

EXPOSE 4000

CMD ["npm", "start"]
