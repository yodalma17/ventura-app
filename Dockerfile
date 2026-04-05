FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build \
  && npm prune --omit=dev \
  && mkdir -p /data

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

EXPOSE 4000
VOLUME ["/data"]

CMD ["npm", "start"]
