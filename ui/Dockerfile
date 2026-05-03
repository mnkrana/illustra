FROM oven/bun:1.3.11
WORKDIR /app/

# Just copy everything
COPY . .

# Install dependencies
RUN bun install

# Cloud Run expects PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["bun", "src/index.ts"]