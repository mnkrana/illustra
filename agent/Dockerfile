FROM oven/bun:1.3.11
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN bun install

# Copy source
COPY src ./src
COPY tsconfig.json .

# Cloud Run expects PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["bun", "run", "src/main.ts"]