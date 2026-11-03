import net from "node:net";
import { startRedisFixture } from "./redis.mjs";
export async function startApp(redis = startRedisFixture()) {
  const port = await new Promise((resolve) => {
    const listener = net.createServer();
    listener.listen(0, "127.0.0.1", () => {
      const port = listener.address().port;
      listener.close(() => resolve(port));
    });
  });
  const processHandle = Bun.spawn(
    ["node", "node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      env: {
        ...process.env,
        UPSTASH_REDIS_REST_URL: redis.url,
        UPSTASH_REDIS_REST_TOKEN: redis.token,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const base = `http://localhost:${port}`;
  for (let attempt = 0; attempt < 300; attempt++) {
    try {
      if ((await fetch(`${base}/api/session`)).ok)
        return {
          base,
          redis,
          stop() {
            processHandle.kill();
            redis.stop();
          },
        };
    } catch {}
    if (processHandle.exitCode !== null)
      throw Error(await new Response(processHandle.stderr).text());
    await Bun.sleep(100);
  }
  processHandle.kill();
  redis.stop();
  throw Error("Next.js did not start. Run bun run build first.");
}
