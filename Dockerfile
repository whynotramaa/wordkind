FROM oven/bun:1.3.14-alpine
WORKDIR /app
COPY --chown=bun:bun . .
USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
