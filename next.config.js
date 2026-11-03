const nextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { "/api/**/*": ["./words.txt"] },
  async headers() {
    return [
      {
        source: "/puzzles.:hash.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default nextConfig;
