# ==========================================
# SafeCodeShare - Production Dockerfile (Multi-stage)
# ==========================================

# 1. Aşama: Derleme (Builder)
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# better-sqlite3 gibi yerel eklentileri derlemek için gerekli araçlar
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

# Monorepo paket tanımları
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Tüm bağımlılıkları yükle
RUN npm ci

# Kaynak kodları kopyala
COPY tsconfig.base.json ./
COPY shared ./shared
COPY client ./client
COPY server ./server

# İstemciyi derle (çıktı server/public klasörüne gider)
# VITE_ değişkenleri derleme anında koda gömülür; docker-compose build.args ile gelir.
ARG VITE_ADSENSE_CLIENT_ID=""
ENV VITE_ADSENSE_CLIENT_ID=$VITE_ADSENSE_CLIENT_ID
RUN npm --workspace client run build

# Geliştirme bağımlılıklarını temizle (tsx ve runtime paketleri kalır)
RUN npm prune --omit=dev

# ==========================================
# 2. Aşama: Çalışma Zamanı (Runtime)
# ==========================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data

# Veri dizinini oluştur ve node kullanıcısına yetkilendir
RUN mkdir -p /data && chown -R node:node /data

# Derlenmiş uygulamayı ve modülleri kopyala
COPY --chown=node:node --from=builder /app /app

VOLUME ["/data"]
EXPOSE 3000

# Root olmayan güvenli kullanıcı
USER node

# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "--workspace", "server", "run", "start"]
